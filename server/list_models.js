const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '../.env' }); // Load .env from root

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModels() {
  try {
    console.log("Checking Gemini API key...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("test");
    console.log("gemini-1.5-flash-latest works! Response:", result.response.text());
  } catch (e) {
    console.log("gemini-1.5-flash-latest failed:", e.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("test");
    console.log("gemini-2.0-flash works! Response:", result.response.text());
  } catch (e) {
    console.log("gemini-2.0-flash failed:", e.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("gemini-1.5-flash failed or works? Response:", result.response.text());
  } catch (e) {
    console.log("gemini-1.5-flash failed:", e.message);
  }
}

checkModels();
