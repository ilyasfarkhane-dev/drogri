import {db} from './db.js';
import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
try{
const sql=await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8');for(const s of sql.split(';').filter(s=>s.trim()))await db.query(s);
try{await db.query("ALTER TABLE products ADD COLUMN image VARCHAR(255) DEFAULT ''");}catch{}
await db.query("UPDATE products SET image=CASE category WHEN 'Peinture' THEN '/products/peinture.jpg' WHEN 'Outillage' THEN '/products/outillage.jpg' WHEN 'Plomberie' THEN '/products/plomberie.jpg' WHEN 'Électricité' THEN '/products/electricite.jpg' WHEN 'Nettoyage' THEN '/products/nettoyage.jpg' WHEN 'Quincaillerie' THEN '/products/quincaillerie.jpg' WHEN 'Maçonnerie' THEN '/products/maconnerie.jpg' WHEN 'Jardin' THEN '/products/jardin.jpg' ELSE '/products/default.jpg' END WHERE image IS NULL OR image=''");
const [[u]]=await db.query('SELECT COUNT(*) n FROM users');
if(!u.n){if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<10)throw Error('Set ADMIN_PASSWORD (10 characters minimum)');await db.query('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',['Administrateur',process.env.ADMIN_EMAIL||'admin@drogopro.local',await bcrypt.hash(process.env.ADMIN_PASSWORD,12),'owner']);}
const [[p]]=await db.query('SELECT COUNT(*) n FROM products');
if(!p.n){for(const r of [
['PEI-001','Peinture satin blanc · 5 L','Peinture','Atlas','pièce',165,225,24,8,4],['OUT-001','Perceuse à percussion 650 W','Outillage','Bosch','pièce',420,590,7,3,1],['PLO-001','Coude PVC Ø 40 mm','Plomberie','Nicoll','pièce',3.5,7,120,30,12],['ELE-001','Câble électrique 2,5 mm²','Électricité','Nexans','mètre',4.2,7.5,250,50,100],['NET-001','Détergent multi-usage · 1 L','Nettoyage','ProClean','pièce',12,22,6,10,12],['QUI-001','Vis universelles 4 × 40','Quincaillerie','Fischer','boîte',18,35,32,8,10],['OUT-002','Rouleau peinture 180 mm','Outillage','Total','pièce',15,29,18,5,6],['PLO-002','Tuyau flexible Ø 16 mm','Plomberie','Generic','mètre',6,11,80,20,50]])await db.query('INSERT INTO products(sku,name,category,brand,unit,cost,price,stock,min_stock,pack_size) VALUES(?,?,?,?,?,?,?,?,?,?)',r);
await db.query("INSERT INTO customers(name,phone,address,credit_limit) VALUES ('Ahmed El Amrani','0612345678','Casablanca',5000),('Société Al Binaa','0522000000','Casablanca',20000)");await db.query("INSERT INTO suppliers(name,phone,address) VALUES ('Atlas Distribution','0522112233','Casablanca'),('Comptoir Technique','0522445566','Rabat')");}
console.log('Database ready. Sample products/contacts added only if empty.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.end();}
