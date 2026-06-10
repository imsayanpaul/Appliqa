const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '../.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    console.log("Testing gemini-flash-latest with key:", process.env.GEMINI_API_KEY.substring(0, 10) + "...");
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Say hello!");
    console.log("Success! Response:", result.response.text());
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

testModel();
