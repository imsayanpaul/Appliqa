const http = require('http');

const clData = JSON.stringify({
  resumeData: {
    skills: ["React", "Node.js", "Javascript"],
    experience: ["Frontend Engineer at ABC Corp (2 years)"],
    experienceLevel: "mid"
  },
  preferences: {
    name: "Sayan Roy",
    skills: ["React", "Node.js"]
  },
  jobTitle: "Software Engineer",
  jobCompany: "Google",
  jobDescription: "We are seeking a mid-level React and Node.js developer to build interactive web applications."
});

const dmData = JSON.stringify({
  resumeData: {
    skills: ["React", "Node.js", "Javascript"]
  },
  preferences: {
    name: "Sayan Roy",
    skills: ["React", "Node.js"]
  },
  jobTitle: "Software Engineer",
  jobCompany: "Google",
  matchReasons: ["Strong React background", "Experienced with Node.js"]
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
  console.log('--- STARTING COVER LETTER & DM CACHE VERIFICATION ---');

  try {
    // ----------------------------------------------------
    // COVER LETTER TESTS
    // ----------------------------------------------------
    console.log('\n[Cover Letter - Test 1] Sending cover-letter request...');
    const clRes1 = await makePostRequest('/api/ai/cover-letter', clData);
    console.log(`Status: ${clRes1.status}`);
    console.log(`Duration: ${clRes1.duration}ms`);
    console.log(`From Cache? ${clRes1.data.fromCache || false}`);
    console.log(`Length: ${clRes1.data.coverLetter?.length || 0} chars`);

    console.log('\n[Cover Letter - Test 2] Sending same request again...');
    const clRes2 = await makePostRequest('/api/ai/cover-letter', clData);
    console.log(`Status: ${clRes2.status}`);
    console.log(`Duration: ${clRes2.duration}ms`);
    console.log(`From Cache? ${clRes2.data.fromCache || false}`);
    console.log(`Length: ${clRes2.data.coverLetter?.length || 0} chars`);

    // ----------------------------------------------------
    // RECRUITER DM TESTS
    // ----------------------------------------------------
    console.log('\n[Recruiter DM - Test 1] Sending recruiter-dm request...');
    const dmRes1 = await makePostRequest('/api/ai/recruiter-dm', dmData);
    console.log(`Status: ${dmRes1.status}`);
    console.log(`Duration: ${dmRes1.duration}ms`);
    console.log(`From Cache? ${dmRes1.data.fromCache || false}`);
    console.log(`DM: "${dmRes1.data.recruiterDM}"`);

    console.log('\n[Recruiter DM - Test 2] Sending same request again...');
    const dmRes2 = await makePostRequest('/api/ai/recruiter-dm', dmData);
    console.log(`Status: ${dmRes2.status}`);
    console.log(`Duration: ${dmRes2.duration}ms`);
    console.log(`From Cache? ${dmRes2.data.fromCache || false}`);
    console.log(`DM: "${dmRes2.data.recruiterDM}"`);

    console.log('\n--- VERIFICATION COMPLETED ---');
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

runTests();
