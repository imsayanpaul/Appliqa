// Sends email through Resend's HTTP API (no SDK). Needs RESEND_API_KEY and
// ALERTS_FROM, e.g. "Appliqa <alerts@appliqa.xyz>" on a domain verified in Resend.
const crypto = require('crypto');

const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.ALERTS_FROM);

async function sendEmail({ to, subject, html, text, headers = {} }) {
  if (!emailEnabled()) throw new Error('Email is not configured (RESEND_API_KEY / ALERTS_FROM)');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ALERTS_FROM, to: [to], subject, html, text, headers }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return res.json();
}

// Signed token for one-click unsubscribe links (no login needed, can't be forged)
const unsubscribeToken = (userId) =>
  crypto.createHmac('sha256', process.env.CRON_SECRET || 'unset').update(`alerts:${userId}`).digest('hex').slice(0, 32);

const validUnsubscribe = (userId, token) => {
  if (!process.env.CRON_SECRET || typeof token !== 'string' || token.length !== 32) return false;
  return crypto.timingSafeEqual(Buffer.from(unsubscribeToken(userId)), Buffer.from(token));
};

module.exports = { sendEmail, emailEnabled, unsubscribeToken, validUnsubscribe };
