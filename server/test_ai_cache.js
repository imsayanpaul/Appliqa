const http = require('http');

const data = JSON.stringify({
  resumeData: {
    skills: ["React", "Node.js", "Javascript"],
    experienceLevel: "mid"
  },
  preferences: {
    desiredRole: "Fullstack Developer"
  },
  jobTitle: "Software Engineer",
  jobDescription: "We are seeking a mid-level React and Node.js developer to build interactive web applications."
});

function makePostRequest(path, payload) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const parsed = JSON.parse(body);
          resolve({ duration, status: res.statusCode, data: parsed });
        } catch (e) {
          reject(new Error(`Failed to parse: ${body.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AI CACHE VERIFICATION ---');
  const path = '/api/ai/match-score';

  try {
    // Test 1: First Request (expected Gemini API hit / cache miss)
    console.log('\n[Test 1] Sending match-score request (expected cache miss)...');
    const res1 = await makePostRequest(path, data);
    console.log(`Status: ${res1.status}`);
    console.log(`Duration: ${res1.duration}ms`);
    console.log(`From Cache? ${res1.data.fromCache || false}`);
    console.log(`Score: ${res1.data.match?.score || 0}%`);

    // Test 2: Second Request (expected Supabase AI cache hit)
    console.log('\n[Test 2] Sending same request again (expected cache hit)...');
    const res2 = await makePostRequest(path, data);
    console.log(`Status: ${res2.status}`);
    console.log(`Duration: ${res2.duration}ms`);
    console.log(`From Cache? ${res2.data.fromCache || false}`);
    console.log(`Score: ${res2.data.match?.score || 0}%`);

    console.log('\n--- VERIFICATION COMPLETED ---');
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

runTests();
