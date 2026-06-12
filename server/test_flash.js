const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '../.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    console.log("Testing gemini-3.1-flash-lite JSON output...");
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    const prompt = "Generate a JSON list of 3 popular programming languages. Format: { \"languages\": [ { \"name\": \"Python\", \"year\": 1991 } ] }";
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 500
      }
    });
    console.log("Success! Response text:", result.response.text());
    const parsed = JSON.parse(result.response.text());
    console.log("Parsed JSON:", parsed);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

testModel();
