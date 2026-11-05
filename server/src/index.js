import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import {z} from 'zod';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {db,tx} from './db.js';
import {money,totals} from './rules.js';
const app=express();const secret=process.env.JWT_SECRET;if(!secret||secret.length<32)throw Error('JWT_SECRET must contain at least 32 characters');
const uploadsRoot=fileURLToPath(new URL('../uploads',import.meta.url));
const productUploads=path.join(uploadsRoot,'products');
fs.mkdirSync(productUploads,{recursive:true});
const uploadImage=multer({
  storage:multer.diskStorage({
    destination:productUploads,
    filename:(req,file,cb)=>{
      const ext=path.extname(file.originalname||'').toLowerCase().replace(/[^.a-z0-9]/g,'')||'.jpg';
      const safe=['.jpg','.jpeg','.png','.webp','.gif'].includes(ext)?ext:'.jpg';
      cb(null,`p-${Date.now()}-${Math.random().toString(36).slice(2,8)}${safe}`);
    }
  }),
  limits:{fileSize:3*1024*1024},
  fileFilter:(req,file,cb)=>{
    if(!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))return cb(Error('Image JPG, PNG, WEBP ou GIF uniquement'));
    cb(null,true);
  }
}).single('image');
app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'1mb'}));app.use('/uploads',express.static(uploadsRoot));app.use('/api',rateLimit({windowMs:60000,limit:300}));
app.get('/api/health',async(req,res)=>{await db.query('SELECT 1');res.json({ok:true});});
app.post('/api/login',rateLimit({windowMs:900000,limit:20}),async(req,res)=>{const {email,password}=z.object({email:z.string().email(),password:z.string()}).parse(req.body);const [[u]]=await db.query('SELECT * FROM users WHERE email=?',[email]);if(!u||!await bcrypt.compare(password,u.password))return res.status(401).json({error:'Identifiants incorrects'});res.json({token:jwt.sign({id:u.id},secret,{expiresIn:'8h'}),user:{id:u.id,name:u.name,role:u.role}});});
app.use('/api',async(req,res,next)=>{try{const payload=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),secret);const [[u]]=await db.query('SELECT id,name,role FROM users WHERE id=?',[payload.id]);if(!u)throw Error();req.user=u;next();}catch{res.status(401).json({error:'Session expirée'});}});
const permit=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Accès refusé'});
const owner=permit('owner');const sales=permit('owner','cashier');const stock=permit('owner','stock');
const num=z.coerce.number().finite().nonnegative().max(999999999).refine(n=>Math.abs(n*100-Math.round(n*100))<0.00001,'Deux décimales maximum');const pos=z.coerce.number().finite().positive();
const quantity=pos.max(999999999).refine(n=>Math.abs(n*1000-Math.round(n*1000))<0.00001,'Trois décimales maximum');const amount=num.refine(n=>n>0,'Montant strictement positif');
app.get('/api/me',(req,res)=>res.json(req.user));
app.get('/api/products',async(req,res)=>{const [r]=await db.query('SELECT * FROM products WHERE active=1 ORDER BY name');res.json(r.map(p=>req.user.role==='owner'?p:({...p,cost:undefined})));});
const product=z.object({sku:z.string().min(1).max(80),name:z.string().min(1).max(190),category:z.string().min(1).max(80),brand:z.string().max(80).default(''),unit:z.string().min(1).max(30),barcode:z.string().max(80).default(''),image:z.string().max(255).default(''),cost:num,price:num,min_stock:z.coerce.number().finite().nonnegative(),pack_size:quantity});
app.post('/api/products',owner,async(req,res)=>{const p=product.parse(req.body);const [r]=await db.query('INSERT INTO products SET ?',p);res.json({id:r.insertId});});
app.put('/api/products/:id',owner,async(req,res)=>{await db.query('UPDATE products SET ? WHERE id=?',[product.parse(req.body),req.params.id]);res.json({ok:true});});
app.post('/api/upload/product-image',owner,(req,res)=>{uploadImage(req,res,err=>{if(err)return res.status(400).json({error:err.message||'Échec du téléversement'});if(!req.file)return res.status(400).json({error:'Choisissez une image'});res.json({url:'/uploads/products/'+req.file.filename});});});
app.delete('/api/products/:id',owner,async(req,res)=>{await db.query('UPDATE products SET active=0 WHERE id=?',[req.params.id]);res.json({ok:true});});
app.post('/api/stock',stock,async(req,res)=>{const p=z.object({product_id:pos,qty:z.coerce.number().finite().refine(n=>n!==0&&Math.abs(n*1000-Math.round(n*1000))<0.00001,'Quantité non nulle, 3 décimales maximum'),reason:z.string().trim().min(3,'Le motif doit contenir au moins 3 caractères').max(190)}).parse(req.body);await tx(async c=>{const [[r]]=await c.query('SELECT stock FROM products WHERE id=? AND active=1 FOR UPDATE',[p.product_id]);if(!r||Number(r.stock)+p.qty<0)throw Error('Stock insuffisant');await c.query('UPDATE products SET stock=stock+? WHERE id=?',[p.qty,p.product_id]);await c.query('INSERT INTO movements SET ?',{...p,user_id:req.user.id});});res.json({ok:true});});
app.get('/api/movements',stock,async(req,res)=>{const [r]=await db.query('SELECT m.*,p.name FROM movements m JOIN products p ON p.id=m.product_id ORDER BY m.id DESC LIMIT 500');res.json(r);});
for(const table of ['customers','suppliers']){
app.get('/api/'+table,async(req,res)=>{if(table==='suppliers'&&req.user.role==='cashier')return res.status(403).json({error:'Accès refusé'});const [r]=await db.query(`SELECT * FROM ${table} ORDER BY name`);res.json(r);});
const shape=z.object({name:z.string().min(1).max(190),phone:z.string().max(40).default(''),address:z.string().default(''),...(table==='customers'?{credit_limit:num}:{})});
app.post('/api/'+table,table==='customers'?sales:owner,async(req,res)=>{const [r]=await db.query(`INSERT INTO ${table} SET ?`,shape.parse(req.body));res.json({id:r.insertId});});
app.put('/api/'+table+'/:id',table==='customers'?sales:owner,async(req,res)=>{await db.query(`UPDATE ${table} SET ? WHERE id=?`,[shape.parse(req.body),req.params.id]);res.json({ok:true});});}
const docSchema=z.object({kind:z.enum(['sale','quote','purchase']),customer_id:pos.nullable().optional(),supplier_id:pos.nullable().optional(),discount:num.default(0),paid:num.default(0),method:z.enum(['cash','card','transfer']).default('cash'),due_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),note:z.string().max(3000).default(''),quote_id:pos.optional(),lines:z.array(z.object({product_id:pos,qty:quantity,price:num})).min(1).max(200)});
app.get('/api/documents',sales,async(req,res)=>{const [r]=await db.query(`SELECT d.*,c.name customer,s.name supplier,u.name employee FROM documents d LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN suppliers s ON s.id=d.supplier_id JOIN users u ON u.id=d.user_id ${req.user.role==='owner'?'':"WHERE d.kind!='purchase'"} ORDER BY d.id DESC LIMIT 1000`);res.json(r);});
app.get('/api/documents/:id',sales,async(req,res)=>{const [[d]]=await db.query('SELECT d.*,c.name customer,c.phone FROM documents d LEFT JOIN customers c ON c.id=d.customer_id WHERE d.id=?',[req.params.id]);if(!d)return res.status(404).json({error:'Document introuvable'});if(d.kind==='purchase'&&req.user.role!=='owner')return res.status(403).json({error:'Accès refusé'});const [lines]=await db.query('SELECT * FROM `lines` WHERE document_id=?',[d.id]);const [payments]=await db.query('SELECT * FROM payments WHERE document_id=?',[d.id]);res.json({...d,lines:lines.map(l=>req.user.role==='owner'?l:({...l,cost:undefined})),payments});});
app.post('/api/documents',sales,async(req,res)=>{const d=docSchema.parse(req.body);if(d.kind==='purchase'&&req.user.role!=='owner')return res.status(403).json({error:'Accès refusé'});if(d.kind==='purchase'&&!d.supplier_id)throw Error('Choisissez un fournisseur');if(d.kind==='quote'&&d.paid)throw Error('Un devis ne reçoit pas de paiement');if(new Set(d.lines.map(l=>l.product_id)).size!==d.lines.length)throw Error('Produit dupliqué');
const id=await tx(async c=>{let quote;if(d.quote_id){const [[q]]=await c.query('SELECT * FROM documents WHERE id=? FOR UPDATE',[d.quote_id]);if(!q||q.kind!=='quote'||q.status!=='open'||d.kind!=='sale')throw Error('Devis déjà converti ou invalide');quote=q;}
if(d.customer_id){const [[customer]]=await c.query('SELECT * FROM customers WHERE id=? FOR UPDATE',[d.customer_id]);if(!customer)throw Error('Client introuvable');const total=totals(d.lines,d.discount,d.paid,d.kind,d.customer_id);if(d.kind==='sale'){const [[b]]=await c.query("SELECT COALESCE(SUM(total-paid),0) balance FROM documents WHERE customer_id=? AND kind='sale' AND status='open'",[d.customer_id]);if(Number(b.balance)+total-d.paid>customer.credit_limit)throw Error('Plafond de crédit dépassé');}}
const lines=[];for(const l of [...d.lines].sort((a,b)=>a.product_id-b.product_id)){const [[p]]=await c.query('SELECT * FROM products WHERE id=? AND active=1 FOR UPDATE',[l.product_id]);if(!p)throw Error('Produit introuvable');if(d.kind==='sale'&&p.stock<l.qty)throw Error('Stock insuffisant : '+p.name);if(req.user.role==='cashier'&&l.price!==Number(p.price))throw Error('Le prix ne peut être modifié par un caissier');lines.push({...l,name:p.name,cost:d.kind==='purchase'?l.price:p.cost});}
const total=totals(lines,d.discount,d.paid,d.kind,d.customer_id);const [r]=await c.query('INSERT INTO documents SET ?',{kind:d.kind,customer_id:d.customer_id||null,supplier_id:d.supplier_id||null,user_id:req.user.id,total,discount:d.discount,paid:d.paid,due_date:d.due_date||null,note:d.note});
for(const l of lines){await c.query('INSERT INTO `lines` SET ?',{...l,document_id:r.insertId});if(d.kind!=='quote'){const qty=d.kind==='sale'?-l.qty:l.qty;await c.query('UPDATE products SET stock=stock+? WHERE id=?',[qty,l.product_id]);if(d.kind==='purchase')await c.query('UPDATE products SET cost=? WHERE id=?',[l.price,l.product_id]);await c.query('INSERT INTO movements SET ?',{product_id:l.product_id,qty,reason:`${d.kind} #${r.insertId}`,user_id:req.user.id});}}
if(d.paid)await c.query('INSERT INTO payments SET ?',{document_id:r.insertId,amount:d.paid,method:d.method,user_id:req.user.id});if(quote)await c.query("UPDATE documents SET status='converted' WHERE id=?",[quote.id]);return r.insertId;});res.json({id});});
app.post('/api/documents/:id/payment',sales,async(req,res)=>{const p=z.object({amount,method:z.enum(['cash','card','transfer'])}).parse(req.body);await tx(async c=>{const [[d]]=await c.query('SELECT * FROM documents WHERE id=? FOR UPDATE',[req.params.id]);if(!d||d.kind==='quote'||d.status!=='open')throw Error('Document invalide');if(d.kind==='purchase'&&req.user.role!=='owner')throw Error('Accès refusé');if(money(p.amount)>money(d.total-d.paid))throw Error('Paiement supérieur au solde');await c.query('INSERT INTO payments SET ?',{...p,document_id:d.id,user_id:req.user.id});await c.query('UPDATE documents SET paid=paid+? WHERE id=?',[money(p.amount),d.id]);});res.json({ok:true});});
app.post('/api/documents/:id/return',owner,async(req,res)=>{await tx(async c=>{const [[d]]=await c.query('SELECT * FROM documents WHERE id=? FOR UPDATE',[req.params.id]);if(!d||d.kind!=='sale'||d.status!=='open')throw Error('Retour impossible');const [ls]=await c.query('SELECT * FROM `lines` WHERE document_id=? ORDER BY product_id',[d.id]);for(const l of ls){await c.query('UPDATE products SET stock=stock+? WHERE id=?',[l.qty,l.product_id]);await c.query('INSERT INTO movements SET ?',{product_id:l.product_id,qty:l.qty,reason:'Retour intégral #'+d.id,user_id:req.user.id});}await c.query("UPDATE documents SET status='returned' WHERE id=?",[d.id]);});res.json({ok:true});});
app.get('/api/expenses',owner,async(req,res)=>{const [r]=await db.query('SELECT * FROM expenses ORDER BY expense_date DESC LIMIT 1000');res.json(r);});
app.post('/api/expenses',owner,async(req,res)=>{const p=z.object({label:z.string().min(1).max(190),category:z.string().min(1).max(80),amount,expense_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.body);await db.query('INSERT INTO expenses SET ?',{...p,user_id:req.user.id});res.json({ok:true});});
app.get('/api/users',owner,async(req,res)=>{const [r]=await db.query('SELECT id,name,email,role FROM users');res.json(r);});
app.post('/api/users',owner,async(req,res)=>{const u=z.object({name:z.string().min(1),email:z.string().email(),password:z.string().min(10),role:z.enum(['owner','cashier','stock'])}).parse(req.body);await db.query('INSERT INTO users SET ?',{...u,password:await bcrypt.hash(u.password,12)});res.json({ok:true});});
function shiftYmd(iso,days){const [y,m,d]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);}
function monthShift(ym,delta){const [y,m]=ym.split('-').map(Number);return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);}
function spanClause(column,range){return range.all?{sql:'1=1',params:[]}:{sql:`DATE(${column}) BETWEEN ? AND ?`,params:[range.from,range.to]};}
async function reportFigures(range){
  const sale=spanClause('created_at',range),pay=spanClause('p.created_at',range),exp=spanClause('expense_date',range),doc=spanClause('d.created_at',range);
  const [[sales]]=await db.query(`SELECT COUNT(*) tickets, COALESCE(SUM(total),0) total, COALESCE(SUM(discount),0) discount, COALESCE(SUM(total-paid),0) remain FROM documents WHERE kind='sale' AND status='open' AND ${sale.sql}`,sale.params);
  const [[gross]]=await db.query(`SELECT COALESCE(SUM(l.qty*(l.price-l.cost)),0) gross FROM \`lines\` l JOIN documents d ON d.id=l.document_id WHERE d.kind='sale' AND d.status='open' AND ${doc.sql}`,doc.params);
  const [[collected]]=await db.query(`SELECT COALESCE(SUM(p.amount),0) total FROM payments p JOIN documents d ON d.id=p.document_id WHERE d.kind='sale' AND d.status<>'returned' AND ${pay.sql}`,pay.params);
  const [[expense]]=await db.query(`SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE ${exp.sql}`,exp.params);
  const [[purchases]]=await db.query(`SELECT COUNT(*) tickets, COALESCE(SUM(total),0) total FROM documents WHERE kind='purchase' AND status='open' AND ${sale.sql}`,sale.params);
  const margin=money(gross.gross-sales.discount);
  return {sales:money(sales.total),tickets:Number(sales.tickets),avg:Number(sales.tickets)?money(sales.total/sales.tickets):0,discount:money(sales.discount),remain:money(sales.remain),margin,collected:money(collected.total),expenses:money(expense.total),purchases:money(purchases.total),purchaseCount:Number(purchases.tickets),net:money(margin-expense.total)};
}
app.get('/api/reports',owner,async(req,res)=>{
  const day=/^\d{4}-\d{2}-\d{2}$/;
  const from=String(req.query.from||''),to=String(req.query.to||'');
  const all=!from&&!to;
  if(!all&&(!day.test(from)||!day.test(to)||from>to||(Date.parse(to)-Date.parse(from))/86400000>3660))return res.status(400).json({error:'Période invalide'});
  const range=all?{all:true}:{all:false,from,to};
  const [[summary]]=await db.query(`SELECT COALESCE(SUM(total),0) sales,COALESCE(SUM(total-paid),0) debt,COALESCE(SUM(CASE WHEN DATE(created_at)=CURDATE() THEN total ELSE 0 END),0) today FROM documents WHERE kind='sale' AND status='open'`);const [[cash]]=await db.query(`SELECT COALESCE(SUM(p.amount),0) today_paid FROM payments p JOIN documents d ON d.id=p.document_id WHERE d.kind='sale' AND d.status<>'returned' AND DATE(p.created_at)=CURDATE()`);summary.today_paid=cash.today_paid;
  const [[inventory]]=await db.query('SELECT SUM(stock*cost) value,SUM(stock<=min_stock) low FROM products WHERE active=1');
  const [monthly]=await db.query("SELECT DATE_FORMAT(created_at,'%Y-%m') month,SUM(total) total FROM documents WHERE kind='sale' AND status='open' GROUP BY month ORDER BY month DESC LIMIT 12");
  const [top]=await db.query("SELECT l.name,SUM(l.qty) qty,SUM(l.qty*l.price) revenue FROM `lines` l JOIN documents d ON d.id=l.document_id WHERE d.kind='sale' AND d.status='open' GROUP BY l.product_id,l.name ORDER BY revenue DESC LIMIT 5");
  const [[margin]]=await db.query("SELECT COALESCE(SUM(l.qty*(l.price-l.cost)),0) gross FROM `lines` l JOIN documents d ON d.id=l.document_id WHERE d.kind='sale' AND d.status='open'");
  const [[discount]]=await db.query("SELECT COALESCE(SUM(discount),0) n FROM documents WHERE kind='sale' AND status='open'");
  const [[expense]]=await db.query('SELECT COALESCE(SUM(amount),0) n FROM expenses');
  const figures=await reportFigures(range);
  const prev=range.all?null:await reportFigures({all:false,from:shiftYmd(from,-((Date.parse(to)-Date.parse(from))/86400000+1)),to:shiftYmd(from,-1)});
  const sale=spanClause('d.created_at',range),pay=spanClause('p.created_at',range),exp=spanClause('expense_date',range);
  const [categories]=await db.query(`SELECT COALESCE(pr.category,'') name, SUM(l.qty) qty, SUM(l.qty*l.price) revenue FROM \`lines\` l JOIN documents d ON d.id=l.document_id LEFT JOIN products pr ON pr.id=l.product_id WHERE d.kind='sale' AND d.status='open' AND ${sale.sql} GROUP BY COALESCE(pr.category,'') ORDER BY revenue DESC LIMIT 8`,sale.params);
  const [methods]=await db.query(`SELECT p.method, COALESCE(SUM(p.amount),0) amount FROM payments p JOIN documents d ON d.id=p.document_id WHERE d.kind='sale' AND d.status<>'returned' AND ${pay.sql} GROUP BY p.method`,pay.params);
  const [best]=await db.query(`SELECT l.name, SUM(l.qty) qty, SUM(l.qty*l.price) revenue, SUM(l.qty*(l.price-l.cost)) margin FROM \`lines\` l JOIN documents d ON d.id=l.document_id WHERE d.kind='sale' AND d.status='open' AND ${sale.sql} GROUP BY l.product_id,l.name ORDER BY revenue DESC LIMIT 8`,sale.params);
  const [expenseCats]=await db.query(`SELECT category, SUM(amount) amount FROM expenses WHERE ${exp.sql} GROUP BY category ORDER BY amount DESC`,exp.params);
  const [debtors]=await db.query("SELECT c.name, COALESCE(SUM(d.total-d.paid),0) balance FROM customers c JOIN documents d ON d.customer_id=c.id AND d.kind='sale' AND d.status='open' GROUP BY c.id,c.name HAVING balance>0 ORDER BY balance DESC LIMIT 8");
  const [low]=await db.query('SELECT name, stock, min_stock, unit FROM products WHERE active=1 AND stock<=min_stock ORDER BY (min_stock-stock) DESC, name LIMIT 8');
  const [[dormantSum]]=await db.query("SELECT COUNT(*) n, COALESCE(SUM(p.stock*p.cost),0) value FROM products p WHERE p.active=1 AND p.stock>0 AND NOT EXISTS (SELECT 1 FROM `lines` l JOIN documents d ON d.id=l.document_id WHERE l.product_id=p.id AND d.kind='sale' AND d.status='open')");
  const [dormant]=await db.query("SELECT p.name, p.stock, p.unit, p.stock*p.cost value FROM products p WHERE p.active=1 AND p.stock>0 AND NOT EXISTS (SELECT 1 FROM `lines` l JOIN documents d ON d.id=l.document_id WHERE l.product_id=p.id AND d.kind='sale' AND d.status='open') ORDER BY value DESC LIMIT 8");
  const [[todayRow]]=await db.query('SELECT CURDATE() today');
  const today=String(todayRow.today).slice(0,10);
  let seriesKind='month',keys=[];
  if(!range.all&&(Date.parse(to)-Date.parse(from))/86400000<=62){seriesKind='day';for(let d=from;d<=to&&keys.length<70;d=shiftYmd(d,1))keys.push(d);}
  else {const end=range.all?today.slice(0,7):to.slice(0,7);const start=range.all?monthShift(end,-11):from.slice(0,7);for(let m=start;m<=end&&keys.length<48;m=monthShift(m,1))keys.push(m);}
  const seriesSale=spanClause('created_at',range),seriesPay=spanClause('p.created_at',range);
  const group=seriesKind==='day'?"DATE(created_at)":"DATE_FORMAT(created_at,'%Y-%m')";
  const payGroup=seriesKind==='day'?"DATE(p.created_at)":"DATE_FORMAT(p.created_at,'%Y-%m')";
  const [saleSeries]=await db.query(`SELECT ${group} bucket, COALESCE(SUM(total),0) total FROM documents WHERE kind='sale' AND status='open' AND ${seriesSale.sql} GROUP BY bucket`,seriesSale.params);
  const [paySeries]=await db.query(`SELECT ${payGroup} bucket, COALESCE(SUM(p.amount),0) total FROM payments p JOIN documents d ON d.id=p.document_id WHERE d.kind='sale' AND d.status<>'returned' AND ${seriesPay.sql} GROUP BY bucket`,seriesPay.params);
  const saleMap=Object.fromEntries(saleSeries.map(r=>[String(r.bucket).slice(0,seriesKind==='day'?10:7),Number(r.total)]));
  const payMap=Object.fromEntries(paySeries.map(r=>[String(r.bucket).slice(0,seriesKind==='day'?10:7),Number(r.total)]));
  const methodOrder=['cash','card','transfer'];
  const methodMap=Object.fromEntries(methods.map(m=>[m.method,money(m.amount)]));
  res.json({summary,inventory,monthly,top,gross:money(margin.gross-discount.n),expenses:expense.n,period:{...figures,from:range.all?null:from,to:range.all?null:to,all:range.all,prev,seriesKind,series:keys.map(key=>({key,sales:money(saleMap[key]||0),collected:money(payMap[key]||0)})),categories:categories.map(c=>({name:c.name,qty:Number(c.qty),revenue:money(c.revenue)})),methods:methodOrder.map(method=>({method,amount:methodMap[method]||0})),top:best.map(p=>({name:p.name,qty:Number(p.qty),revenue:money(p.revenue),margin:money(p.margin)})),expenseCats:expenseCats.map(c=>({category:c.category,amount:money(c.amount)})),debtors:debtors.map(c=>({name:c.name,balance:money(c.balance)})),debt:money(summary.debt),low:low.map(p=>({name:p.name,stock:Number(p.stock),min_stock:Number(p.min_stock),unit:p.unit})),dormant:{count:Number(dormantSum.n),value:money(dormantSum.value),items:dormant.map(p=>({name:p.name,stock:Number(p.stock),unit:p.unit,value:money(p.value)}))}}});
});
const dist=fileURLToPath(new URL('../../client/dist',import.meta.url));app.use(express.static(dist));app.get('/{*path}',(req,res)=>{if(req.path.startsWith('/api/')||req.path.startsWith('/uploads/'))return res.status(404).json({error:'Route introuvable'});res.sendFile(path.join(dist,'index.html'));});
app.use((err,req,res,next)=>{if(err instanceof z.ZodError)return res.status(400).json({error:err.issues.map(i=>/^[A-Z][a-z].*[àâéèêùç]/.test(i.message)?i.message:i.path.join('.')+': '+i.message).join(', ')});if(err.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Référence ou email déjà utilisé'});if(err.code||err.sql){console.error(err);return res.status(500).json({error:'Erreur de base de données'});}res.status(400).json({error:err.message||'Requête invalide'});});
app.listen(process.env.PORT||4000,()=>console.log('DrogoPro: http://localhost:'+(process.env.PORT||4000)));
