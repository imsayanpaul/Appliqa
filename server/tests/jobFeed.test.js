// node --test: the "for you" feed's matching rules and the link checker's safety rules
const test = require('node:test');
const assert = require('node:assert/strict');
const { feedRoles, feedFilters, profileSkills, matchSkills, rankScore, sameJobKey } = require('../lib/jobFeed');
const { isPrivateAddress, allowedUrl } = require('../lib/linkCheck');

test('roles: target role first, then resume roles, deduped, at most three', () => {
  const roles = feedRoles({
    desired_role: 'Full Stack Developer',
    resume_suggested_roles: ['full stack developer', 'React Developer', 'Backend Engineer', 'Data Analyst'],
  });
  assert.deepEqual(roles, ['Full Stack Developer', 'React Developer', 'Backend Engineer']);
  assert.deepEqual(feedRoles({}), []);
});

test('filters: entry level becomes fresher, job type maps to JSearch', () => {
  assert.deepEqual(feedFilters({ experience_level: 'entry', job_type: 'intern' }), { experience: 'fresher', employmentType: 'INTERN' });
  assert.deepEqual(feedFilters({ experience_level: 'mid', job_type: 'fulltime' }), { experience: '', employmentType: '' });
  assert.equal(feedFilters({ resume_experience_level: 'Entry Level' }).experience, 'fresher');
});

test('skills: whole words only, symbols and .js variants handled', () => {
  const skills = profileSkills({ skills: ['React', 'Node.js', 'Java'], resume_skills: ['react', 'C++', 'CI/CD', '.NET', 'Go'] });
  assert.deepEqual(skills, ['React', 'Node.js', 'Java', 'C++', 'CI/CD', '.NET', 'Go']);
  const job = { title: 'Junior Developer', description: 'Work with NodeJS, React and JavaScript. C++ a plus. CI/CD pipelines. Good communication.' };
  assert.deepEqual(matchSkills(job, skills), ['React', 'Node.js', 'C++', 'CI/CD']);
});

test('ranking: skill overlap and a matching title beat an unrelated fresh job', () => {
  const now = new Date().toISOString();
  const roles = ['React Developer'];
  const fit = { title: 'React Developer', datePosted: new Date(Date.now() - 5 * 86400000).toISOString() };
  const unrelated = { title: 'Sales Executive', datePosted: now };
  assert.ok(rankScore(fit, { matched: ['React', 'JavaScript', 'Redux'], roles, isNew: false }) > rankScore(unrelated, { matched: [], roles, isNew: true }));
});

test('same posting from two boards is one job', () => {
  assert.equal(sameJobKey({ company: 'Acme  Ltd', title: 'React Developer ' }), sameJobKey({ company: 'acme ltd', title: 'react developer' }));
});

test('link checker refuses private addresses and odd URLs', () => {
  for (const ip of ['10.0.0.1', '127.0.0.1', '172.16.5.4', '192.168.1.1', '169.254.169.254', '::1', '::ffff:10.0.0.1', 'fd00::1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '104.16.1.1', '2606:4700::1']) assert.equal(isPrivateAddress(ip), false, ip);
  for (const url of ['http://localhost/', 'http://127.0.0.1/', 'https://a.com:8443/', 'ftp://a.com/', 'https://user:pw@a.com/', 'not a url']) {
    assert.equal(allowedUrl(url), null, url);
  }
  assert.ok(allowedUrl('https://boards.greenhouse.io/acme/jobs/123'));
});
