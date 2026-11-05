import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/products');
fs.mkdirSync(dir, {recursive: true});

const cats = {
  peinture: ['#c9b896', '#7d8f6a', '#efe8d8', 'Peinture'],
  outillage: ['#8a9499', '#3d5a4c', '#e8ecee', 'Outillage'],
  plomberie: ['#6f93a8', '#2f5f73', '#e4eef3', 'Plomberie'],
  electricite: ['#d2b35c', '#6d5a24', '#f7f0d8', 'Electricite'],
  nettoyage: ['#7eb0a0', '#2f6b5c', '#e5f4ef', 'Nettoyage'],
  quincaillerie: ['#b08a5a', '#6a4e2c', '#f3eadc', 'Quincaillerie'],
  maconnerie: ['#a39282', '#5c4d41', '#efe8e1', 'Maconnerie'],
  jardin: ['#79a56a', '#355f2f', '#e8f3e3', 'Jardin'],
  default: ['#9aa89a', '#45604c', '#eef3ea', 'Produit'],
};

const shapes = (accent, deep) => [
  `<rect x="36" y="44" width="88" height="72" rx="14" fill="${accent}" opacity="0.9"/><rect x="52" y="30" width="56" height="22" rx="8" fill="${deep}"/>`,
  `<circle cx="80" cy="78" r="40" fill="${accent}"/><rect x="62" y="48" width="36" height="70" rx="10" fill="${deep}" opacity="0.85"/>`,
  `<path d="M40 110 L80 36 L120 110 Z" fill="${accent}"/><circle cx="80" cy="86" r="16" fill="${deep}"/>`,
];

for (const [key, [accent, deep, bg, label]] of Object.entries(cats)) {
  shapes(accent, deep).forEach((shape, variant) => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 160 120">
  <rect width="160" height="120" fill="${bg}"/>
  <rect x="10" y="10" width="140" height="100" rx="18" fill="#ffffff" opacity="0.55"/>
  ${shape}
  <text x="80" y="108" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="10" font-weight="700" fill="${deep}">${label}</text>
</svg>`;
    fs.writeFileSync(path.join(dir, `${key}-${variant}.svg`), svg);
  });
}

console.log('wrote', fs.readdirSync(dir).length, 'images to', dir);
