// Gemini with retries and a fallback model. A busy model (503), rate limit
// (429) or server error (500/504) is retried once, then the next model is tried.
// When every Gemini model is busy, Groq answers instead (lib/groq.js), if configured.
// GEMINI_MODELS can override the list, e.g. "gemini-3.1-flash-lite,gemini-3.5-flash-lite".
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { recordUsage } = require('./usage');
const groq = require('./groq');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.1-flash-lite,gemini-3.5-flash-lite')
  .split(',').map((m) => m.trim()).filter(Boolean);
const TIMEOUT_MS = 45000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const statusOf = (err) => err?.status || Number(String(err?.message || '').match(/\[(\d{3})/)?.[1]) || 0;
const isRetryable = (err) => {
  const s = statusOf(err);
  return s === 429 || s === 500 || s === 502 || s === 503 || s === 504 || /fetch failed|ECONNRESET|ETIMEDOUT|timed? ?out|aborted/i.test(String(err?.message || ''));
};
const isMissingModel = (err) => statusOf(err) === 404;

// Run `call(model)` across the Gemini models, retrying busy errors once per model
async function withGemini(options, call) {
  let lastError;
  for (const name of MODELS) {
    const model = genAI.getGenerativeModel({ ...options, model: name }, { timeout: TIMEOUT_MS });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await call(model);
        recordUsage(name, result?.response?.usageMetadata);
        return result;
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

async function withGroq(request, options, history) {
  const result = await groq.generate(request, options, history);
  recordUsage(result.model, result.response.usageMetadata);
  return result;
}

// prefer: 'gemini' (default) uses Groq only when Gemini is busy; 'groq' does the
// opposite, which the reviewer uses so a different model checks Gemini's drafts.
async function run(options, prefer, request, history, geminiCall) {
  if (prefer === 'groq' && groq.groqEnabled()) {
    try {
      return await withGroq(request, options, history);
    } catch (err) {
      console.warn(`Groq unavailable (${statusOf(err) || 'error'}), using Gemini`);
    }
    return withGemini(options, geminiCall);
  }
  try {
    return await withGemini(options, geminiCall);
  } catch (err) {
    if (!groq.groqEnabled() || !(isRetryable(err) || isMissingModel(err))) throw err;
    console.warn(`Gemini unavailable (${statusOf(err) || 'error'}), answering with Groq`);
    return withGroq(request, options, history);
  }
}

// Same surface the routes already use: generateContent and startChat().sendMessage
function getModel(options = {}, { prefer = 'gemini' } = {}) {
  return {
    generateContent: (request) => run(options, prefer, request, [], (model) => model.generateContent(request)),
    startChat: (chatOptions = {}) => ({
      sendMessage: (message) => run(
        { ...options, generationConfig: chatOptions.generationConfig || options.generationConfig },
        prefer,
        message,
        chatOptions.history || [],
        (model) => model.startChat(chatOptions).sendMessage(message),
      ),
    }),
  };
}

module.exports = { getModel, MODELS };
