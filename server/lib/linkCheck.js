// Checks whether a job's apply page still looks open. The server fetches a URL
// the client sends, so it only talks to public hosts: every address a host
// resolves to (including after redirects) is checked before connecting.
const http = require('http');
const https = require('https');
const dns = require('dns');
const net = require('net');

const MAX_BYTES = 400 * 1024;
const TIMEOUT_MS = 7000;
const MAX_REDIRECTS = 4;

// Wording job boards and ATS pages use once a posting is gone
const CLOSED_TEXT = new RegExp([
  'no longer accepting applications',
  'no longer accepting',
  'this job (?:is|has) (?:no longer available|expired|been (?:filled|closed|removed))',
  'this (?:position|role|vacancy|job posting|posting|requisition) (?:is|has) (?:no longer|been (?:filled|closed))',
  'job (?:has )?expired',
  'job (?:is )?no longer (?:available|active|open)',
  'position (?:has been|is) filled',
  'applications? (?:are |is )?(?:now )?closed',
  'the job you are looking for (?:is no longer|could not be found|does not exist)',
  'job not found',
].join('|'), 'i');

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

// dns.lookup replacement that refuses private and local addresses
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family }];
    if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
      return callback(new Error('Blocked address'));
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      lookup: safeLookup,
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size <= MAX_BYTES) chunks.push(chunk);
        else res.destroy();
      });
      const done = () => resolve({ status: res.statusCode, location: res.headers.location, body: Buffer.concat(chunks).toString('utf8') });
      res.on('end', done);
      res.on('close', done);
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Timed out')));
    req.on('error', reject);
  });
}

const allowedUrl = (raw) => {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  if (url.port && !['80', '443'].includes(url.port)) return null;
  if (net.isIP(url.hostname) || /^localhost$|\.local$|\.internal$/i.test(url.hostname)) return null;
  return url;
};

// "closed" only when the page clearly says so; anything unclear is "unknown"
async function checkJobLink(raw) {
  let url = allowedUrl(raw);
  if (!url) return { status: 'unknown', reason: 'unsupported link' };
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let page;
    try {
      page = await fetchPage(url);
    } catch {
      return { status: 'unknown', reason: 'could not reach the page' };
    }
    if (page.status >= 300 && page.status < 400 && page.location) {
      const next = new URL(page.location, url);
      // Greenhouse sends a removed job to the company board with ?error=true
      if (/greenhouse\.io$/i.test(next.hostname) && next.searchParams.get('error') === 'true') {
        return { status: 'closed', reason: 'the job board says this job is gone' };
      }
      url = allowedUrl(next.toString());
      if (!url) return { status: 'unknown', reason: 'unsupported redirect' };
      continue;
    }
    if (page.status === 404 || page.status === 410) return { status: 'closed', reason: 'the page no longer exists' };
    if (page.status >= 400) return { status: 'unknown', reason: `the site answered ${page.status}` };
    const text = page.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    const hit = text.match(CLOSED_TEXT);
    if (hit) return { status: 'closed', reason: `the page says “${hit[0].trim().toLowerCase()}”` };
    return { status: 'open' };
  }
  return { status: 'unknown', reason: 'too many redirects' };
}

module.exports = { checkJobLink, isPrivateAddress, allowedUrl };
