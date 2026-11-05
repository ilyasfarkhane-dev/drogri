import fs from 'node:fs';
const s = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const i = s.indexOf('function form(type,item)');
console.log(s.slice(i, i + 140));
const j = s.indexOf('<form onSubmit={e=>{e.preventDefault();act(async()=>{await api(modal.type');
console.log('---FORM---');
console.log(s.slice(j, j + 1200));
