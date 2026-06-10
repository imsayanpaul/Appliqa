const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    // Skip node_modules, .git, .stitch, dist, build, .env files, etc.
    if (['node_modules', '.git', '.stitch', 'dist', 'build', '.env', '.agents', '.system_generated'].includes(file)) {
      return;
    }
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
};

const rootDir = path.join(__dirname, '..');
const files = walk(rootDir);
const regex = /jobpulse/i;

console.log('Searching for "jobpulse" (case-insensitive)...');
files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let matched = false;
  lines.forEach((line, index) => {
    if (regex.test(line)) {
      console.log(`${path.relative(rootDir, filePath)}:${index + 1}: ${line.trim()}`);
      matched = true;
    }
  });
});
