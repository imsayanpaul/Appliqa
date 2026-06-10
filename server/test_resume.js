const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '../.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const mockResumeText = `
Saikat Paul
Software Engineer
Skills: Kinaxis Maestro, SQL, PL/SQL, JavaScript, Java, Python, Problem-Solving
Experience:
- Senior Analyst at Accenture Technology (Feb 2025 - Present)
- Associate at Cognizant Technology Solutions India Pvt. Ltd. (Aug 2022 - Feb 2025)
Education:
- B.Tech (Hons.) from RCC Institute of Information Technology
`;

async function testResume() {
  const startTime = Date.now();
  try {
    console.log("Testing full resume prompt...");
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" }, { timeout: 45000 });
    
    const prompt = `Analyze this resume and extract structured information. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": ["Job Title at Company (Duration)", ...],
  "education": ["Degree from Institution", ...],
  "suggestedRoles": ["role1", "role2", "role3"],
  "experienceLevel": "entry|mid|senior|lead",
  "industries": ["industry1", "industry2"]
}

Resume text:
${mockResumeText}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Success! Time taken:", ((Date.now() - startTime) / 1000).toFixed(2), "seconds");
    console.log("Response text:", text);
  } catch (e) {
    console.error("Failed after:", ((Date.now() - startTime) / 1000).toFixed(2), "seconds. Error:", e.message);
  }
}

testResume();
