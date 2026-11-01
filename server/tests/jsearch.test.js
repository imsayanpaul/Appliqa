// node --test: moving to the backup job search once RapidAPI's quota runs out
const test = require('node:test');
const assert = require('node:assert/strict');

const { fetchJSearch, jobsIn } = require('../lib/jsearch');

const params = new URLSearchParams({ query: 'developer', page: '2' });

function withFetch(statuses, t) {
  const calls = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    calls.push({ url, headers: options.headers });
    return { status: statuses[calls.length - 1] };
  });
  return calls;
}

function withBackupKey(value, t) {
  const before = process.env.OPENWEBNINJA_API_KEY;
  if (value) process.env.OPENWEBNINJA_API_KEY = value;
  else delete process.env.OPENWEBNINJA_API_KEY;
  t.after(() => {
    if (before === undefined) delete process.env.OPENWEBNINJA_API_KEY;
    else process.env.OPENWEBNINJA_API_KEY = before;
  });
}

test('the backup is not touched while RapidAPI works', async (t) => {
  withBackupKey('backup', t);
  const calls = withFetch([200], t);
  assert.equal((await fetchJSearch(params)).status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /rapidapi\.com/);
});

for (const status of [429, 403]) {
  test(`a ${status} from RapidAPI moves to the backup with the same search`, async (t) => {
    withBackupKey('backup', t);
    const calls = withFetch([status, 200], t);
    assert.equal((await fetchJSearch(params)).status, 200);
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /openwebninja\.com.*query=developer&page=2/);
    assert.equal(calls[1].headers['X-API-Key'], 'backup');
  });
}

test('other errors do not spend the backup', async (t) => {
  withBackupKey('backup', t);
  const calls = withFetch([500], t);
  assert.equal((await fetchJSearch(params)).status, 500);
  assert.equal(calls.length, 1);
});

test('with no backup key the quota error comes through', async (t) => {
  withBackupKey('', t);
  const calls = withFetch([429], t);
  assert.equal((await fetchJSearch(params)).status, 429);
  assert.equal(calls.length, 1);
});

test('jobs are found in both response shapes', () => {
  assert.deepEqual(jobsIn({ data: [{ job_id: 'a' }] }), [{ job_id: 'a' }]);
  assert.deepEqual(jobsIn({ data: { jobs: [{ job_id: 'b' }], cursor: 'x' } }), [{ job_id: 'b' }]);
  assert.deepEqual(jobsIn({ data: {} }), []);
  assert.deepEqual(jobsIn({}), []);
});
