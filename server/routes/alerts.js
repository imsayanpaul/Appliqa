// Daily job alert emails. A scheduled GitHub Action calls POST /api/alerts/run
// with the CRON_SECRET header once a day; each opted-in person gets up to six
// jobs from their "for you" feed that they have never been shown before.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { sendEmail, emailEnabled, unsubscribeToken, validUnsubscribe } = require('../lib/email');
const { buildFeed } = require('./jobs');

const APP_URL = (process.env.APP_URL || 'https://appliqa.xyz').replace(/\/+$/, '');
const API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
const PER_EMAIL = 6;
const MIN_GAP_MS = 20 * 60 * 60 * 1000;
const MAX_PER_RUN = 300;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeLink = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : APP_URL);

const secretOk = (req) => {
  const given = String(req.get('x-cron-secret') || '');
  const want = String(process.env.CRON_SECRET || '');
  return want.length >= 16 && given.length === want.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want));
};

function alertEmail({ name, jobs, meta, unsubscribeUrl }) {
  const first = (name || '').trim().split(/\s+/)[0];
  const what = [meta.roles?.[0], meta.location].filter(Boolean).join(' · ');
  const subject = `${jobs.length} new ${meta.roles?.[0] || ''} job${jobs.length === 1 ? '' : 's'} for you`.replace(/\s+/g, ' ');
  const rows = jobs.map((j) => {
    const skills = j.matchedSkills?.length ? `Matches ${j.matchedSkills.slice(0, 4).map(esc).join(', ')}` : '';
    const warn = j.flags?.length ? `<div style="color:#B45309;font-size:13px;margin-top:4px">Heads up: ${j.flags.map((f) => esc(f.label)).join(', ')}</div>` : '';
    return `<tr><td style="padding:16px 0;border-top:1px solid #D8D4CC">
      <a href="${esc(safeLink(j.applyLink))}" style="font-size:17px;font-weight:600;color:#171717;text-decoration:none">${esc(j.title)}</a>
      <div style="font-size:14px;color:#4A4540;margin-top:2px">${esc(j.company)}${j.location ? ` · ${esc(j.location)}` : ''}</div>
      ${skills ? `<div style="font-size:13px;color:#4A4540;margin-top:6px">${skills}</div>` : ''}${warn}
    </td></tr>`;
  }).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#F7F5F2;font-family:Arial,Helvetica,sans-serif;color:#171717">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #D8D4CC">
    <tr><td style="padding:24px 24px 8px"><div style="font-size:22px;font-weight:800">Appliqa<span style="color:#CA3C0A">.</span></div>
      <p style="font-size:16px;margin:16px 0 4px">${first ? `Hi ${esc(first)}, here` : 'Here'} ${jobs.length === 1 ? 'is a new job' : `are ${jobs.length} new jobs`} picked from your profile.</p>
      ${what ? `<p style="font-size:13px;color:#6F6A65;margin:0">${esc(what.toLowerCase())}</p>` : ''}</td></tr>
    <tr><td style="padding:8px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
    <tr><td style="padding:16px 24px 24px"><a href="${esc(APP_URL)}" style="display:inline-block;background:#CA3C0A;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px">See all your jobs on Appliqa</a></td></tr>
  </table>
  <p style="font-size:12px;color:#6F6A65;margin:16px 0 0">You get this because daily job alerts are on in your Appliqa profile. <a href="${esc(unsubscribeUrl)}" style="color:#6F6A65">Turn them off</a>.</p>
  </td></tr></table></body></html>`;
  const text = `${first ? `Hi ${first}, here` : 'Here'} are new jobs picked from your profile:\n\n${jobs.map((j) => `${j.title} - ${j.company}\n${safeLink(j.applyLink)}`).join('\n\n')}\n\nSee all: ${APP_URL}\nTurn off these emails: ${unsubscribeUrl}`;
  return { subject, html, text };
}

router.post('/run', async (req, res) => {
  if (!secretOk(req)) return res.status(404).json({ error: 'Not found' });
  if (!emailEnabled()) return res.status(503).json({ error: 'Email is not configured' });

  const since = new Date(Date.now() - MIN_GAP_MS).toISOString();
  const { data: people, error } = await supabase.from('profiles')
    .select('id, name, email, alerts_last_sent_at')
    .eq('job_alerts', true)
    .or(`alerts_last_sent_at.is.null,alerts_last_sent_at.lt.${since}`)
    .limit(MAX_PER_RUN);
  if (error) return res.status(500).json({ error: error.message });

  const summary = { candidates: people?.length || 0, sent: 0, nothingNew: 0, noCountry: 0, failed: 0 };
  for (const person of people || []) {
    if (!person.email) continue;
    try {
      const { jobs, meta } = await buildFeed(person.id, { onlyUnseen: true, size: PER_EMAIL, remember: false });
      if (meta?.needsCountry) {
        summary.noCountry += 1;
        continue;
      }
      if (!jobs.length) {
        summary.nothingNew += 1;
        continue;
      }
      const unsubscribeUrl = `${API_URL || APP_URL}/api/alerts/unsubscribe?u=${encodeURIComponent(person.id)}&t=${unsubscribeToken(person.id)}`;
      const mail = alertEmail({ name: person.name, jobs, meta, unsubscribeUrl });
      await sendEmail({
        to: person.email,
        ...mail,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      // Emailed jobs count as seen, so tomorrow's email only has newer ones
      await require('./jobs').recordSeen(person.id, jobs);
      await supabase.from('profiles').update({ alerts_last_sent_at: new Date().toISOString() }).eq('id', person.id);
      summary.sent += 1;
    } catch (err) {
      summary.failed += 1;
      console.warn(`[Alerts] ${person.id}: ${err.message}`);
    }
  }
  console.log('[Alerts] run:', JSON.stringify(summary));
  res.json({ success: true, ...summary });
});

async function unsubscribe(req, res) {
  const userId = String(req.query.u || '');
  const ok = /^[0-9a-f-]{36}$/i.test(userId) && validUnsubscribe(userId, String(req.query.t || ''));
  if (ok) await supabase.from('profiles').update({ job_alerts: false }).eq('id', userId);
  res.status(ok ? 200 : 400).type('html').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Appliqa alerts</title>
<body style="font-family:Arial,sans-serif;background:#F7F5F2;color:#171717;padding:48px 16px;text-align:center">
<h1 style="font-size:22px">${ok ? 'Job alerts are off' : 'This link is not valid'}</h1>
<p>${ok ? 'You won’t get daily job emails any more. You can turn them back on in your profile.' : 'Turn alerts off from your Appliqa profile instead.'}</p>
<p><a href="${esc(APP_URL)}/profile" style="color:#CA3C0A">Open Appliqa</a></p></body>`);
}
// GET from the email link; POST from mail apps' one-click unsubscribe button
router.get('/unsubscribe', unsubscribe);
router.post('/unsubscribe', unsubscribe);

module.exports = router;
module.exports.alertEmail = alertEmail;
