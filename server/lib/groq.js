// Groq (OpenAI-compatible chat API) as Appliqa's second AI provider: it reviews
// Gemini's drafts and takes over when Gemini is busy. Plain fetch, no SDK.
// GROQ_MODELS can override the list, e.g. "openai/gpt-oss-120b,openai/gpt-oss-20b".
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',').map((m) => m.trim()).filter(Boolean);
const TIMEOUT_MS = 45000;

const groqEnabled = () => Boolean(process.env.GROQ_API_KEY);

const partsText = (parts) => (Array.isArray(parts) ? parts.map((p) => p?.text || '').join('') : String(parts || ''));

// Gemini request shapes (a string, or { contents, generationConfig }) to chat messages
function toMessages(request, options = {}, history = []) {
  const messages = [];
  const system = options.systemInstruction;
  if (system) messages.push({ role: 'system', content: typeof system === 'string' ? system : partsText(system.parts) });
  for (const turn of history) {
    messages.push({ role: turn.role === 'model' ? 'assistant' : 'user', content: partsText(turn.parts) });
  }
  if (typeof request === 'string') {
    messages.push({ role: 'user', content: request });
  } else if (Array.isArray(request?.contents)) {
    for (const c of request.contents) messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: partsText(c.parts) });
  } else if (request) {
    messages.push({ role: 'user', content: partsText(request.parts || request) });
  }
  return messages;
}

function requestConfig(request, options) {
  const config = { ...(options.generationConfig || {}), ...((typeof request === 'object' && request?.generationConfig) || {}) };
  return {
    json: config.responseMimeType === 'application/json',
    maxTokens: config.maxOutputTokens || 4096,
    temperature: config.temperature ?? 0.4,
  };
}

const statusError = (status, message) => Object.assign(new Error(`[${status}] Groq: ${message}`), { status });

async function chat(model, messages, { json, maxTokens, temperature }) {
  const body = {
    model,
    messages,
    temperature,
    // gpt-oss models think before answering; that counts against max tokens
    max_completion_tokens: Math.min(maxTokens + 2048, 16384),
    ...(json ? { response_format: { type: 'json_object' } } : {}),
    ...(/gpt-oss/.test(model) ? { reasoning_effort: 'low', include_reasoning: false } : {}),
  };
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw statusError(res.status, text.slice(0, 300));
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw statusError(502, 'empty response');
  return { text, usage: data.usage || {} };
}

// Returns a Gemini-shaped result ({ response: { text(), usageMetadata } }) so callers don't change
async function generate(request, options = {}, history = []) {
  if (!groqEnabled()) throw statusError(503, 'GROQ_API_KEY is not set');
  const messages = toMessages(request, options, history);
  const config = requestConfig(request, options);
  let lastError;
  for (const model of MODELS) {
    try {
      const { text, usage } = await chat(model, messages, config);
      return {
        model: `groq/${model}`,
        response: {
          text: () => text,
          usageMetadata: { promptTokenCount: usage.prompt_tokens || 0, candidatesTokenCount: usage.completion_tokens || 0 },
        },
      };
    } catch (err) {
      lastError = err;
      // Bad requests won't succeed on the next model either
      if (err.status === 400 || err.status === 401 || err.status === 403) throw err;
    }
  }
  throw lastError;
}

module.exports = { generate, groqEnabled, toMessages, MODELS };
