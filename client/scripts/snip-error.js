import fs from 'node:fs';
const s = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const i = s.indexOf('className="error"');
console.log(s.slice(i - 80, i + 180));
