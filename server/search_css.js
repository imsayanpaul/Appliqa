const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../client/src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const lines = cssContent.split('\n');
console.log('--- Search Results for body, html, or overflow ---');

lines.forEach((line, index) => {
  const lineNum = index + 1;
  if (line.includes('body') || line.includes('html') || line.includes('overflow')) {
    console.log(`${lineNum}: ${line.trim()}`);
  }
});
