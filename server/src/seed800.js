import {db} from './db.js';

const categories = [
  {code:'PEI', name:'Peinture', brands:['Atlas','Ripolin','Sadolin','Jotun','Total'], units:['pièce'], items:[
    'Peinture acrylique mate','Peinture satin','Peinture brillante','Sous-couche universelle','Peinture façade',
    'Laque bois','Vernis incolore','Peinture anti-rouille','Enduit de lissage','Peinture sol époxy',
    'Blanc plafond','Peinture cuisine/bain','Peinture métal','Colorant universel','Diluant synthétique'
  ]},
  {code:'OUT', name:'Outillage', brands:['Bosch','Total','Makita','Stanley','Ingco'], units:['pièce'], items:[
    'Perceuse à percussion','Visseuse sans fil','Meuleuse 115 mm','Scie sauteuse','Marteau menuisier',
    'Niveau à bulle 60 cm','Mètre ruban 5 m','Pince multiprise','Tournevis plat','Tournevis cruciforme',
    'Clé à molette','Boîte à outils','Cutter professionnel','Pince coupante','Serre-joint'
  ]},
  {code:'PLO', name:'Plomberie', brands:['Nicoll','Generic','Sferaco','Valsir','Geberit'], units:['pièce','mètre'], items:[
    'Coude PVC','Té PVC','Tube PVC','Collier de fixation','Robinet d\'arrêt',
    'Flexible sanitaire','Siphon lavabo','Joint torique','Vanne à boisseau','Réduction PVC',
    'Manchon PVC','Bonde de douche','Mitigeur lavabo','Tube multicouche','Raccord laiton'
  ]},
  {code:'ELE', name:'Électricité', brands:['Nexans','Legrand','Schneider','Hager','Debflex'], units:['pièce','mètre','rouleau'], items:[
    'Câble électrique','Interrupteur simple','Prise 2P+T','Disjoncteur 16A','Boîte de dérivation',
    'Douille E27','Ampoule LED','Tableau électrique','Gaine ICTA','Dominos de connexion',
    'Détecteur de mouvement','Spot encastrable','Interrupteur va-et-vient','Fusible cartouche','Multiprise'
  ]},
  {code:'NET', name:'Nettoyage', brands:['ProClean','Ajax','Mir','CIF','Vanish'], units:['pièce'], items:[
    'Détergent multi-usage','Javel concentrée','Nettoyant sol','Liquide vaisselle','Désinfectant surfaces',
    'Nettoyant vitre','Décapant four','Produit WC','Savon noir','Éponge abrasive',
    'Chiffon microfibre','Balai serpillère','Seau plastique','Sacs poubelle','Désodorisant'
  ]},
  {code:'QUI', name:'Quincaillerie', brands:['Fischer','Spax','Generic','Vynex','Brico'], units:['boîte','pièce','paquet'], items:[
    'Vis universelles','Chevilles nylon','Clous acier','Équerres de fixation','Charnière porte',
    'Serrure encastrable','Poignée de porte','Padlock 40 mm','Chaîne galvanisée','Corde polypropylène',
    'Ruban adhésif','Colle blanche','Silicone neutre','Mastic acrylique','Crochets muraux'
  ]},
  {code:'MAÇ', name:'Maçonnerie', brands:['Lafarge','Cimenterie','Generic','Weber','Sika'], units:['sac','pièce','kg'], items:[
    'Ciment Portland','Sable fin','Gravier 5/15','Mortier prêt','Enduit façade',
    'Colle carrelage','Joint carrelage','Béton prêt','Chaux hydraulique','Plâtre en poudre',
    'Fer à béton','Treillis soudé','Brique creuse','Parpaing 20','Carreau ciment'
  ]},
  {code:'JDN', name:'Jardin', brands:['Gardena','Total','Generic','Black+Decker','Hozelock'], units:['pièce','mètre'], items:[
    'Tuyau d\'arrosage','Pistolet arroseur','Tondeuse électrique','Sécateur','Râteau jardin',
    'Bêche acier','Arrosoir 10 L','Engrais universel','Terreau plantation','Gants jardin',
    'Ciseaux à haie','Broyeur de végétaux','Échelle télescopique','Brouette 80 L','Filet anti-oiseau'
  ]},
];

const variants = [
  '· 0,5 L','· 1 L','· 2,5 L','· 5 L','· 10 L','· 15 L','· 20 L',
  'Ø 16 mm','Ø 20 mm','Ø 25 mm','Ø 32 mm','Ø 40 mm','Ø 50 mm','Ø 63 mm',
  '3 × 30','4 × 40','5 × 50','6 × 60','8 × 80','10 × 100',
  '5 m','10 m','25 m','50 m','100 m',
  'blanc','gris','noir','rouge','bleu','vert','beige','marron',
  'petit','moyen','grand','pro','eco','premium','standard','renforcé',
  'pack 6','pack 12','pack 24','boîte 50','boîte 100','boîte 200',
  '230 V','12 V','18 V','650 W','850 W','1200 W',
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function money(n) {
  return Math.round(n * 100) / 100;
}

try {
  const [[before]] = await db.query('SELECT COUNT(*) n FROM products WHERE active=1');
  const existing = Number(before.n);
  const target = 800;
  const needed = Math.max(0, target - existing);
  if (!needed) {
    console.log(`Already have ${existing} products (target ${target}).`);
    process.exitCode = 0;
  } else {
    const rows = [];
    let i = 0;
    while (rows.length < needed) {
      const cat = pick(categories, i);
      const item = pick(cat.items, Math.floor(i / categories.length));
      const brand = pick(cat.brands, i);
      const unit = pick(cat.units, i);
      const variant = pick(variants, i * 3 + 7);
      const sku = `${cat.code}-${String(1000 + existing + rows.length + 1).padStart(4, '0')}`;
      const name = `${item} ${variant}`.slice(0, 190);
      const cost = money(2 + ((i * 17) % 480) + ((i % 7) * 0.35));
      const price = money(cost * (1.25 + (i % 5) * 0.08));
      const stock = 80 + ((i * 13) % 420); // big stock ~80–499
      const minStock = 10 + (i % 20);
      const packSize = [1, 6, 10, 12, 20, 24, 50][i % 7];
      const barcode = `611${String(100000000 + existing + rows.length + 1).slice(-9)}`;
      const imageByCat = {
        Peinture: '/products/peinture.jpg',
        Outillage: '/products/outillage.jpg',
        Plomberie: '/products/plomberie.jpg',
        Électricité: '/products/electricite.jpg',
        Nettoyage: '/products/nettoyage.jpg',
        Quincaillerie: '/products/quincaillerie.jpg',
        Maçonnerie: '/products/maconnerie.jpg',
        Jardin: '/products/jardin.jpg',
      };
      rows.push([sku, name, cat.name, brand, unit, barcode, imageByCat[cat.name] || '/products/default.jpg', cost, price, stock, minStock, packSize]);
      i += 1;
    }

    const chunk = 100;
    for (let o = 0; o < rows.length; o += chunk) {
      const part = rows.slice(o, o + chunk);
      const placeholders = part.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      await db.query(
        `INSERT INTO products(sku,name,category,brand,unit,barcode,image,cost,price,stock,min_stock,pack_size) VALUES ${placeholders}`,
        part.flat()
      );
    }

    // Boost stock on the original sample products too
    await db.query('UPDATE products SET stock = GREATEST(stock, 150) WHERE active=1 AND stock < 150');

    const [[after]] = await db.query('SELECT COUNT(*) n, SUM(stock) s FROM products WHERE active=1');
    console.log(`Added ${needed} products. Active catalog: ${after.n} items, total stock units: ${Number(after.s).toFixed(0)}.`);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
