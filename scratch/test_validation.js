const isValidSearchQuery = (q, resultsCount) => {
  if (!q || typeof q !== 'string') return false;
  
  const trimmed = q.trim();
  
  // 1. Length check: view top_searches requires length between 3 and 25
  if (trimmed.length < 3 || trimmed.length > 25) return false;
  
  // 2. Must return results (gibberish/typos usually return 0 jobs)
  if (resultsCount === undefined || resultsCount === null || resultsCount === 0) return false;
  
  // 3. Characters check: only allow letters, numbers, spaces, and common job/tech chars: #, +, -, /, .
  const validCharsRegex = /^[a-zA-Z0-9\s+#\-\/.]+$/;
  if (!validCharsRegex.test(trimmed)) return false;
  
  // 4. No 3 or more consecutive identical characters (e.g. 'xxx', 'aaa')
  if (/(.)\1\1/.test(trimmed)) return false;
  
  // 5. Avoid common test inputs and gibberish keymashes
  const lowercase = trimmed.toLowerCase();
  const blacklist = ['test', 'testing', 'asdf', 'qwerty', 'zxcv', 'ghjk', 'fake', 'dummy', 'hello', 'world', 'none', 'null', 'undefined'];
  if (blacklist.includes(lowercase)) return false;
  if (lowercase.includes('asdf') || lowercase.includes('qwerty') || lowercase.includes('zxcv') || lowercase.includes('ghjk')) return false;
  
  // 6. Must contain at least one vowel to filter out consonant-only keymashes (e.g., 'sdfgh', 'qwrty')
  // Allow common tech/business acronyms that don't have vowels (like 'AWS', 'QA', 'PR', 'IT', 'JS', 'TS', 'CSS', 'SQL', 'PHP', 'ML', 'HR')
  const hasVowel = /[aeiouy]/i.test(trimmed);
  const allowedAcronyms = ['aws', 'qa', 'pr', 'it', 'js', 'ts', 'css', 'sql', 'php', 'ml', 'hr'];
  if (!hasVowel && !allowedAcronyms.includes(lowercase)) return false;
  
  return true;
};

const testCases = [
  { q: 'React Developer', count: 10, expected: true },
  { q: 'React Developer', count: 0, expected: false },
  { q: 'asdfghj', count: 10, expected: false },
  { q: 'test', count: 5, expected: false },
  { q: 'QA Test Engineer', count: 3, expected: true },
  { q: 'UI/UX Designer', count: 8, expected: true },
  { q: 'C++ Developer', count: 2, expected: true },
  { q: 'C# Developer', count: 4, expected: true },
  { q: 'AWS Architect', count: 6, expected: true },
  { q: 'xyz', count: 1, expected: false },
  { q: 'aaa', count: 1, expected: false },
  { q: 'a', count: 10, expected: false },
  { q: 'QA Engineer', count: 5, expected: true },
  { q: 'ML Engineer', count: 3, expected: true }
];

testCases.forEach(tc => {
  const result = isValidSearchQuery(tc.q, tc.count);
  console.log(`Query: "${tc.q}" (${tc.count} results) -> Got: ${result}, Expected: ${tc.expected} [${result === tc.expected ? 'PASS' : 'FAIL'}]`);
});
