require('dotenv').config({ path: '../.env' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    console.log("Fetching models...");
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log("Supported Models:");
    data.models.forEach(m => {
      console.log(`- Name: ${m.name}, Display: ${m.displayName}, Methods: ${m.supportedGenerationMethods.join(", ")}`);
    });
  } catch (err) {
    console.error("Error listing models:", err.message);
  }
}

listModels();
