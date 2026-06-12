const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { supabase } = require('../lib/supabase');
const crypto = require('crypto');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = (modelName = "gemini-3.1-flash-lite") => {
  return genAI.getGenerativeModel({ model: modelName }, { timeout: 45000 });
};

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
    console.error("Resume analysis error:", error);
    res
      .status(500)
      .json({ error: "AI analysis failed", message: error.message });
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
    console.error("Smart search error:", error);
    res.status(500).json({ error: "AI search failed", message: error.message });
  }
});

// Match score — compare resume/preferences to a job
router.post("/match-score", async (req, res) => {
  try {
    const { resumeData, preferences, jobDescription, jobTitle } = req.body;

    const candidateInput = `${resumeData?.skills?.join(",") || preferences?.skills?.join(",") || ""}_${resumeData?.experienceLevel || preferences?.experienceLevel || ""}_${preferences?.desiredRole || ""}`;
    const cacheKey = getCacheKey(candidateInput, jobDescription, 'match-score');

    // 1. Check AI Cache Table
    try {
      const { data: cachedMatch, error: cacheErr } = await supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .eq('query_type', 'match-score')
        .maybeSingle();

      if (cachedMatch && cachedMatch.response_data) {
        return res.json({ success: true, match: cachedMatch.response_data, fromCache: true });
      }
    } catch (dbReadErr) {
      console.error('Failed to read match-score from Supabase cache:', dbReadErr);
    }

    // 2. Cache Miss: Query Gemini (with retry for rate limits)
    const model = getModel();

    const prompt = `Rate how well this job matches the candidate's profile. Return ONLY valid JSON (no markdown, no code blocks):
{
  "score": 85,
  "reasons": ["reason1", "reason2", "reason3"],
  "missingSkills": ["skill1", "skill2"],
  "recommendation": "Brief recommendation"
}

Candidate Skills: ${resumeData?.skills?.join(", ") || preferences?.skills?.join(", ") || "Not specified"}
Candidate Experience: ${resumeData?.experienceLevel || preferences?.experienceLevel || "Not specified"}
Desired Role: ${preferences?.desiredRole || "Not specified"}

Job Title: ${jobTitle}
Job Description: ${jobDescription?.substring(0, 2000)}`;

    let parsed;
    let parsedSuccessfully = false;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1024
          }
        });
        const responseText = result.response.text();

        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
          parsedSuccessfully = true;
          break; // Success, exit retry loop
        } catch (parseErr) {
          console.error(`Match score JSON parse failed (attempt ${attempt}):`, parseErr.message);
          if (attempt === maxRetries) {
            parsed = {
              score: 50,
              reasons: ["Unable to analyze"],
              missingSkills: [],
              recommendation: "Review manually",
            };
          }
        }
      } catch (apiErr) {
        console.error(`Match score API error (attempt ${attempt}/${maxRetries}):`, apiErr.message || apiErr);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1500; // 3s, 6s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          parsed = {
            score: 50,
            reasons: ["Unable to analyze — API error, please try again shortly"],
            missingSkills: [],
            recommendation: "Review manually",
          };
        }
      }
    }

    // 3. Write response to AI Cache Table (only cache successful parses)
    if (parsedSuccessfully) {
      try {
        await supabase.from('ai_cache').upsert({
          cache_key: cacheKey,
          query_type: 'match-score',
          response_data: parsed,
          created_at: new Date().toISOString()
        });
      } catch (dbWriteErr) {
        console.error('Failed to write match-score to Supabase cache:', dbWriteErr);
      }
    }

    res.json({ success: true, match: parsed });
  } catch (error) {
    console.error("Match score error:", error);
    res
      .status(500)
      .json({ error: "AI matching failed", message: error.message });
  }
});

// Generate cover letter
router.post("/cover-letter", async (req, res) => {
  try {
    const { resumeData, preferences, jobTitle, jobCompany, jobDescription } =
      req.body;
    if (!jobTitle)
      return res.status(400).json({ error: "jobTitle is required" });

    // 1. Calculate Cache Key
    const candidateInput = `${resumeData?.skills?.join(",") || preferences?.skills?.join(",") || ""}_${resumeData?.experience?.join(";") || ""}_${resumeData?.experienceLevel || preferences?.experienceLevel || ""}_${preferences?.name || ""}`;
    const cacheKey = getCacheKey(candidateInput, jobDescription, 'cover-letter');

    // 2. Check AI Cache Table
    try {
      const { data: cachedCL, error: cacheErr } = await supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .eq('query_type', 'cover-letter')
        .maybeSingle();

      if (cachedCL && cachedCL.response_data?.text) {
        return res.json({ success: true, coverLetter: cachedCL.response_data.text, fromCache: true });
      }
    } catch (dbReadErr) {
      console.error('Failed to read cover-letter from Supabase cache:', dbReadErr);
    }

    // 3. Cache Miss: Query Gemini
    const model = getModel();

    const candidateName = preferences?.name || "the candidate";
    const candidateSkills =
      resumeData?.skills?.join(", ") ||
      preferences?.skills?.join(", ") ||
      "Not specified";
    const candidateExperience =
      resumeData?.experience?.join("; ") || "Not specified";
    const candidateLevel =
      resumeData?.experienceLevel || preferences?.experienceLevel || "mid";

    const prompt = `Write a professional, compelling cover letter for this job application. 
The tone should be confident but not arrogant, and personalized to the specific role.
Do NOT use placeholder brackets like [Your Name] — use the actual info provided.
Keep it to 3-4 paragraphs max. Return ONLY the cover letter text, no extra formatting.

Candidate Name: ${candidateName}
Candidate Skills: ${candidateSkills}
Experience: ${candidateExperience}
Experience Level: ${candidateLevel}

Job Title: ${jobTitle}
Company: ${jobCompany || "the company"}
Job Description (excerpt): ${jobDescription?.substring(0, 2000)}`;

    const result = await model.generateContent(prompt);
    const coverLetter = result.response.text();

    // 4. Write response to AI Cache Table
    try {
      await supabase.from('ai_cache').upsert({
        cache_key: cacheKey,
        query_type: 'cover-letter',
        response_data: { text: coverLetter },
        created_at: new Date().toISOString()
      });
    } catch (dbWriteErr) {
      console.error('Failed to write cover-letter to Supabase cache:', dbWriteErr);
    }

    res.json({ success: true, coverLetter });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    res
      .status(500)
      .json({
        error: "AI cover letter generation failed",
        message: error.message,
      });
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
    console.error("Career path error:", error);
    res
      .status(500)
      .json({
        error: "AI career path generation failed",
        message: error.message,
      });
  }
});

// Generate Recruiter DM — short LinkedIn networking message
router.post("/recruiter-dm", async (req, res) => {
  try {
    const { resumeData, preferences, jobTitle, jobCompany, matchReasons } =
      req.body;
    if (!jobTitle)
      return res.status(400).json({ error: "jobTitle is required" });

    // 1. Calculate Cache Key
    const candidateInput = `${resumeData?.skills?.join(",") || preferences?.skills?.join(",") || ""}_${preferences?.name || ""}`;
    const jobInput = `${jobTitle || ""}_${jobCompany || ""}_${matchReasons?.join(",") || ""}`;
    const cacheKey = getCacheKey(candidateInput, jobInput, 'recruiter-dm');

    // 2. Check AI Cache Table
    try {
      const { data: cachedDM, error: cacheErr } = await supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .eq('query_type', 'recruiter-dm')
        .maybeSingle();

      if (cachedDM && cachedDM.response_data?.text) {
        return res.json({ success: true, recruiterDM: cachedDM.response_data.text, fromCache: true });
      }
    } catch (dbReadErr) {
      console.error('Failed to read recruiter-dm from Supabase cache:', dbReadErr);
    }

    // 3. Cache Miss: Query Gemini
    const model = getModel();

    const candidateName = preferences?.name || "a professional";
    const candidateSkills =
      resumeData?.skills?.join(", ") ||
      preferences?.skills?.join(", ") ||
      "various technical skills";
    const topMatchReason =
      matchReasons?.[0] || "strong alignment with the role requirements";

    const prompt = `Write a short, professional LinkedIn cold DM to a hiring manager or recruiter for this job. 

RULES:
- EXACTLY 3 sentences. No more, no less.
- Casual-professional tone — like a confident peer, not a desperate applicant.
- First sentence: a brief, personalized hook referencing the company or role.
- Second sentence: highlight the candidate's strongest match point: "${topMatchReason}"
- Third sentence: a soft call-to-action (ask for a quick chat, not "please hire me").
- Do NOT use placeholder brackets like [Name]. Use real info provided.
- Do NOT include a subject line, greeting like "Hi", or sign-off. Just the 3 sentences.
- Keep it under 50 words total. Punchy and memorable.

Candidate Name: ${candidateName}
Key Skills: ${candidateSkills}
Job Title: ${jobTitle}
Company: ${jobCompany || "the company"}`;

    const result = await model.generateContent(prompt);
    const dmText = result.response.text().trim();

    // 4. Write response to AI Cache Table
    try {
      await supabase.from('ai_cache').upsert({
        cache_key: cacheKey,
        query_type: 'recruiter-dm',
        response_data: { text: dmText },
        created_at: new Date().toISOString()
      });
    } catch (dbWriteErr) {
      console.error('Failed to write recruiter-dm to Supabase cache:', dbWriteErr);
    }

    res.json({ success: true, recruiterDM: dmText });
  } catch (error) {
    console.error("Recruiter DM generation error:", error);
    res
      .status(500)
      .json({
        error: "AI recruiter DM generation failed",
        message: error.message,
      });
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

    const candidateSkills =
      resumeData?.skills?.join(", ") ||
      preferences?.skills?.join(", ") ||
      "Not specified";
    const candidateExperience =
      resumeData?.experience?.join("; ") || "Not specified";
    const candidateLevel =
      resumeData?.experienceLevel || preferences?.experienceLevel || "mid";

    const prompt = `You are an expert interview coach. Generate a comprehensive interview preparation guide for this candidate and job. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:

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

Candidate Skills: ${candidateSkills}
Candidate Experience: ${candidateExperience}
Experience Level: ${candidateLevel}

Job Title: ${jobTitle}
Company: ${jobCompany || "the company"}
Job Description: ${jobDescription?.substring(0, 3000)}`;

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
      parsed = {
        questions: [],
        technicalTopics: [],
        companyInsights: [],
        tips: ["Unable to generate prep. Please try again."],
      };
    }

    res.json({ success: true, interviewPrep: parsed });
  } catch (error) {
    console.error("Interview prep error:", error);
    res.status(500).json({
      error: "AI interview prep generation failed",
      message: error.message,
    });
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
    console.error("ATS Scorer error:", error);
    res.status(500).json({
      error: "ATS analysis failed",
      message: error.message,
    });
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
- Work History: ${resumeData.experience?.join("; ") || "N/A"}
- Education: ${resumeData.education?.join("; ") || "N/A"}
`;
    } else {
      resumeContext = `
No resume has been uploaded yet. Provide helpful general career advice, and gently suggest they upload their resume on the homepage for personalized insights.
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
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: systemInstruction,
    }, { timeout: 45000 });

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
    const responseText = result.response.text();

    res.json({ success: true, response: responseText });
  } catch (error) {
    console.error("AI Career Advisor error:", error);
    res.status(500).json({
      error: "AI Career Advisor failed",
      message: error.message,
    });
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
      
      Make it highly professional, compelling, and impact-driven. Create a cohesive 3-4 sentence professional summary paragraph (approx. 60-90 words) highlighting years of experience, core expertise, key achievements, and technical strengths.
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
      
      Make it action-oriented, professional, and impact-driven. Apply the Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]" where possible.
      Use active, strong professional verbs (e.g. spearheaded, orchestrated, engineered, streamlined, architected).
      If a target job role or context is provided, tailor it to match that context.

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
      parsed = {
        variations: isSummary ? [
          `Results-driven professional with extensive experience in the field, recognized for leading high-impact projects and optimizing system performances. Proven ability to architect scalable solutions and collaborate across cross-functional teams to drive operational efficiency.`,
          `Highly skilled specialist with a strong technical background and a track record of implementing robust system architectures. Adept at leveraging advanced methodologies and data-driven insights to deliver streamlined workflows and substantial business value.`,
          `Proactive leader with expertise in guiding technical initiatives from concept to execution. Demonstrated success in optimizing development lifecycles, reducing operational overhead, and building high-performing teams aligned with strategic goals.`
        ] : [
          `Spearheaded projects resulting in enhanced efficiency.`,
          `Optimized development workflows, improving overall delivery times.`,
          `Led key initiatives to drive process enhancements across the team.`
        ]
      };
    }
    res.json({ success: true, variations: parsed.variations });
  } catch (error) {
    console.error("Bullet enhancement error:", error);
    res.status(500).json({ error: "Bullet enhancement failed", message: error.message });
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
    console.error("Suggest skills error:", error);
    res.status(500).json({ error: "Failed to suggest skills", message: error.message });
  }
});

// Tailor resume data against a target job description
router.post("/tailor-resume", async (req, res) => {
  try {
    const { personalInfo, summary, experience, education, skills, jobDescription } = req.body;
    if (!jobDescription) {
      return res.status(400).json({ error: "jobDescription is required" });
    }

    const model = getModel();
    const prompt = `You are an expert technical recruiter and resume writer. Tailor this candidate's resume for the target job description.
    
    CRITICAL INSTRUCTIONS:
    1. Tailor the professional summary to align with the key challenges and needs of the job description.
    2. Review and rewrite the experience bullet points. Inject strong active verbs and align the accomplishments to directly mirror or support the duties requested in the job description. Use the Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]") where possible.
    3. Analyze the skills list. Identify critical technical skills, tools, or methodologies present in the job description that the candidate might want to add.
    
    Candidate Data:
    - Current Title/Headline: ${personalInfo?.title || "Not specified"}
    - Professional Summary: ${summary || "Not specified"}
    - Skills: ${JSON.stringify(skills || [])}
    - Work Experience: ${JSON.stringify(experience || [])}
    
    Target Job Description:
    ${jobDescription.substring(0, 3000)}
    
    Return ONLY valid JSON (no markdown, no code blocks) matching this exact structure:
    {
      "summary": "a polished, tailored 2-3 sentence summary",
      "experience": [
        {
          "company": "google (must match original company name in exact case)",
          "role": "software engineer (must match original job title)",
          "dates": "dates (must match original dates)",
          "bullets": [
            "Tailored bullet point 1 using XYZ formula.",
            "Tailored bullet point 2 using XYZ formula."
          ]
        }
      ],
      "suggestedSkills": ["React", "AWS", "Docker"]
    }`;

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
      console.error("Failed to parse tailoring JSON:", responseText);
      parsed = {
        summary: summary || "",
        experience: experience || [],
        suggestedSkills: []
      };
    }
    res.json({ success: true, tailoredData: parsed });
  } catch (error) {
    console.error("Resume tailoring error:", error);
    res.status(500).json({ error: "Failed to tailor resume", message: error.message });
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

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: systemInstruction,
    }, { timeout: 45000 });

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
    console.error("Achievement finder error:", error);
    res.status(500).json({ error: "Achievement finder chat failed", message: error.message });
  }
});

module.exports = router;


