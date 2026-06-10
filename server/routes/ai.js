const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { supabase } = require('../lib/supabase');
const crypto = require('crypto');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = (modelName = "gemini-flash-lite-latest") => {
  return genAI.getGenerativeModel({ model: modelName }, { timeout: 45000 });
};

const getCacheKey = (resumeText, jobDescription, queryType) => {
  const input = `${resumeText || ''}_${jobDescription || ''}_${queryType}`;
  return crypto.createHash('md5').update(input).digest('hex');
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

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": ["Job Title at Company (Duration)", ...],
  "education": ["Degree from Institution", ...],
  "suggestedRoles": ["role1", "role2", ...],
  "experienceLevel": "entry|mid|senior|lead",
  "industries": ["industry1", "industry2"]
}

Resume text:
${resumeText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      parsed = {
        summary: responseText,
        skills: [],
        experience: [],
        education: [],
        suggestedRoles: [],
        experienceLevel: "mid",
        industries: [],
      };
    }

    res.json({ success: true, analysis: parsed });
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

    const result = await model.generateContent(prompt);
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

    // 2. Cache Miss: Query Gemini
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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      parsed = {
        score: 50,
        reasons: ["Unable to analyze"],
        missingSkills: [],
        recommendation: "Review manually",
      };
    }

    // 3. Write response to AI Cache Table
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

    const result = await model.generateContent(prompt);
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

    const result = await model.generateContent(prompt);
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

    const result = await model.generateContent(prompt);
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

module.exports = router;
