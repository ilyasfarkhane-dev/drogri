import fs from 'node:fs';
const p = new URL('../src/i18n.js', import.meta.url);
let s = fs.readFileSync(p, 'utf8');
// Fix Arabic dash_title if broken
s = s.replace(/dash_title:\s*'تجارتك في لمحة[’']\s*;/, "dash_title: 'تجارتك في لمحة',");
// Find lines where a string uses a curly quote as closer before comma/semicolon
s = s.replace(/: '([^'\n]*?)[’‘](,|;)/g, (m, body, end) => {
  // only fix if this looks like a broken closer (no ASCII quote in body ending)
  return `: '${body}'${end}`;
});
fs.writeFileSync(p, s);
try {
  await import(p.href + '?t=' + Date.now());
  console.log('i18n loads OK');
} catch (e) {
  console.error('still broken:', e.message);
}
