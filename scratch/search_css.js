const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../client/src/index.css');
const css = fs.readFileSync(cssPath, 'utf8');
const lines = css.split('\n');

lines.forEach((line, index) => {
  if (line.includes('--accent')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
