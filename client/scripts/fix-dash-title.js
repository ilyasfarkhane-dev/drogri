import fs from 'node:fs';
const p = new URL('../src/i18n.js', import.meta.url);
const lines = fs.readFileSync(p, 'utf8').split(/\n/);
lines[332] = "    dash_title: 'تجارتك في لمحة واحدة',";
fs.writeFileSync(p, lines.join('\n'));
await import(p.href + '?t=' + Date.now());
console.log('fixed and loaded');
