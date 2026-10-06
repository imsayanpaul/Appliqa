// Gemini with retries and a fallback model. A busy model (503), rate limit
// (429) or server error (500/504) is retried once, then the next model is tried.
// GEMINI_MODELS can override the list, e.g. "gemini-3.1-flash-lite,gemini-3.5-flash-lite".
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.1-flash-lite,gemini-3.5-flash-lite')
  .split(',').map((m) => m.trim()).filter(Boolean);
const TIMEOUT_MS = 45000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const statusOf = (err) => err?.status || Number(String(err?.message || '').match(/\[(\d{3})/)?.[1]) || 0;
const isRetryable = (err) => {
  const s = statusOf(err);
  return s === 429 || s === 500 || s === 503 || s === 504 || /fetch failed|ECONNRESET|ETIMEDOUT|timed? ?out/i.test(String(err?.message || ''));
};
const isMissingModel = (err) => statusOf(err) === 404;

// Run `call(model)` across the models, retrying busy errors once per model
async function withFallback(options, call) {
  let lastError;
  for (const name of MODELS) {
    const model = genAI.getGenerativeModel({ ...options, model: name }, { timeout: TIMEOUT_MS });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await call(model);
      } catch (err) {
        lastError = err;
        if (isMissingModel(err)) break; // retired model: go to the next one
        if (!isRetryable(err)) throw err;
        if (attempt === 0) await sleep(700 + Math.random() * 500);
      }
    }
    console.warn(`Gemini model ${name} unavailable (${statusOf(lastError) || 'error'}), trying the next one`);
  }
  throw lastError;
}

// Same surface the routes already use: generateContent and startChat().sendMessage
function getModel(options = {}) {
  return {
    generateContent: (request) => withFallback(options, (model) => model.generateContent(request)),
    startChat: (chatOptions) => ({
      sendMessage: (message) => withFallback(options, (model) => model.startChat(chatOptions).sendMessage(message)),
    }),
  };
}

module.exports = { getModel, MODELS };
