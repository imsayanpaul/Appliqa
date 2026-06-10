const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const data = JSON.parse(body);
          resolve({ duration, status: res.statusCode, data });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body.substring(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  const url = 'http://localhost:3001/api/jobs/search?query=Node+Developer+Austin';
  console.log('--- STARTING CACHE VERIFICATION ---');
  
  try {
    // Test 1: First Request (Cache Miss / Live Fetch)
    console.log('\n[Test 1] Sending search request (expected cache miss/live API hit)...');
    const res1 = await makeRequest(url);
    console.log(`Status: ${res1.status}`);
    console.log(`Duration: ${res1.duration}ms`);
    console.log(`From Memory Cache? ${res1.data.fromMemory || false}`);
    console.log(`From Database Cache? ${res1.data.fromDatabase || false}`);
    console.log(`Jobs Returned: ${res1.data.jobs?.length || 0}`);

    // Test 2: Second Request (In-Memory Cache Hit)
    console.log('\n[Test 2] Sending same search request (expected in-memory cache hit)...');
    const res2 = await makeRequest(url);
    console.log(`Status: ${res2.status}`);
    console.log(`Duration: ${res2.duration}ms`);
    console.log(`From Memory Cache? ${res2.data.fromMemory || false}`);
    console.log(`From Database Cache? ${res2.data.fromDatabase || false}`);
    console.log(`Jobs Returned: ${res2.data.jobs?.length || 0}`);
    
    console.log('\n--- VERIFICATION COMPLETED ---');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();
