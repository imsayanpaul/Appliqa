const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") }); // Load .env from project directory

async function testMatch() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("GEMINI_API_KEY length:", apiKey ? apiKey.length : 0);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { timeout: 45000 });

  const prompt = `Rate how well this job matches the candidate's profile. Return ONLY valid JSON (no markdown, no code blocks):
{
  "score": 85,
  "reasons": ["reason1", "reason2", "reason3"],
  "missingSkills": ["skill1", "skill2"],
  "recommendation": "Brief recommendation"
}

Candidate Skills: SQL, Python, Java
Candidate Experience: mid
Desired Role: Data Scientist

Job Title: Data Scientist
Job Description: We are looking for a Data Scientist at Ericsson in Kolkata. Required skills: Python, Machine Learning, Deep Learning, SQL.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 1024
      }
    });
    const text = result.response.text();
    console.log("RESPONSE TEXT:", text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    console.log("PARSED JSON SUCCESSFULLY:", parsed);
  } catch (err) {
    console.error("ERROR OCCURRED:", err);
  }
}

testMatch();
