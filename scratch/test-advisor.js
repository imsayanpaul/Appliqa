const http = require('http');

const data = JSON.stringify({
  message: 'How can I stand out for a Tech Lead role?',
  chatHistory: [],
  resumeData: {
    skills: ['React', 'JavaScript'],
    experienceLevel: 'mid'
  }
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/ai/career-advisor',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("RESPONSE:", body);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
