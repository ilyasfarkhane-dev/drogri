# Vérification fonctionnelle

Utiliser une base de test dédiée. Ne pas tester les retours ou mouvements sur la base de production.

1. Initialiser la base et se connecter avec le propriétaire.
2. Vérifier qu'une connexion incorrecte échoue et qu'une requête API sans token reçoit 401.
3. Créer un produit avec coût 10, prix 20, seuil 5. Ajouter 10 unités avec Stock ±. Vérifier le mouvement et le stock 10.
4. Vendre 2 unités au comptoir pour 40 DH. Vérifier stock 8, reçu 40 DH, payé 40, solde zéro.
5. Tenter une vente de 20 unités : elle doit échouer sans créer de document ni mouvement.
6. Créer un client plafond 100 DH. Vendre 3 unités pour 60 DH, payé 10. Vérifier stock 5, solde 50 DH, alerte stock et relevé client.
7. Ajouter 20 DH au document. Vérifier solde 30. Un paiement de 31 DH doit échouer. Solder avec 30 DH.
8. Tenter une vente anonyme non réglée, un paiement supérieur au total et une remise supérieure au panier : échec sans effet stock.
9. Créer un devis de 2 unités. Le stock et les ventes ne changent pas. Convertir le devis : une vente est créée, le devis devient Converti. Une deuxième conversion doit échouer.
10. Enregistrer un achat fournisseur de 12 unités à 11 DH, payé partiellement. Le stock augmente de 12, le coût actuel devient 11 et le solde fournisseur apparaît. Régler le solde depuis le bon d'achat.
11. Effectuer un retour intégral sur une vente : le stock est réintégré, la vente est exclue des rapports, les paiements restent visibles. Un deuxième retour doit échouer. Rembourser séparément le client si nécessaire.
12. Créer des comptes cashier et stock, se déconnecter et se connecter avec chacun. Le caissier ne peut pas modifier les produits, prix unitaires, achats ou rapports. Le compte stock peut ajuster les stocks mais ne peut pas vendre.
13. Vérifier l'impression du reçu, devis et relevé client. Tester un écran mobile et les recherches.
14. Vérifier deux ventes simultanées du dernier stock : une seule doit réussir. Vérifier deux paiements simultanés : le total payé ne dépasse jamais le montant du document.
15. Vérifier un produit au mètre : vendre 2,5 unités à 7,50 DH, remise 1 DH, total 17,75 DH.
