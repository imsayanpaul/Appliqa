// node --test: career feed adapters, what gets kept, closing jobs, search wording and merging
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test';

const { keepJob, toPlainText, employmentFrom, mapGreenhouse, mapLever, mapAshby, mapSmartRecruiters } = require('../lib/jobSources');
const { jobsToClose, toRow, NOT_A_JOB } = require('../lib/jobSources/sync');
const { searchQuery, cityNames, mergeJobs, directJobsApply, toJob, isSkillSearch, literallyMentions } = require('../lib/jobSources/store');
const companies = require('../lib/jobSources/companies.json');

test('Greenhouse: escaped HTML becomes readable text', () => {
  const job = mapGreenhouse({
    id: 42, title: 'AI Builder', location: { name: 'Bengaluru' }, absolute_url: 'https://job-boards.greenhouse.io/x/jobs/42',
    first_published: '2026-10-27T02:10:42-04:00', departments: [{ name: 'Engineering' }],
    content: '&lt;p&gt;Razorpay &amp;amp; friends&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Build things&lt;/li&gt;&lt;/ul&gt;',
  }, 'Razorpay');
  assert.equal(job.externalId, '42');
  assert.equal(job.department, 'Engineering');
  assert.equal(job.datePosted, '2026-10-27T06:10:42.000Z');
  assert.match(job.description, /Razorpay & friends/);
  assert.match(job.description, /• Build things/);
  assert.doesNotMatch(job.description, /[<>]|&amp;|&lt;/);
});

test('Lever: description, lists, job type and country', () => {
  const job = mapLever({
    id: 'abc', text: 'Backend Intern', hostedUrl: 'https://jobs.lever.co/m/abc', country: 'IN', workplaceType: 'remote', createdAt: 1757916149833,
    categories: { commitment: 'Full Time Employee', team: 'Platform', allLocations: ['Bangalore, Karnataka', 'Pune'] },
    descriptionPlain: 'About the team', lists: [{ text: 'What you will do', content: '<li>Ship</li>' }], additionalPlain: 'About us',
  }, 'Meesho');
  assert.equal(job.location, 'Bangalore, Karnataka / Pune');
  assert.equal(job.remote, true);
  assert.equal(job.employmentType, 'INTERN');
  assert.match(job.description, /What you will do\n• Ship/);
});

test('Ashby and SmartRecruiters map to the same shape', () => {
  const a = mapAshby({ id: 'u1', title: 'PM', location: 'Delhi', secondaryLocations: [{ location: 'Pune' }], employmentType: 'FullTime', address: { postalAddress: { addressCountry: 'India' } }, publishedAt: '2026-04-17T11:46:39.214+00:00', jobUrl: 'https://jobs.ashbyhq.com/s/u1', descriptionPlain: 'Text', isRemote: false }, 'Sarvam AI');
  assert.deepEqual([a.location, a.country, a.employmentType], ['Delhi / Pune', 'India', 'FULLTIME']);
  const s = mapSmartRecruiters(
    { id: 7, name: 'SDE', location: { city: 'Bangalore', country: 'in', remote: false }, releasedDate: '2026-10-01T00:00:00.000Z', company: { identifier: 'swiggy' }, typeOfEmployment: { label: 'Contract' } },
    'Swiggy', { postingUrl: 'https://jobs.smartrecruiters.com/swiggy/7', jobAd: { sections: { jobDescription: { text: '<p>Build</p>' } } } },
  );
  assert.deepEqual([s.title, s.employmentType, s.description, s.applyLink], ['SDE', 'CONTRACTOR', 'Build', 'https://jobs.smartrecruiters.com/swiggy/7']);
});

test('keeps India and open-remote jobs, not other countries', () => {
  for (const job of [{ location: 'Bengaluru' }, { location: 'Remote - India' }, { location: 'Remote', description: 'Work from anywhere' }, { location: 'Gurugram, Haryana' }, { location: 'Anywhere', country: 'IN' }, { location: 'Delhi', country: 'India' }]) {
    assert.equal(keepJob(job), true, JSON.stringify(job));
  }
  for (const job of [{ location: 'London' }, { location: 'Remote, US' }, { location: 'Remote', country: 'US' }, { location: 'Remote', description: 'Remote within the US' }, { location: 'San Francisco, CA' }, { location: '' }, { location: 'Mumbai', datePosted: '2018-01-17T00:00:00Z' }]) {
    assert.equal(keepJob(job), false, JSON.stringify(job));
  }
});

test('employment type comes from the label, then the title', () => {
  assert.equal(employmentFrom('Full Time Employee', 'SDE'), 'FULLTIME');
  assert.equal(employmentFrom('', 'Summer Internship'), 'INTERN');
  assert.equal(employmentFrom('', 'SDE (Contract)'), 'CONTRACTOR');
  assert.equal(employmentFrom('', 'SDE'), '');
});

test('plain text decodes entities once and keeps real ampersands', () => {
  assert.equal(toPlainText('R&amp;D &#39;team&#39;'), "R&D 'team'");
  assert.equal(toPlainText(''), '');
});

test('jobs leaving a feed are closed, but an empty feed closes nothing', () => {
  assert.deepEqual(jobsToClose(['a', 'b', 'c'], new Set(['a', 'c'])), ['b']);
  assert.deepEqual(jobsToClose(['a', 'b'], new Set()), []);
  assert.deepEqual(jobsToClose([], new Set(['a'])), []);
});

test('rows are reopened on sight and ids are stable per company', () => {
  const row = toRow({ ats: 'lever', slug: 'meesho', name: 'Meesho' }, { externalId: 'x', title: ' SDE ', applyLink: 'https://a', location: 'Pune' }, '2026-11-01T00:00:00.000Z');
  assert.equal(row.id, 'lever:meesho:x');
  assert.equal(row.title, 'SDE');
  assert.equal(row.closed_at, null);
  assert.equal('first_seen_at' in row, false); // set once by the database, never overwritten
});

test('catch-all feed entries are not jobs', () => {
  assert.equal(NOT_A_JOB.test("Join Druva's Talent Community"), true);
  assert.equal(NOT_A_JOB.test('Software Engineer, Talent Platform'), false);
});

test('search wording covers common spellings and strips operators', () => {
  assert.equal(searchQuery('Fullstack Developer'), '(fullstack or "full stack") Developer');
  assert.equal(searchQuery('full-stack'), '(fullstack or "full stack")');
  assert.equal(searchQuery('Node.js & React.js'), '(node or nodejs) react');
  assert.equal(searchQuery('a"b(c)'), 'a b c');
});

test('city names cover aliases and are safe in filters', () => {
  assert.deepEqual(cityNames('Bangalore').sort(), ['bangalore', 'bengaluru']);
  assert.ok(cityNames('Delhi').includes('gurugram'));
  assert.deepEqual(cityNames('Kolkata'), ['kolkata']);
  assert.deepEqual(cityNames('x),remote.eq.true'), ['xremoteeqtrue']);
  assert.deepEqual(cityNames(''), []);
});

test('merge keeps the employer link and drops the job-board copy', () => {
  const direct = [toJob({ id: 'lever:m:1', title: 'SDE II', company: 'Razorpay', apply_link: 'https://direct', remote: false })];
  const others = [{ id: 'j1', title: 'SDE II', company: 'Razorpay Software Private Limited', applyLink: 'https://board' }, { id: 'j2', title: 'QA', company: 'Acme' }];
  const merged = mergeJobs(direct, others);
  assert.deepEqual(merged.map((j) => j.id), ['j2', 'lever:m:1']); // alternates, starting with JSearch
  assert.equal(merged[1].publisher, 'Razorpay careers');
});

test('only single skills search job descriptions', () => {
  assert.equal(isSkillSearch('python'), true);
  assert.equal(isSkillSearch('data analyst'), false);
  assert.equal(isSkillSearch('intern'), false);
  assert.equal(isSkillSearch('Developers'), false);
});

test('stemmed and symbol searches must really appear', () => {
  const row = (title, description = '') => ({ title, company: 'Acme', description });
  assert.equal(literallyMentions(row('Internal Audit'), 'intern'), false);
  assert.equal(literallyMentions(row('Summer Intern'), 'intern'), true);
  assert.equal(literallyMentions(row('Backend Internship'), 'intern'), true);
  assert.equal(literallyMentions(row('SDE', 'Plan C for growth'), 'C++'), false);
  assert.equal(literallyMentions(row('SDE', 'Strong C++ skills'), 'C++'), true);
  assert.equal(literallyMentions(row('SDE', 'Node and React'), 'node.js'), true);
  assert.equal(literallyMentions(row('SDE'), 'python'), true);
  assert.equal(literallyMentions(row('Internal Software Lead'), 'software intern'), false);
  assert.equal(literallyMentions(row('Software Intern'), 'software intern'), true);
});

test('feeds apply to India and to searches with no country', () => {
  assert.equal(directJobsApply('India'), true);
  assert.equal(directJobsApply(''), true);
  assert.equal(directJobsApply('Germany'), false);
});

test('the company list is valid and has no duplicates', () => {
  const keys = companies.map((c) => `${c.ats}:${c.slug}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const c of companies) {
    assert.ok(['greenhouse', 'lever', 'ashby', 'smartrecruiters'].includes(c.ats), c.ats);
    assert.ok(c.name && c.slug);
  }
});
