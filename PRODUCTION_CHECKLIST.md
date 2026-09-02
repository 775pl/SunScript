# Checklist de mise en production

## À confirmer avant publication

- Vérifier l'orthographe exacte du nom de l'entrepreneure, l'adresse, les numéros SIREN/SIRET et l'hébergeur dans les mentions légales.
- Ajouter un numéro de téléphone professionnel aux mentions légales si l'activité en dispose et confirmer l'immatriculation applicable (RNE/RCS).
- Confirmer que le domaine canonique est bien `https://sunscript.studio` ; sinon, définir `SITE_URL` et modifier `public/robots.txt` et `public/sitemap.xml`.
- Confirmer le maintien du régime « TVA non applicable, article 293 B du CGI » avant chaque émission de devis ou facture.
- Faire relire les CGV par un juriste, notamment les modalités de cession de droits propres à chaque devis.

## Périmètre commercial

Les CGV publiées sont exclusivement B2B. Ne pas accepter de commande d'un particulier avec ce texte. Pour vendre à des consommateurs, créer des CGV B2C, fournir les informations précontractuelles et le formulaire de rétractation, puis adhérer réellement à un médiateur de la consommation et publier ses coordonnées avant la première vente.

## Données personnelles

- Tenir un registre simple des traitements (prospects, clients, facturation, hébergement).
- Conclure un accord de sous-traitance RGPD lorsque SunScript manipule des données personnelles pour un client.
- Réévaluer la politique de confidentialité avant d'ajouter un formulaire, un outil de statistiques, un chat, une vidéo externe ou un pixel publicitaire.
- Ne déposer aucun traceur non essentiel avant le consentement de l'utilisateur.

## Déploiement et contrôle

- Le site est désormais une application NestJS : exécuter `npm ci` puis `npm run build`, et utiliser `npm start` sur un hébergement Node. Sur Vercel, utiliser la détection NestJS et ne pas traiter `dist` comme un export statique. Voir `README.md`.

- Associer le domaine à Vercel, forcer HTTPS et vérifier les en-têtes de `vercel.json` sur la réponse de production.
- Tester les pages sur mobile, clavier seul, Safari, Firefox et un PC peu puissant.
- Vérifier après déploiement les erreurs 404, les liens, le sitemap et l'indexation.
- Mettre en place une supervision de disponibilité externe et une procédure de sauvegarde pour les futurs services dynamiques.
