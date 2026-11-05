import fs from 'node:fs';
const p = new URL('../src/main.jsx', import.meta.url);
let s = fs.readFileSync(p, 'utf8');

const broken = `{key==='image'?<div className="imageField">{(modal.imagePreview||v)&&<img src={modal.imagePreview||v} alt="" className="imagePreview"/>:<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={ev=>{const file=ev.target.files?.[0];if(!file)return;if(modal.imagePreview&&modal.imagePreview.startsWith('blob:'))URL.revokeObjectURL(modal.imagePreview);setModal({...modal,imageFile:file,imagePreview:URL.createObjectURL(file)});}}/><small>{modal.id?t('field_image_keep'):t('field_image_choose')}</small></div>:key==='role'||key==='method'||key==='unit'?<select value={v} onChange={e=>setModal({...modal,values:{...modal.values,[key]:e.target.value}})}>{(key==='role'?['cashier','stock','owner']:key==='method'?['cash','card','transfer']:['pièce','boîte','mètre','litre','kg']).map(opt=><option key={opt} value={opt}>{key==='role'?translateRole(opt,t):key==='method'?translateMethod(opt,t):translateUnit(opt,t)}</option>)}</select>:<input required={!['brand','barcode','phone','address','image'].includes(key)} min={key==='qty'?undefined:0} step="0.001" type={typeof defaults[modal.type]?.[key]==='number'||['qty','amount'].includes(key)?'number':key==='password'?'password':key==='expense_date'?'date':key==='email'?'email':'text'} value={v??''} onChange={e=>setModal({...modal,values:{...modal.values,[key]:e.target.value}})}/>}`;

const fixed = `{key==='image'?<div className="imageField">{(modal.imagePreview||v)&&<img src={modal.imagePreview||v} alt="" className="imagePreview"/>}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={ev=>{const file=ev.target.files?.[0];if(!file)return;if(modal.imagePreview&&modal.imagePreview.startsWith('blob:'))URL.revokeObjectURL(modal.imagePreview);setModal({...modal,imageFile:file,imagePreview:URL.createObjectURL(file)});}}/><small>{modal.id?t('field_image_keep'):t('field_image_choose')}</small></div>:key==='role'||key==='method'||key==='unit'?<select value={v} onChange={e=>setModal({...modal,values:{...modal.values,[key]:e.target.value}})}>{(key==='role'?['cashier','stock','owner']:key==='method'?['cash','card','transfer']:['pièce','boîte','mètre','litre','kg']).map(opt=><option key={opt} value={opt}>{key==='role'?translateRole(opt,t):key==='method'?translateMethod(opt,t):translateUnit(opt,t)}</option>)}</select>:<input required={!['brand','barcode','phone','address','image'].includes(key)} min={key==='qty'?undefined:0} step="0.001" type={typeof defaults[modal.type]?.[key]==='number'||['qty','amount'].includes(key)?'number':key==='password'?'password':key==='expense_date'?'date':key==='email'?'email':'text'} value={v??''} onChange={e=>setModal({...modal,values:{...modal.values,[key]:e.target.value}})}/>}`;

if (!s.includes(broken)) {
  console.error('broken snippet not found');
  const idx = s.indexOf("key==='image'?<div className=\"imageField\">");
  console.log('idx', idx);
  console.log(s.slice(idx, idx + 280));
  process.exit(1);
}
fs.writeFileSync(p, s.replace(broken, fixed));
console.log('fixed');
