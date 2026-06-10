const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
};

const files = walk(path.join(__dirname, '../client/src'));
const regex = /indigo|purple|violet|cyan|bg-blue-|text-blue-|border-blue-|text-indigo-|bg-indigo-|border-indigo-|text-purple-|bg-purple-|border-purple-/i;

files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (regex.test(line)) {
      console.log(`${path.relative(path.join(__dirname, '..'), filePath)}:${index + 1}: ${line.trim()}`);
    }
  });
});
