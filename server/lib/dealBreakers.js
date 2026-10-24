// Things in a job posting that people often refuse outright: the deal-breakers a
// person can tick in their profile, plus warning signs worth showing anyway.
// Plain pattern checks, so the feed can run them on every job for free.

const RULES = [
  { key: 'bond', label: 'service bond', pattern: /\b(service (?:agreement|bond)|training bond|bond (?:of|for) \d|\d+[\s-]*(?:year|yr|month)s?\s+bond|bond period|sign(?:ing)? (?:a|the) bond|security deposit)\b/i },
  { key: 'fee', label: 'asks for a fee', warnAlways: true, pattern: /\b(registration fee|training fee|joining fee|processing fee|refundable deposit|pay (?:a|the|an) (?:fee|deposit|amount)|kit charges?)\b/i },
  { key: 'night_shift', label: 'night or rotational shifts', pattern: /\b(night shifts?|rotational shifts?|rotating shifts?|graveyard shift|(?:us|uk) shift|24\s*[x*\/]\s*7 shifts?)\b/i },
  { key: 'unpaid', label: 'unpaid', pattern: /\b(unpaid|no stipend|without (?:any )?stipend|stipend:?\s*(?:nil|none|0)\b|volunteer(?:ing)? (?:role|position))\b/i },
  { key: 'onsite_only', label: 'office only', pattern: /\b(work from office only|wfo only|100% (?:on-?site|in[\s-]office)|no (?:remote|wfh|work from home)|strictly (?:on-?site|from office))\b/i },
  { key: 'relocation', label: 'relocation required', pattern: /\b(relocation (?:is )?(?:required|mandatory)|must (?:be willing to )?relocate|willing(?:ness)? to relocate (?:is )?(?:required|mandatory))\b/i },
  { key: 'travel', label: 'heavy travel', pattern: /\b(extensive travel|frequent travel|travel (?:up to )?(?:[5-9]\d|100)\s*%|field (?:work|visits) daily)\b/i },
  { key: 'sales_targets', label: 'sales targets', pattern: /\b(sales targets?|monthly targets?|cold[\s-]calling|door[\s-]to[\s-]door|commission[\s-]only)\b/i },
];

const DEAL_BREAKERS = RULES.map(({ key, label }) => ({ key, label }));
const VALID_KEYS = new Set(RULES.map((r) => r.key));

const LANGUAGES = ['hindi', 'bengali', 'bangla', 'tamil', 'telugu', 'kannada', 'malayalam', 'marathi', 'gujarati', 'punjabi', 'odia', 'urdu', 'assamese',
  'english', 'german', 'french', 'spanish', 'japanese', 'korean', 'mandarin', 'chinese', 'arabic', 'italian', 'portuguese', 'dutch', 'russian'];
const LANG_ALIASES = { bangla: 'bengali', chinese: 'mandarin' };
const LANG_RE = new RegExp(`\\b(?:fluen(?:t|cy)|proficien(?:t|cy)|native|excellent|strong|good)\\s+(?:in\\s+|command (?:of|over)\\s+)?(?:spoken\\s+(?:and\\s+written\\s+)?|written\\s+(?:and\\s+spoken\\s+)?)?(${LANGUAGES.join('|')})\\b|\\b(${LANGUAGES.join('|')})\\s+(?:language\\s+)?(?:is\\s+)?(?:mandatory|required|must|a must|essential)\\b|\\bmust (?:speak|know)\\s+(${LANGUAGES.join('|')})\\b`, 'gi');

const normLang = (l) => {
  const x = String(l || '').toLowerCase().replace(/\(.*?\)/g, '').trim().split(/[\s,–-]+/)[0];
  return LANG_ALIASES[x] || x;
};

// Languages a posting requires that the person hasn't listed (English is assumed)
function missingLanguages(text, spoken = []) {
  const have = new Set(['english', ...spoken.map(normLang)]);
  const needed = new Set();
  for (const m of String(text || '').matchAll(LANG_RE)) {
    const lang = normLang(m[1] || m[2] || m[3]);
    if (lang && !have.has(lang)) needed.add(lang);
  }
  return [...needed];
}

// { flags: [{ key, label, hard }], languages: [...] } for one job and one person
function checkJob(job, { dealBreakers = [], languages = null } = {}) {
  const text = `${job.title || ''}\n${job.description || ''}`;
  const chosen = new Set(dealBreakers);
  const flags = [];
  for (const rule of RULES) {
    if ((chosen.has(rule.key) || rule.warnAlways) && rule.pattern.test(text)) {
      flags.push({ key: rule.key, label: rule.label, hard: chosen.has(rule.key) });
    }
  }
  const langs = Array.isArray(languages) && languages.length ? missingLanguages(text, languages) : [];
  for (const lang of langs) flags.push({ key: `language:${lang}`, label: `needs ${lang[0].toUpperCase()}${lang.slice(1)}`, hard: false });
  return flags;
}

const cleanDealBreakers = (list) => (Array.isArray(list) ? list : []).filter((k) => VALID_KEYS.has(k));

module.exports = { DEAL_BREAKERS, checkJob, missingLanguages, cleanDealBreakers };
