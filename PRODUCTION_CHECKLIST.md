# Checklist de mise en production

## À confirmer avant publication

- Vérifier l'orthographe exacte du nom de l'entrepreneure, l'adresse, les numéros SIREN/SIRET et l'hébergeur dans les mentions légales.
- Ajouter un numéro de téléphone professionnel aux mentions légales si l'activité en dispose et confirmer l'immatriculation applicable (RNE/RCS).
- Le domaine canonique par défaut est `https://www.sunscript.fr`. Vérifier que la variable `SITE_URL` en production utilise aussi cette adresse, comme `public/robots.txt` et `public/sitemap.xml`.
- Confirmer le maintien du régime « TVA non applicable, article 293 B du CGI » avant chaque émission de devis ou facture.
- Faire relire les CGV par un juriste, notamment les modalités de cession de droits propres à chaque devis.

## Périmètre commercial

L’offre vise professionnels et particuliers. Le volet consommateurs ajouté aux CGV est une préparation, pas une validation juridique. Avant publication définitive et première commande d’un particulier : adhérer à un médiateur indépendant compétent et remplacer les mentions à compléter (nom, adresse et site). Faire vérifier les clauses selon les prestations effectivement vendues, notamment les annexes obligatoires de garantie des contenus/services numériques, le droit de rétractation et la résiliation des abonnements. Joindre les informations précontractuelles et le formulaire de rétractation à la confirmation du contrat sur support durable. Confirmer les exemples de périmètre tarifaire avant publication.

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

## Activation du contact

- Configurer RESEND_API_KEY et CONTACT_FROM côté serveur ; vérifier le domaine d’envoi.
- Vérifier les conditions de sous-traitance et transferts du prestataire de messagerie avant activation.
- Ajouter une limite de requêtes persistante via le pare-feu Vercel, la limite applicative étant propre à chaque instance.
- Tester la réception effective dans hello@sunscript.fr après configuration (les tests locaux simulent le prestataire).
