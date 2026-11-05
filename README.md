# DrogoPro — Droguerie & quincaillerie

Application de gestion en français, prix en dirhams (DH). React 19 + Vite, Express 5 et MySQL 8. Interface claire vert sauge, ivoire et touches dorées. Sans Docker.

## Prérequis

- Node.js 22 ou 24 et npm.
- MySQL 8.x. Le schéma est également compatible MariaDB 10.11.
- Une base dédiée et un utilisateur SQL avec accès à cette base.

## Installation rapide

1. Extraire le ZIP et ouvrir un terminal dans `DrogoPro`.
2. Créer la base avec un compte administrateur MySQL :

```sql
CREATE DATABASE drogopro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'drogopro'@'127.0.0.1' IDENTIFIED BY 'VOTRE_MOT_DE_PASSE_SQL';
GRANT ALL PRIVILEGES ON drogopro.* TO 'drogopro'@'127.0.0.1';
```

Si la connexion utilise `localhost`, adapter le compte/hôte MySQL à votre installation. Ne pas utiliser le compte root dans l'application.

3. Installer les dépendances et créer la configuration :

```bash
npm ci
cp server/.env.example server/.env
```

Sous Windows : copier `.env.example` en `.env` dans le dossier `server` avec l'Explorateur ou `Copy-Item server/.env.example server/.env` dans PowerShell.

4. Modifier `server/.env` : renseigner `DB_PASSWORD`, un `JWT_SECRET` aléatoire d'au moins 32 caractères, `ADMIN_EMAIL` et un `ADMIN_PASSWORD` personnel d'au moins 10 caractères. Pour générer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

5. Initialiser et démarrer :

```bash
npm run db:init
npm run dev
```

Ouvrir **http://localhost:5173** et utiliser les identifiants `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Le serveur tourne sur le port 4000. Les produits et contacts d'exemple ne sont ajoutés que si la table produits est vide. Aucune vente fictive n'est ajoutée. Relancer `db:init` ne réinitialise pas les données existantes ; modifier ADMIN_PASSWORD ensuite ne change pas le mot de passe déjà enregistré.

## Production sur un seul port

```bash
npm run build
npm start
```

Ouvrir **http://localhost:4000**. Express sert l'API et `client/dist`. Configurer `NODE_ENV=production`, HTTPS via un reverse proxy et un superviseur Node (systemd, Passenger ou PM2). Le port configuré doit être disponible. Si le port backend est changé en développement, adapter `client/vite.config.js`.

Sauvegarder régulièrement la base avec mysqldump. Ne jamais exposer MySQL directement sur Internet. Garder `.env` hors de Git et du répertoire public. Adapter le paramètre Express `trust proxy` uniquement à la topologie réelle du proxy avant d'activer un usage public à grande échelle.

## Modules inclus

- **Tableau de bord** : ventes du jour, ventes cumulées, crédit clients, alertes stock, dernières ventes.
- **Caisse** : recherche nom/référence/code-barres, panier, quantités fractionnaires, remise fixe en DH, espèces/carte/virement, paiement partiel, date d'échéance, notes.
- **Produits** : création, modification, archivage, catégorie, marque, référence unique, code-barres, prix/coût, unités, seuil et taille du colis. Le stock se modifie via une opération tracée.
- **Stock** : mouvements des ventes/achats/retours et ajustements motivés. Aucun stock négatif autorisé. Les transactions SQL et verrous de ligne protègent les mises à jour concurrentes.
- **Clients / kridi** : fiches, plafond de crédit, relevé imprimable, historique, encaissements par vente. Le plafond est vérifié lors d'une vente à crédit.
- **Fournisseurs / achats** : contacts, réception immédiate d'achat, paiements partiels, solde fournisseur. Un achat augmente le stock et remplace le coût actuel par le dernier coût acheté ; les coûts des ventes passées restent enregistrés.
- **Colis** : la taille du colis est définie par produit. Dans les achats, « + 1 colis » ajoute ce nombre d'unités au panier. Tous les prix et stocks restent exprimés dans l'unité de vente. Exemple : colis de 12 raccords, prix par raccord, quantité 24 pour deux colis.
- **Devis** : document sans effet stock ni paiement, impression, conversion en vente une seule fois. Le stock, les prix autorisés et le crédit sont vérifiés à la conversion.
- **Documents** : reçu de vente, devis, bon d'achat, historique des paiements et impression/PDF via le navigateur.
- **Retours** : retour intégral réservé au propriétaire, remise en stock une seule fois et exclusion des indicateurs de vente. Les paiements historiques restent visibles. Le remboursement au client est à effectuer et suivre séparément.
- **Dépenses** : libellé, catégorie, montant, date.
- **Rapports** : ventes mensuelles, produits les plus vendus, marge brute après remises, dépenses, résultat indicatif, stock au coût actuel. Toutes périodes sauf le tableau mensuel limité aux 12 derniers mois d'activité. Pas de déclarations fiscales.
- **Équipe** : création de comptes propriétaire, caissier ou gestionnaire stock. Mots de passe bcrypt, JWT de 8 heures, vérification du rôle serveur sur chaque opération.

## Parcours conseillé

1. Vérifier les produits et saisir le stock initial avec **Stock ±**, motif « Stock initial ».
2. Ajouter les fournisseurs puis réceptionner un achat si nécessaire.
3. Créer vos clients réguliers avec leur plafond de crédit.
4. Ouvrir la caisse, choisir des produits et valider une première vente.
5. Pour le kridi, choisir un client et saisir un paiement inférieur au total (0 autorisé).
6. Consulter **Ventes & devis**, ouvrir la vente et ajouter un paiement ultérieur.
7. Créer un devis, l'imprimer puis utiliser **Convertir en vente** après acceptation.

Un paiement laissé vide dans la caisse règle la totalité. Une vente anonyme doit être entièrement réglée. Les caissiers utilisent le prix du catalogue ; les propriétaires peuvent le modifier. Le scanner code-barres fonctionne comme un clavier dans la barre de recherche ; sélectionner ensuite le produit trouvé.

## Droits

| Fonction | Propriétaire | Caissier | Stock |
|---|---|---|---|
| Caisse, devis, documents, paiements clients | Oui | Oui | Non |
| Clients et relevés | Oui | Oui | Non |
| Catalogue, prix de vente | Oui | Oui | Oui |
| Coûts et marges | Oui | Non | Non |
| Création / modification / archivage produits | Oui | Non | Non |
| Ajustements de stock | Oui | Non | Oui |
| Consultation des fournisseurs | Oui | Non | Oui |
| Achats, paiements fournisseurs, retours | Oui | Non | Non |
| Dépenses, rapports, création utilisateurs | Oui | Non | Non |

## Périmètre et extensions

Cette version est mono-magasin et utilise une devise DH sans calcul de TVA. Les paiements carte/virement sont enregistrés manuellement : aucun prélèvement bancaire n'est exécuté. Les achats sont des réceptions immédiates, sans circuit de commande fournisseur séparé. Les livraisons partielles, bons de livraison, retours partiels, échanges automatiques, ouverture/clôture de caisse, relances automatiques, import Excel, multi-magasin, modification/suppression d'utilisateurs et récupération de mot de passe restent des extensions. Une note peut indiquer le transport mais aucun calcul automatique de frais logistiques n'est inclus.

Les reçus sont des documents internes simples : ajouter la raison sociale, adresse, ICE/IF et règles de TVA adaptées avant d'en faire des factures légales. L'initialisation crée les tables absentes, ce n'est pas un outil de migration versionnée pour une base déjà modifiée.

## Vérification

```bash
npm test
npm run build
```

`server/test/rules.test.js` vérifie les calculs de quantités fractionnaires, remises, paiements et vente à crédit. Pour la vérification fonctionnelle complète avec une base de test, suivre `TESTING.md`.

## Organisation

```text
client/src/main.jsx      Interface React et formulaires
client/src/style.css    Style responsive et impression
server/src/index.js     API Express, authentification, droits et transactions
server/src/schema.sql   Schéma SQL et relations
server/src/init.js      Initialisation et données d'exemple
server/src/db.js        Pool MySQL et transactions
server/src/rules.js     Calculs et règles de vente
server/test/            Tests automatiques
```

Le ZIP comprend le code source, le verrou npm et le build frontend. Les dépendances `node_modules` et les secrets sont exclus.
