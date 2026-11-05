import fs from 'node:fs';
const s = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const start = s.indexOf('modal_statement');
console.log(s.slice(start - 40, start + 1600));
