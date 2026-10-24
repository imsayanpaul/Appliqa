const express = require("express");
const router = express.Router();
const { supabase } = require('../lib/supabase');
const crypto = require('crypto');
const { optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { sendServerError } = require('../lib/errors');

// Every route here spends Gemini quota, so all of them are rate limited.
// Signed-in users get a higher ceiling than anonymous visitors.
router.use(optionalAuth, rateLimit({ name: 'ai', windowMs: 60 * 1000, maxAuthed: 30, maxAnon: 8 }));

// Attribute Gemini token usage to the signed-in user and this feature (see lib/usage.js)
router.use(require('../lib/usage').trackUsage);

// Retries busy errors and falls back to a second model (see lib/gemini.js)
const { getModel } = require('../lib/gemini');
// Honesty rules, posting clean-up and second-model review for anything written for a candidate
const { HONESTY_RULES, todayLine, candidateFacts, sanitizePosting, reviewAndRevise, parseJson } = require('../lib/writing');
const { checkJob, cleanDealBreakers } = require('../lib/dealBreakers');

const getCacheKey = (resumeText, jobDescription, queryType) => {
  const input = `${resumeText || ''}_${jobDescription || ''}_${queryType}`;
  return crypto.createHash('md5').update(input).digest('hex');
};

const safeParseJSON = (text, fallback) => {
  if (!text) return fallback;
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    // Proceed to repair
  }

  try {
    let cleaned = text.trim();
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) {
      return fallback;
    }
    cleaned = cleaned.substring(firstBrace);

    let stack = [];
    let inString = false;
    let escaped = false;
    let repaired = "";

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (inString) {
        if (escaped) {
          escaped = false;
          repaired += char;
        } else if (char === '\\') {
          escaped = true;
          repaired += char;
        } else if (char === '"') {
          inString = false;
          repaired += char;
        } else {
          if (char === '\n') {
            repaired += '\\n';
          } else if (char === '\r') {
            repaired += '\\r';
          } else if (char === '\t') {
            repaired += '\\t';
          } else {
            repaired += char;
          }
        }
      } else {
        if (char === '"') {
          inString = true;
          repaired += char;
        } else if (char === '{') {
          stack.push('}');
          repaired += char;
        } else if (char === '[') {
          stack.push(']');
          repaired += char;
        } else if (char === '}') {
          if (stack.length > 0 && stack[stack.length - 1] === '}') {
            stack.pop();
          }
          repaired += char;
        } else if (char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === ']') {
            stack.pop();
          }
          repaired += char;
        } else {
          repaired += char;
        }
      }
    }

    if (inString) {
      repaired += '"';
    }

    let endCleaned = false;
    while (!endCleaned && repaired.length > 0) {
      repaired = repaired.trim();
      const lastChar = repaired[repaired.length - 1];
      if (lastChar === ',' || lastChar === ':' || lastChar === '[' || lastChar === '{') {
        if (lastChar === ',' || lastChar === ':') {
          repaired = repaired.slice(0, -1);
        } else {
          if (stack.length > 0) {
            const expected = stack[stack.length - 1];
            if ((lastChar === '[' && expected === ']') || (lastChar === '{' && expected === '}')) {
              stack.pop();
            }
          }
          repaired = repaired.slice(0, -1);
        }
      } else {
        endCleaned = true;
      }
    }

    while (stack.length > 0) {
      repaired += stack.pop();
    }

    return JSON.parse(repaired);
  } catch (err) {
    console.error("JSON repair failed:", err.message);
    return fallback;
  }
};

// Model output that should be text but sometimes arrives as a list or object
const asText = (v) => (Array.isArray(v)
  ? v.map(asText).join('\n')
  : v && typeof v === 'object'
    ? Object.entries(v).map(([k, x]) => `${k}: ${asText(x)}`).join('\n')
    : String(v || ''));
const clipText = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Experience/education arrive as text lines or as entries; prompts need lines
const asLines = (list) => (Array.isArray(list) ? list : []).map((x) => {
  if (typeof x === 'string') return x;
  if (!x || typeof x !== 'object') return '';
  const head = [x.role || x.degree || x.title, x.company || x.school].filter(Boolean).join(x.company ? ' at ' : ' from ');
  return `${head}${x.dates ? ` (${x.dates})` : ''}`;
}).filter(Boolean);

// The advisor appends "SKILLS_TO_ADD: a, b" when it recommends skills; split it out
const extractSkillsLine = (raw) => {
  const text = String(raw || "");
  const match = text.match(/\n?\s*\**SKILLS_TO_ADD\**\s*:\s*(.+?)\s*$/i);
  if (!match) return { text: text.trim(), skills: [] };
  const skills = [...new Set(match[1].split(",").map((x) => x.replace(/[*_`.]+/g, "").trim()).filter((x) => x && x.length <= 60))].slice(0, 8);
  return { text: text.slice(0, match.index).trim(), skills };
};

// Analyze resume text with AI
router.post("/analyze-resume", async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText)
      return res.status(400).json({ error: "resumeText is required" });

    const model = getModel();

    const prompt = `Analyze this resume and extract structured information.

CRITICAL EXTRACTION RULES:
1. Suggested Roles: Suggest appropriate job roles matching the candidate's background dynamically (suggest as few or as many as are relevant based on the resume, typically between 3 and 6).
2. Education: Extract ALL listed educational history, including degrees, diplomas, and secondary school (10th/12th grade) credentials if present on the resume. Do not omit any institutions.
3. Experience: Extract ALL listed work experience, internships, and roles. Do not truncate.
4. Skills & Expertise: Extract ALL technical skills, software tools, frameworks, functional methodologies, and domain expertise into the "skills" array (e.g. Kinaxis Maestro, SQL, JavaScript, Supply Planning, S&OP, System Integration, etc.). Keep the "expertise" array focused on broader professional domains or industry areas.
5. Certifications & Languages: Extract any professional certifications and languages mentioned on the resume.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": ["Job Title at Company (Duration)", ...],
  "education": ["Degree from Institution", ...],
  "suggestedRoles": ["role1", "role2", ...],
  "experienceLevel": "entry|mid|senior|lead",
  "industries": ["industry1", "industry2"],
  "expertise": ["expertise1", "expertise2", ...],
  "certifications": ["certification1", "certification2", ...],
  "languages": ["language1", "language2", ...]
}

Resume text:
${resumeText}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192
      }
    });
    const responseText = result.response.text();

    const parsed = safeParseJSON(responseText, {});
    
    // Combine skills and expertise to ensure functional & domain skills are not hidden from the user on the frontend
    let combinedSkills = parsed.skills || [];
    if (parsed.expertise && Array.isArray(parsed.expertise)) {
      const uniqueExpertise = parsed.expertise.filter(exp => exp && !combinedSkills.includes(exp));
      combinedSkills = [...combinedSkills, ...uniqueExpertise];
    }

    const analysis = {
      summary: parsed.summary || responseText,
      skills: combinedSkills,
      experience: parsed.experience || [],
      education: parsed.education || [],
      suggestedRoles: parsed.suggestedRoles || [],
      experienceLevel: parsed.experienceLevel || "mid",
      industries: parsed.industries || [],
      expertise: parsed.expertise || [],
      certifications: parsed.certifications || [],
      languages: parsed.languages || []
    };

    res.json({ success: true, analysis });
  } catch (error) {
    sendServerError(res, error, "AI analysis failed");
  }
});

// Smart search — natural language to job search query
router.post("/smart-search", async (req, res) => {
  try {
    const { naturalQuery, resumeData } = req.body;
    if (!naturalQuery)
      return res.status(400).json({ error: "naturalQuery is required" });

    const model = getModel();

    let contextPrompt = "";
    if (resumeData) {
      contextPrompt = `\nUser's resume skills: ${resumeData.skills?.join(", ") || "Not provided"}
User's experience level: ${resumeData.experienceLevel || "Not specified"}
User's suggested roles: ${resumeData.suggestedRoles?.join(", ") || "Not specified"}`;
    }

    const prompt = `Convert this natural language job search request into optimized search parameters. Return ONLY valid JSON (no markdown, no code blocks):
{
  "query": "optimized job search query string",
  "location": "location if mentioned or empty string",
  "remote": true/false,
  "employmentType": "FULLTIME|PARTTIME|CONTRACTOR|INTERN or empty string",
  "experienceLevel": "entry|mid|senior or empty string"
}

User request: "${naturalQuery}"${contextPrompt}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 1024
      }
    });
    const responseText = result.response.text();

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      parsed = {
        query: naturalQuery,
        location: "",
        remote: false,
        employmentType: "",
        experienceLevel: "",
      };
    }

    res.json({ success: true, searchParams: parsed });
  } catch (error) {
    sendServerError(res, error, "AI search failed");
  }
});

// Match score — compare resume/preferences to a job
router.post("/match-score", async (req, res) => {
  try {
    const { resumeData, preferences, jobDescription, jobTitle } = req.body;
    const facts = candidateFacts(resumeData, preferences);
    const posting = sanitizePosting(jobDescription, 3500);
    const dealBreakers = cleanDealBreakers(preferences?.dealBreakers);
    const flags = checkJob({ title: jobTitle, description: posting.text }, { dealBreakers, languages: resumeData?.languages });

    const QUERY = 'match-score-v2';
    const cacheKey = getCacheKey(`${facts}_${dealBreakers.join(',')}`, `${jobTitle}_${posting.text}`, QUERY);
    try {
      const { data: cachedMatch } = await supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .eq('query_type', QUERY)
        .maybeSingle();
      if (cachedMatch?.response_data) return res.json({ success: true, match: cachedMatch.response_data, fromCache: true });
    } catch (dbReadErr) {
      console.error('Failed to read match-score from Supabase cache:', dbReadErr);
    }

    const prompt = `You are a careful recruiter judging how well this job fits this candidate. Be honest: a weak fit should score low.

Score four areas from 0 to 100:
- skills: required/preferred skills vs the candidate's real skills
- experience: the kind and level of work asked for vs what the candidate has done (match the work, not just titles; a fresher's projects and internships count)
- level: seniority and years asked for vs the candidate's level
- goals: how well the role fits the candidate's target role and direction
Then an overall "score" (0-100) weighted mostly on skills and experience.
${todayLine()}

${HONESTY_RULES}

CANDIDATE FACTS:
${facts}

JOB: ${jobTitle}
JOB POSTING:
${posting.text || 'Not provided.'}

Return ONLY valid JSON:
{
  "score": 0,
  "dimensions": { "skills": 0, "experience": 0, "level": 0, "goals": 0 },
  "reasons": ["up to 3 specific strengths for this job"],
  "missingSkills": ["skills the job needs that the candidate hasn't shown"],
  "gaps": ["up to 2 honest gaps or risks"],
  "recommendation": "one sentence: apply, apply with a tweak, or skip, and why"
}`;

    const result = await getModel().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1200, temperature: 0.2 }
    });
    const parsed = parseJson(result.response.text());
    if (!parsed || typeof parsed.score !== 'number') {
      return res.status(502).json({ error: "Couldn't score this job right now. Please try again." });
    }
    const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const match = {
      score: clamp(parsed.score),
      dimensions: Object.fromEntries(Object.entries(parsed.dimensions || {}).map(([k, v]) => [k, clamp(v)])),
      reasons: (parsed.reasons || []).slice(0, 3),
      missingSkills: (parsed.missingSkills || []).slice(0, 8),
      gaps: (parsed.gaps || []).slice(0, 2),
      recommendation: parsed.recommendation || '',
      flags,
    };

    try {
      await supabase.from('ai_cache').upsert({ cache_key: cacheKey, query_type: QUERY, response_data: match, created_at: new Date().toISOString() });
    } catch (dbWriteErr) {
      console.error('Failed to write match-score to Supabase cache:', dbWriteErr);
    }
    res.json({ success: true, match });
  } catch (error) {
    sendServerError(res, error, "AI matching failed");
  }
});

// Generate cover letter
router.post("/cover-letter", async (req, res) => {
  try {
    const { resumeData, preferences, jobTitle, jobCompany, jobDescription } =
      req.body;
    if (!jobTitle)
      return res.status(400).json({ error: "jobTitle is required" });

    const facts = candidateFacts(resumeData, preferences);
    const posting = sanitizePosting(jobDescription, 3500);
    // v2: honesty rules + reviewed drafts; older unreviewed letters aren't reused
    const QUERY = 'cover-letter-v4';
    const cacheKey = getCacheKey(facts, `${jobTitle}_${jobCompany || ''}_${posting.text}`, QUERY);

    try {
      const { data: cachedCL } = await supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .eq('query_type', QUERY)
        .maybeSingle();
      if (cachedCL?.response_data?.text) {
        return res.json({ success: true, coverLetter: cachedCL.response_data.text, review: cachedCL.response_data.review || null, fromCache: true });
      }
    } catch (dbReadErr) {
      console.error('Failed to read cover-letter from Supabase cache:', dbReadErr);
    }

    const prompt = `Write a cover letter for this job application.
- Confident, warm and specific; not generic. No clichés like "I am writing to express my interest".
- Open with why this role at this company, then connect 2-3 of the posting's key requirements to the candidate's most relevant REAL experience or projects, then close with a short call to action.
- 3-4 short paragraphs, under 350 words. Sign off with the candidate's name.
- No placeholder brackets like [Your Name] or [Company]. Return ONLY the letter text.

${HONESTY_RULES}
${todayLine()}

CANDIDATE FACTS:
${facts}

JOB: ${jobTitle} at ${jobCompany || 'the company'}
JOB POSTING:
${posting.text || 'Not provided.'}`;

    const result = await getModel().generateContent(prompt);
    const draft = result.response.text().trim();
    const { text: coverLetter, review } = await reviewAndRevise({
      kind: 'cover letter', draft, facts, posting: `${jobTitle} at ${jobCompany || 'the company'}\n${posting.text}`, maxTokens: 1500,
    });

    try {
      await supabase.from('ai_cache').upsert({
        cache_key: cacheKey,
        query_type: QUERY,
        response_data: { text: coverLetter, review },
        created_at: new Date().toISOString()
      });
    } catch (dbWriteErr) {
      console.error('Failed to write cover-letter to Supabase cache:', dbWriteErr);
    }

    res.json({ success: true, coverLetter, review, postingWarnings: posting.removed.length ? posting.removed : undefined });
  } catch (error) {
    sendServerError(res, error, "AI cover letter generation failed");
  }
});

// Career Path Visualizer
router.post("/career-path", async (req, res) => {
  try {
    const { resumeData, preferences } = req.body;

    const model = getModel();

    const currentRole =
      preferences?.desiredRole ||
      resumeData?.suggestedRoles?.[0] ||
      "Software Developer";
    const skills =
      resumeData?.skills?.join(", ") ||
      preferences?.skills?.join(", ") ||
      "General programming";
    const level =
      resumeData?.experienceLevel || preferences?.experienceLevel || "mid";

    const prompt = `Based on this professional profile, generate a detailed career progression roadmap. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:

{
  "currentRole": "their current/target role",
  "currentLevel": "entry|mid|senior|lead",
  "paths": [
    {
      "title": "Next role title (e.g. Senior Frontend Developer)",
      "level": "senior",
      "timeline": "1-2 years",
      "salary_range": "₹12L - ₹16L",
      "description": "One sentence description of this role",
      "skills_needed": ["skill1", "skill2", "skill3"],
      "skills_have": ["skill they already have for this role"],
      "match_percent": 65
    },
    {
      "title": "Alternative path role (e.g. Engineering Manager)",
      "level": "lead",
      "timeline": "3-5 years",
      "salary_range": "₹15L - ₹20L",
      "description": "One sentence description",
      "skills_needed": ["skill1", "skill2"],
      "skills_have": ["skill they already have"],
      "match_percent": 40
    }
  ],
  "advice": "One paragraph of personalized career advice"
}

Generate exactly 4 paths: 2 near-term (1-2 years) and 2 long-term (3-5 years). Mix technical and leadership paths.

Current Role: ${currentRole}
Experience Level: ${level}
Current Skills: ${skills}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048
      }
    });
    const responseText = result.response.text();

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      parsed = {
        currentRole,
        currentLevel: level,
        paths: [],
        advice: "Unable to generate career path. Please try again.",
      };
    }

    res.json({ success: true, careerPath: parsed });
  } catch (error) {
    sendServerError(res, error, "AI career path generation failed");
  }
});

// Generate Recruiter DM — short LinkedIn networking message
router.post("/recruiter-dm", async (req, res) => {
  try {
    const { resumeData, preferences, jobTitle, jobCompany, matchReasons } =
      req.body;
    if (!jobTitle)
      return res.status(400).json({ error: "jobTitle is required" });

    const facts = candidateFacts(resumeData, preferences);
    const QUERY = 'recruiter-dm-v4';
    const cacheKey = getCacheKey(facts, `${jobTitle}_${jobCompany || ''}_${(matchReasons || []).join(',')}`, QUERY);

    try {
      const { data: cachedDM } = await supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .eq('query_type', QUERY)
        .maybeSingle();
      if (cachedDM?.response_data?.text) {
        return res.json({ success: true, recruiterDM: cachedDM.response_data.text, fromCache: true });
      }
    } catch (dbReadErr) {
      console.error('Failed to read recruiter-dm from Supabase cache:', dbReadErr);
    }

    const topMatchReason = matchReasons?.[0] ? clipText(matchReasons[0], 300) : '';
    const prompt = `Write a short LinkedIn message to a recruiter or hiring manager about this job.
- EXACTLY 3 sentences, under 55 words. Casual-professional, like a confident peer.
- Sentence 1: a specific hook about the company or role. Sentence 2: the candidate's strongest REAL fit point${topMatchReason ? ` (for example: "${topMatchReason}")` : ''}. Sentence 3: a light ask for a quick chat.
- No subject line, no greeting, no sign-off, no placeholder brackets.

${HONESTY_RULES}

CANDIDATE FACTS:
${facts}

JOB: ${jobTitle} at ${jobCompany || 'the company'}`;

    const result = await getModel().generateContent(prompt);
    const draft = result.response.text().trim();
    const { text: dmText } = await reviewAndRevise({ kind: 'recruiter message', draft, facts, posting: `${jobTitle} at ${jobCompany || 'the company'}`, maxTokens: 300 });

    try {
      await supabase.from('ai_cache').upsert({
        cache_key: cacheKey,
        query_type: QUERY,
        response_data: { text: dmText },
        created_at: new Date().toISOString()
      });
    } catch (dbWriteErr) {
      console.error('Failed to write recruiter-dm to Supabase cache:', dbWriteErr);
    }

    res.json({ success: true, recruiterDM: dmText });
  } catch (error) {
    sendServerError(res, error, "AI recruiter DM generation failed");
  }
});

// Interview Prep Generator — custom questions + talking points
router.post("/interview-prep", async (req, res) => {
  try {
    const { resumeData, preferences, jobTitle, jobCompany, jobDescription } =
      req.body;
    if (!jobTitle)
      return res.status(400).json({ error: "jobTitle is required" });

    const model = getModel();
    const facts = candidateFacts(resumeData, preferences);
    const posting = sanitizePosting(jobDescription, 3500);
    const sent = clipText(req.body.sentCoverLetter, 2500);

    const prompt = `You are an expert interview coach. Generate an interview preparation guide for this candidate and job. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:

{
  "questions": [
    {
      "question": "The likely interview question",
      "type": "behavioral|technical|situational",
      "talkingPoints": ["Key point 1 to mention", "Key point 2", "Key point 3"],
      "sampleAnswer": "A brief 2-sentence sample answer framework"
    }
  ],
  "technicalTopics": [
    {
      "topic": "Topic name (e.g. React Hooks)",
      "importance": "high|medium",
      "reviewTips": "What specifically to review or practice"
    }
  ],
  "companyInsights": [
    "Talking point about the company to mention in conversation"
  ],
  "tips": [
    "Specific actionable tip for this interview"
  ]
}

Generate exactly 5 questions (mix of behavioral, technical, and situational), 3-4 technical topics, 2-3 company insights, and 3 tips. Make everything specific to this exact role and company — no generic advice.
- Talking points and sample answers must use the candidate's REAL experience and projects (STAR: situation, task, action, result). Where the candidate lacks something the job asks for, give an honest bridge answer (a related real experience plus how they'd learn it), never an invented one.
- Company insights: only general points you are confident about, phrased as things to check on the company's site; never invent figures, products or news.
${sent ? '- The candidate sent the cover letter below. Expect questions about what it claims.' : ''}

${HONESTY_RULES}

CANDIDATE FACTS:
${facts}
${sent ? `
COVER LETTER THEY SENT:
${sent}
` : ''}
JOB: ${jobTitle} at ${jobCompany || "the company"}
JOB POSTING:
${posting.text || 'Not provided.'}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 3000
      }
    });
    const responseText = result.response.text();

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      return res.status(502).json({ error: "Couldn't build your prep right now. Please try again." });
    }

    res.json({ success: true, interviewPrep: parsed });
  } catch (error) {
    sendServerError(res, error, "AI interview prep generation failed");
  }
});

// ATS Scorer — analyze resume raw text against job description
router.post("/ats-score", async (req, res) => {
  try {
    const { resumeText, jobTitle, jobDescription } = req.body;
    
    if (!resumeText) {
      console.warn("ATS Scorer 400: resumeText is missing");
      return res.status(400).json({ error: "resumeText is required" });
    }

    const safeJobDesc = jobDescription || "No job description provided.";
    const cacheKey = getCacheKey(resumeText, safeJobDesc, 'ats-score');

    // 1. Check AI Cache Table
    try {
      const { data: cachedATS, error: cacheErr } = await supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .eq('query_type', 'ats-score')
        .maybeSingle();

      if (cachedATS && cachedATS.response_data) {
        return res.json({ success: true, atsResult: cachedATS.response_data, fromCache: true });
      }
    } catch (dbReadErr) {
      console.error('Failed to read ats-score from Supabase cache:', dbReadErr);
    }

    // 2. Cache Miss: Query Gemini
    const model = getModel();

    const prompt = `You are an enterprise Applicant Tracking System (ATS) screening algorithm. Analyze the exact text of the candidate's resume against the Job Description.

Analyze based on standard ATS parsing rules:
1. Keyword Match: Are high-priority hard skills, tools, and domain concepts from the JD present in the resume? (Exact or very close synonyms).
2. Action Verbs: Do the experience bullet points start with strong action verbs?
3. Measurable Impact: Does the resume use numbers, percentages, and metrics to quantify achievements?
4. Formatting: Since this is raw extracted text, evaluate if standard sections (Experience, Education, Skills) are clearly demarcated.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "atsScore": 65,
  "verdict": "A brief 2-sentence summary of the resume's ATS performance.",
  "keywords": {
    "found": ["React", "Agile", "REST API"],
    "missing": ["Docker", "Kubernetes", "GraphQL"]
  },
  "metrics": {
    "score": 80,
    "feedback": "Good use of metrics in the most recent role, but older roles lack quantification."
  },
  "actionVerbs": {
    "score": 75,
    "feedback": "Most bullets start with action verbs, but avoid weak ones like 'Helped' or 'Responsible for'."
  },
  "improvements": [
    {
      "priority": "high",
      "issue": "Missing critical cloud skills",
      "fix": "Add Docker and Kubernetes explicitly to your Skills section if you have experience with them."
    }
  ]
}

Job Title: ${jobTitle || "Not specified"}
Job Description: 
${safeJobDesc.substring(0, 3000)}

Candidate's Raw Resume Text:
${resumeText.substring(0, 5000)}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048
      }
    });
    const responseText = result.response.text();

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      console.error("Failed to parse ATS response JSON:", responseText);
      parsed = {
        atsScore: 0,
        verdict: "Failed to analyze resume. Please try again.",
        keywords: { found: [], missing: [] },
        metrics: { score: 0, feedback: "N/A" },
        actionVerbs: { score: 0, feedback: "N/A" },
        improvements: []
      };
    }

    // 3. Write response to AI Cache Table
    try {
      await supabase.from('ai_cache').upsert({
        cache_key: cacheKey,
        query_type: 'ats-score',
        response_data: parsed,
        created_at: new Date().toISOString()
      });
    } catch (dbWriteErr) {
      console.error('Failed to write ats-score to Supabase cache:', dbWriteErr);
    }

    res.json({ success: true, atsResult: parsed });
  } catch (error) {
    sendServerError(res, error, "ATS analysis failed");
  }
});

// AI Career Advisor Q&A endpoint
router.post("/career-advisor", async (req, res) => {
  try {
    const { message, chatHistory, resumeData } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    // Build system instructions with candidate resume context for personalized coaching
    let resumeContext = "";
    if (resumeData) {
      resumeContext = `
Here is the candidate's resume context:
- Professional Summary: ${resumeData.summary || "N/A"}
- Experience Level: ${resumeData.experienceLevel || "N/A"}
- Key Skills: ${resumeData.skills?.join(", ") || "N/A"}
- Suggested/Target Roles: ${resumeData.suggestedRoles?.join(", ") || "N/A"}
- Work History: ${asLines(resumeData.experience).join("; ") || "N/A"}
- Education: ${asLines(resumeData.education).join("; ") || "N/A"}
`;
    } else {
      resumeContext = `
No resume has been uploaded yet. Provide helpful general career advice, and gently suggest they add their resume on their Profile page for personalized insights.
`;
    }

    const systemInstruction = `You are the "Appliqa AI Career Advisor", an elite recruiter, career coach, and resume specialist.
Your purpose is to provide clear, actionable, and personalized career advice, interview strategy tips, and resume critiques.

${resumeContext}

Style Guide:
- Be encouraging, highly professional, and direct.
- Organize your answers with bullet points, bold text, and clean formatting.
- Keep responses concise and focused on actionable steps.
- Use markdown for readability.
- If asked, mention you are integrated directly with Appliqa's job tracking and ATS checker features.

Skill suggestions:
- When you recommend specific skills, tools or technologies the candidate should add or learn, end your reply with ONE final line in exactly this format:
SKILLS_TO_ADD: Skill One, Skill Two, Skill Three
- Use short, resume-ready names (e.g. "Docker", "System Design"), at most 8, and only skills they don't already list. Omit the line if you are not recommending skills.
`;

    const model = getModel({ systemInstruction });

    // Map chatHistory (roles: 'user', 'assistant') to Gemini format ('user', 'model')
    let formattedHistory = (chatHistory || []).map((msg) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    // Gemini requires the first message in history to be from 'user'.
    // Strip any leading model/assistant messages.
    while (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.shift();
    }

    // Ensure strict alternating roles (user, model, user, model...)
    const cleanHistory = [];
    let expectedRole = "user";
    for (const msg of formattedHistory) {
      if (msg.role === expectedRole) {
        cleanHistory.push(msg);
        expectedRole = expectedRole === "user" ? "model" : "user";
      }
    }

    const chat = model.startChat({
      history: cleanHistory,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(message);
    const { text: responseText, skills: suggestedSkills } = extractSkillsLine(result.response.text());

    res.json({ success: true, response: responseText, suggestedSkills });
  } catch (error) {
    sendServerError(res, error, "AI Career Advisor failed");
  }
});

// Enhance a single resume bullet point or experience description
router.post("/enhance-bullet", async (req, res) => {
  try {
    const { bulletText, roleContext, actionVerb, type } = req.body;
    if (!bulletText) {
      return res.status(400).json({ error: "bulletText is required" });
    }

    const model = getModel();
    const isSummary = type === 'summary';
    let prompt;

    if (isSummary) {
      prompt = `You are an expert resume writer and technical recruiter. Enhance the following resume professional summary narrative paragraph.
      
      Make it highly professional, compelling, and impact-driven. Create a cohesive 3-4 sentence professional summary paragraph (approx. 60-90 words) highlighting experience, core expertise, achievements and technical strengths.
      Use ONLY facts in the original text and context. NEVER invent years of experience, numbers, employers, tools or achievements.
      Do not format as bullet points; it MUST be a narrative paragraph.
      If a target job role or context is provided, tailor the summary to match that context.

      Provide EXACTLY 3 variations of different styles (e.g. leadership-focused, technical-depth focused, result/metric focused).
      
      Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
      {
        "variations": [
          "First enhanced professional summary paragraph",
          "Second enhanced professional summary paragraph",
          "Third enhanced professional summary paragraph"
        ]
      }

      Original text: "${bulletText}"
      ${roleContext ? `Target Role Context: ${roleContext}` : ''}`;
    } else {
      prompt = `You are an expert resume writer and technical recruiter. Enhance the following resume bullet point or work experience description.
      
      Make it action-oriented, professional, and impact-driven. Where the original states a result, lead with it ("Accomplished X, measured by Y, by doing Z").
      NEVER add a number, percentage, metric, tool or result that is not in the original text. If the original has no figure, describe the impact in words.
      Use strong, plain action verbs (built, led, designed, automated, improved, shipped).
      If a target job role or context is provided, tailor the wording to it without adding new facts.

      Provide EXACTLY 3 variations of different lengths and styles (e.g. short/punchy, metric-focused, detailed/methodical).
      
      Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
      {
        "variations": [
          "First enhanced variation",
          "Second enhanced variation",
          "Third enhanced variation"
        ]
      }

      Original text: "${bulletText}"
      ${roleContext ? `Target Role Context: ${roleContext}` : ''}
      ${actionVerb ? `Preferred action verb to start with: ${actionVerb}` : ''}`;
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 1024
      }
    });
    const responseText = result.response.text();
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      // Generic filler would put claims the person never made into their resume
      return res.status(502).json({ error: "The AI returned an unreadable answer. Please try again." });
    }
    const variations = (Array.isArray(parsed?.variations) ? parsed.variations : []).map(String).filter(Boolean);
    if (!variations.length) return res.status(502).json({ error: "The AI returned no suggestions. Please try again." });
    res.json({ success: true, variations });
  } catch (error) {
    sendServerError(res, error, "Bullet enhancement failed");
  }
});

// Suggest resume skills based on experience or job titles
router.post("/suggest-skills", async (req, res) => {
  try {
    const { experience, education, currentSkills } = req.body;
    const model = getModel();
    const prompt = `You are a technical recruiter. Suggest additional highly-valued industry-standard skills for a candidate based on their background.
    
    Existing Experience: ${JSON.stringify(experience || [])}
    Existing Education: ${JSON.stringify(education || [])}
    Current Skills: ${JSON.stringify(currentSkills || [])}

    Provide a list of up to 10 recommended skills that are NOT already in the current skills list. Include both technical skills (hard skills) and key domain methodologies.
    
    Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
    {
      "suggestedSkills": ["skill1", "skill2", ...]
    }`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 512
      }
    });
    const responseText = result.response.text();
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      parsed = { suggestedSkills: [] };
    }
    res.json({ success: true, suggestedSkills: parsed.suggestedSkills });
  } catch (error) {
    sendServerError(res, error, "Failed to suggest skills");
  }
});

// Tailor resume data against a target job description
router.post("/tailor-resume", async (req, res) => {
  try {
    const { personalInfo, summary, experience, education, skills, jobDescription } = req.body;
    if (!jobDescription) {
      return res.status(400).json({ error: "jobDescription is required" });
    }

    const posting = sanitizePosting(jobDescription, 3500);
    const facts = candidateFacts({ summary, skills, experience, education, projects: req.body.projects, achievements: req.body.achievements, certifications: req.body.certifications }, { desiredRole: personalInfo?.title });
    const prompt = `You are an expert resume writer. Tailor this candidate's resume to the job posting.

1. Rewrite the summary in 2-3 sentences aimed at this role, using only real facts.
2. For each experience entry, reword its bullets so the work most relevant to the posting comes first, with strong action verbs and the posting's wording where it truthfully applies. Each rewritten bullet must describe the SAME work as an original bullet: keep the same number of bullets, never drop one, never merge in work from another entry or project. Keep the same entries, and keep company, role and dates exactly as given.
3. "suggestedSkills": skills the posting asks for that are missing from the candidate's skills list. These are shown to the candidate to add ONLY if they really have them, so never put them into the summary or bullets.

${HONESTY_RULES}

CANDIDATE FACTS:
${facts}

EXPERIENCE ENTRIES TO REWRITE (JSON):
${JSON.stringify(experience || []).slice(0, 6000)}

JOB POSTING:
${posting.text}

Return ONLY valid JSON with this exact structure:
{
  "summary": "tailored 2-3 sentence summary",
  "experience": [{ "company": "exactly as given", "role": "exactly as given", "dates": "exactly as given", "bullets": ["rewritten bullet", "..."] }],
  "suggestedSkills": ["skill from the posting the candidate hasn't listed"]
}`;

    const result = await getModel().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 3000 }
    });
    const parsedDraft = parseJson(result.response.text());
    if (!parsedDraft) {
      console.error("Failed to parse tailoring JSON:", result.response.text().slice(0, 300));
      return res.status(502).json({ error: "The AI returned an unreadable answer. Please try again." });
    }
    // Only the summary and bullets are claims; suggestedSkills are gaps shown to the candidate, so they skip review
    const { suggestedSkills = [], ...content } = parsedDraft;
    const draft = JSON.stringify({ summary: content.summary || '', experience: content.experience || [] });
    const { text, review } = await reviewAndRevise({ kind: 'tailored resume', draft, facts, posting: posting.text, format: 'json', maxTokens: 3000 });
    const revised = parseJson(text) || JSON.parse(draft);
    const have = new Set((skills || []).map((s) => String(s).toLowerCase()));

    // Same entries, same number of bullets: a version that drops or invents bullets
    // falls back to the first draft, then to the original
    const key = (e) => `${String(e?.company || '').toLowerCase()}|${String(e?.role || '').toLowerCase()}`;
    const fits = (orig, cand) => cand && Array.isArray(cand.bullets) && cand.bullets.filter(Boolean).length === (orig.bullets || []).filter(Boolean).length;
    const byKey = (list) => new Map((Array.isArray(list) ? list : []).map((e) => [key(e), e]));
    const revisedByKey = byKey(revised.experience);
    const draftByKey = byKey(content.experience);
    const safeExperience = (experience || []).map((orig) => {
      const pick = [revisedByKey.get(key(orig)), draftByKey.get(key(orig))].find((c) => fits(orig, c));
      return { company: orig.company, role: orig.role, dates: orig.dates, bullets: pick ? pick.bullets : (orig.bullets || []) };
    });

    res.json({
      success: true,
      tailoredData: {
        summary: revised.summary || content.summary || '',
        experience: safeExperience,
        suggestedSkills: (Array.isArray(suggestedSkills) ? suggestedSkills : []).filter((s) => s && !have.has(String(s).toLowerCase())).slice(0, 10),
      },
      review,
    });
  } catch (error) {
    sendServerError(res, error, "Failed to tailor resume");
  }
});

// AI Achievement Finder Chatbot for Experience Bullets
router.post("/achievement-finder", async (req, res) => {
  try {
    const { roleTitle, message, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const systemInstruction = `You are the "Appliqa AI Achievement Finder", an elite resume coach.
    Your goal is to help a candidate build a highly professional, metric-driven resume bullet point for their role as a "${roleTitle || 'Professional'}".
    
    CONVERSATIONAL RULES:
    1. Ask short, highly targeted questions to extract metrics (percentages, numbers, dollars, time saved).
    2. Focus on ONE project or responsibility at a time.
    3. If the user gives vague answers (e.g. "I built pages"), prompt them: "How many pages? Did it improve speed? By how much?"
    4. Once you have a specific action, metric, and tool (e.g., "React", "15% page speed", "OAuth login"), formulate a final bullet point using the Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]".
    5. When the bullet point is ready, include it clearly.
    
    Format your response as a valid JSON object. Do NOT return markdown or code block formatting. Ensure this exact structure:
    {
      "reply": "Your conversational reply or follow-up question here.",
      "suggestedBullet": "The final suggested XYZ-formula bullet point if ready, otherwise null"
    }`;

    const model = getModel({ systemInstruction });

    // Format chat history
    let formattedHistory = (chatHistory || []).map((msg) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    while (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.shift();
    }

    const cleanHistory = [];
    let expectedRole = "user";
    for (const msg of formattedHistory) {
      if (msg.role === expectedRole) {
        cleanHistory.push(msg);
        expectedRole = expectedRole === "user" ? "model" : "user";
      }
    }

    const chat = model.startChat({
      history: cleanHistory,
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 1024,
      },
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      parsed = {
        reply: responseText,
        suggestedBullet: null
      };
    }

    res.json({ success: true, chatResult: parsed });
  } catch (error) {
    sendServerError(res, error, "Achievement finder chat failed");
  }
});

// --- Fit ranking for the "for you" feed ---
// One call scores up to 12 jobs against the profile; each job's score is cached.
router.post("/rank-jobs", async (req, res) => {
  try {
    const { jobs, resumeData, preferences } = req.body || {};
    const list = (Array.isArray(jobs) ? jobs : []).filter((j) => j && j.id && j.title).slice(0, 12);
    if (!list.length) return res.status(400).json({ error: "jobs are required" });

    const facts = candidateFacts(resumeData, preferences);
    const QUERY = 'rank-job-v1';
    const keyFor = (job) => getCacheKey(facts, `${job.id}_${job.title}`, QUERY);
    const scores = {};

    try {
      const { data: cached } = await supabase.from('ai_cache').select('cache_key, response_data')
        .eq('query_type', QUERY).in('cache_key', list.map(keyFor));
      const byKey = new Map((cached || []).map((c) => [c.cache_key, c.response_data]));
      for (const job of list) if (byKey.has(keyFor(job))) scores[job.id] = byKey.get(keyFor(job));
    } catch (dbReadErr) {
      console.error('Failed to read rank-jobs cache:', dbReadErr);
    }

    const todo = list.filter((j) => !scores[j.id]);
    if (todo.length) {
      // Jobs are numbered: models garble JSearch's long base64 ids
      const block = todo.map((j, i) => `JOB ${i + 1}\nTitle: ${clipText(j.title, 160)}\nCompany: ${clipText(j.company, 100)}\n${sanitizePosting(j.description, 1400).text}`).join('\n\n---\n\n');
      const prompt = `You are a careful recruiter. For each job below, judge how well it fits this candidate, honestly (most jobs are not a strong fit).

CANDIDATE FACTS:
${facts}

${block}

For every job return: "score" 0-100 (mostly skills and experience fit, then level and goals), "verdict" one of "strong", "good", "stretch", "weak", and "why": one short sentence naming the main reason or gap.
Return ONLY valid JSON with one entry per job, using its number: { "jobs": [ { "n": 1, "score": 0, "verdict": "good", "why": "..." } ] }`;

      const result = await getModel().generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4000, temperature: 0.2 }
      });
      const raw = result.response.text();
      const parsed = parseJson(raw);
      if (!Array.isArray(parsed?.jobs)) console.warn('[Rank] unreadable answer:', raw.slice(0, 300));
      const rows = [];
      for (const item of parsed?.jobs || []) {
        const job = todo[Number(item?.n) - 1];
        const score = Number(item?.score);
        if (!job || !Number.isFinite(score)) continue;
        item.score = score;
        const entry = {
          score: Math.max(0, Math.min(100, Math.round(item.score))),
          verdict: ['strong', 'good', 'stretch', 'weak'].includes(item.verdict) ? item.verdict : 'good',
          why: clipText(item.why, 200),
        };
        scores[job.id] = entry;
        rows.push({ cache_key: keyFor(job), query_type: QUERY, response_data: entry, created_at: new Date().toISOString() });
      }
      if (rows.length) {
        supabase.from('ai_cache').upsert(rows).then(({ error }) => error && console.error('Failed to cache rank-jobs:', error.message));
      }
    }

    if (!Object.keys(scores).length) return res.status(502).json({ error: "Couldn't score these jobs right now. Please try again." });
    res.json({ success: true, scores });
  } catch (error) {
    sendServerError(res, error, "AI ranking failed");
  }
});

// --- Follow-up and thank-you drafts for tracked applications ---
// Uses only what the person already sent (their cover letter) and their real profile.
router.post("/follow-up", async (req, res) => {
  try {
    const { kind = 'follow-up', job = {}, resumeData, preferences, context = '' } = req.body || {};
    if (!job.title) return res.status(400).json({ error: "job.title is required" });
    const isThanks = kind === 'thank-you';
    const facts = candidateFacts(resumeData, preferences);
    const sent = clipText(job.coverLetter, 2500);
    const applied = job.appliedAt ? new Date(job.appliedAt).toDateString() : '';

    const prompt = isThanks
      ? `Write a short thank-you note (email, under 120 words) after an interview for ${job.title} at ${job.company || 'the company'}.
Thank them, mention one specific thing about the role${context ? ' or the conversation' : ''}, restate genuine interest and ONE real fit point, and close politely. Sign with the candidate's name. No subject line, no placeholders.`
      : `Write a short, polite follow-up email (under 110 words) about an application for ${job.title} at ${job.company || 'the company'}${applied ? `, sent on ${applied}` : ''}.
Mention the role and when they applied, restate ONE real fit point taken from what they already sent, and ask one clear question about next steps or timeline. Not pushy. Sign with the candidate's name. Start with "Subject: ..." on the first line, then the email.`;

    const full = `${prompt}

${HONESTY_RULES}
- Only use fit points that appear in WHAT THEY ALREADY SENT or the CANDIDATE FACTS.

CANDIDATE FACTS:
${facts}

WHAT THEY ALREADY SENT (cover letter):
${sent || 'Not saved.'}
${context ? `\nNOTES FROM THE CANDIDATE:\n${clipText(context, 800)}` : ''}`;

    const result = await getModel().generateContent(full);
    const draft = result.response.text().trim();
    const { text, review } = await reviewAndRevise({
      kind: isThanks ? 'thank-you note' : 'follow-up message', draft, facts: `${facts}\n${sent}\n${clipText(context, 800)}`, posting: `${job.title} at ${job.company || 'the company'}`, maxTokens: 600,
    });
    res.json({ success: true, text, review });
  } catch (error) {
    sendServerError(res, error, "Couldn't write the message");
  }
});

// --- Mock interview ---
// The AI plays the interviewer for one tracked job: one question at a time,
// short feedback on each answer, and a wrap-up after five questions.
const MOCK_QUESTIONS = 5;
router.post("/mock-interview", async (req, res) => {
  try {
    const { job = {}, resumeData, preferences, history = [], answer = '' } = req.body || {};
    if (!job.title) return res.status(400).json({ error: "job.title is required" });
    const turns = (Array.isArray(history) ? history : []).slice(-20)
      .filter((t) => t && (t.role === 'interviewer' || t.role === 'candidate') && t.text)
      .map((t) => `${t.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${clipText(t.text, 1500)}`);
    const asked = (history || []).filter((t) => t?.role === 'interviewer' && t.question).length;
    const finishing = asked >= MOCK_QUESTIONS && answer;

    const facts = candidateFacts(resumeData, preferences);
    const posting = sanitizePosting(job.description, 2500);
    const prompt = `You are interviewing a candidate for ${job.title} at ${job.company || 'the company'}. Be realistic, friendly and specific to this job and this candidate's background. Mix technical, project and behavioural questions. Never invent facts about the candidate.

CANDIDATE FACTS:
${facts}

JOB POSTING:
${posting.text || 'Not provided.'}

CONVERSATION SO FAR:
${turns.join('\n') || '(none, this is the start)'}
${answer ? `CANDIDATE'S LATEST ANSWER: ${clipText(answer, 2500)}` : ''}

${!answer
    ? 'Start the interview: a one-line greeting and the first question.'
    : finishing
      ? `That was the last question. Give "feedback" on the latest answer, then a "summary": 3 strengths and 3 things to improve across the whole interview, with one concrete tip each. Set "question" to "".`
      : 'Give short "feedback" on the latest answer (what worked, what to add, using the STAR method where it helps; 2-3 sentences), then ask the next "question".'}

Return ONLY valid JSON: { "feedback": "", "question": "", "summary": "" }`;

    const result = await getModel().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1200, temperature: 0.6 }
    });
    const parsed = parseJson(result.response.text());
    if (!parsed) return res.status(502).json({ error: "The interviewer lost its train of thought. Please try again." });
    res.json({
      success: true,
      feedback: clipText(parsed.feedback, 1500),
      question: finishing ? '' : clipText(parsed.question, 800),
      summary: finishing ? asText(parsed.summary).slice(0, 3000) : '',
      questionNumber: finishing ? asked : asked + 1,
      total: MOCK_QUESTIONS,
      done: Boolean(finishing),
    });
  } catch (error) {
    sendServerError(res, error, "Mock interview failed");
  }
});

module.exports = router;


