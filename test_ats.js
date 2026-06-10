async function testATS() {
  try {
    const res = await fetch('http://localhost:3001/api/ai/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeText: "Experienced Software Engineer with 5 years in React and Node.js. Built scalable APIs.",
        jobTitle: "Frontend Developer",
        jobDescription: "We are looking for a Frontend Developer with React and TypeScript experience. Must know CSS and HTML. 3+ years experience required."
      })
    });
    const data = await res.text();
    console.log("STATUS:", res.status);
    console.log(data);
  } catch (err) {
    console.log("ERROR:", err.message);
  }
}

testATS();
