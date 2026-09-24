# SunScript — NestJS + Tailwind

Site vitrine rendu côté serveur par **NestJS 11 / Express / EJS**, avec **Tailwind CSS 4** compilé. Aucun framework ni compilateur CSS n'est envoyé au navigateur. Les textes et dessins du site original sont conservés.

## Démarrage

Prérequis : Node.js 22 ou ultérieur et npm.

```sh
npm ci
npm run dev
```

Ouvrir `http://localhost:3000`. Le serveur TypeScript, les styles Tailwind et les actifs se recompilent en développement. Rafraîchir la page pour voir les modifications de vues et de styles.

```sh
npm run build
npm start
npm test
```

`npm test` compile le projet puis teste les routes, les redirections, le rendu HTML, les actifs, la page 404 et les en-têtes de sécurité. `npm run typecheck` vérifie uniquement TypeScript. `npm run test:a11y` lance les régressions navigateur existantes (Microsoft Edge installé est requis par ce script).

## Organisation

- `src/main.ts`, `src/app.module.ts` : démarrage et module NestJS.
- `src/create-app.ts` : configuration HTTP, sécurité, ressources publiques, moteur EJS.
- `src/pages.controller.ts`, `src/page-data.ts` : routes autorisées et métadonnées.
- `views/layout.ejs` et `views/partials/` : structure commune, navigation, pied de page, préférences et feuille originale.
- `views/pages/` : contenu des sept pages. Les CGV incluent un volet particuliers à finaliser avec les coordonnées du médiateur.
- `src/styles/site.css` : Tailwind, palette accessible, composants communs et feuille.
- `src/styles/pages/` : styles spécifiques conservant le dessin et les mises en page d'origine, dans la couche `components` sous les utilitaires Tailwind.
- `src/client/site.js` : petit script de thème et d'animations, compilé et minifié.
- `public/` : seuls fichiers exposés directement ; `public/assets/` et `dist/` sont générés, ne pas les modifier.

Les routes sont `/`, `/service-web`, `/service-systemes`, `/service-apis`, `/cgv`, `/mentions-legales` et `/confidentialite`. Les anciennes adresses `.html` redirigent en HTTP 308. `/health` fournit un état minimal. Aucun fichier source ni dossier de tests n'est exposé par NestJS.

## Feuille et accessibilité

La feuille reprend les tracés SVG originaux. Elle se superpose au bas du bloc de texte du premier écran, sans prendre de place dans le flux ; sa faible opacité préserve la lisibilité. Son balancement utilise seulement une transformation CSS et respecte le bouton d'animations, `prefers-reduced-motion` et les onglets masqués. Les commandes restent fixées directement sous `body`.

Les réglages système clair/sombre, le clavier, le curseur natif et le contenu sans JavaScript restent pris en charge. Tailwind 4 cible les navigateurs modernes (Safari 16.4+, Chrome 111+, Firefox 128+) : ne pas promettre une compatibilité avec les navigateurs anciens sans recette dédiée.

## Production / Vercel

Le projet nécessite maintenant un serveur Node : ce n'est plus un dossier HTML à servir directement. `vercel.json` impose le framework `nestjs`. `src/main.ts` importe directement `NestFactory` pour que Vercel détecte son point d'entrée natif ; aucun dossier `api/` ni réécriture de routes n'est nécessaire. Ne pas ajouter de section `functions` pour `src/main.ts` : le validateur de Vercel CLI 59.3.0 la rejette avec le moteur `@vercel/nestjs`. Le moteur inclut déjà `views/**/*` par défaut, donc les vues EJS restent empaquetées sans cette section.

Le build Vercel (`npm run build:vercel`) vérifie TypeScript et génère les actifs dans `public/`. Vercel compile et empaquette lui-même le serveur ; `npm run build` reste destiné au serveur Node local avec `dist/main.js`.

Pour reproduire la validation avec une installation de Vercel CLI 59.3.0 : `node tests/vercel-config.mjs /chemin/vers/node_modules/vercel`. Ce test appelle le détecteur réel de la CLI, reproduit l'erreur de l'ancienne section `functions`, vérifie la nouvelle configuration et les options de packaging des vues. Il ne se connecte pas à Vercel et ne remplace pas un déploiement de recette.

Le moteur EJS est importé et enregistré explicitement dans `src/create-app.ts` : le chargement implicite d'Express ne suffit pas à inclure cette dépendance dans la fonction. Après `npm run build`, `node tests/vercel-runtime.mjs /chemin/vers/node_modules/vercel` vérifie les sept pages et la 404 dans un dossier temporaire contenant uniquement les dépendances tracées et les vues. Cela détecte les modules manquants que le `node_modules` complet masque en local. Le dossier temporaire est supprimé après le test ; aucun déploiement n'est lancé.

Dans les réglages Vercel, garder le répertoire racine du dépôt comme **Root Directory**. Le framework et `outputDirectory: null` sont définis par le fichier de configuration pour ne pas hériter d'une sortie statique telle que `dist` ou une chaîne vide. Redéployer après avoir publié ces modifications dans le dépôt connecté. Aucun déploiement n'est effectué automatiquement par ces commandes de build.

Variables d'environnement : `PORT` (3000 par défaut), `NODE_ENV=production` en production, `SITE_URL` pour l'origine canonique. Les variables peuvent être fournies par l'hébergeur ou le terminal ; `.env.example` est documentaire et `.env` n'est pas chargé automatiquement. Vérifier également l'origine dans `public/robots.txt` et `public/sitemap.xml` avant déploiement.

Consulter `PRODUCTION_CHECKLIST.md` pour les validations juridiques et administratives qui restent à la charge de l'éditeur.

Références : [NestJS MVC](https://docs.nestjs.com/techniques/mvc), [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli), [NestJS sur Vercel](https://vercel.com/docs/frameworks/backend/nestjs).

## Formulaire de contact

Le formulaire POST /contact envoie uniquement vers hello@sunscript.fr via Resend. Configurer RESEND_API_KEY et CONTACT_FROM dans les variables serveur de l’hébergeur, avec un domaine expéditeur vérifié chez Resend. Ne jamais placer la clé dans le JavaScript public. Sans ces variables, le formulaire annonce son indisponibilité et conserve l’adresse de contact visible. Aucune création de compte ni transmission réelle n’a été effectuée pendant les tests.

La validation est effectuée côté serveur ; le formulaire fonctionne aussi sans JavaScript lorsque l’envoi est configuré. Les erreurs avec JavaScript préservent les champs. La protection comprend un champ piège, le contrôle de l’origine et cinq tentatives par adresse IP sur dix minutes par instance. Sur Vercel, compléter cette limite locale par une règle persistante dans le pare-feu de l’hébergeur ; ne pas faire confiance à un en-tête IP arbitraire. Désactiver le suivi d’ouverture et de clic chez le prestataire.

Tests ciblés après compilation : node --test tests/contact.test.cjs et node tests/site-refinements.cjs. Les appels Resend sont simulés dans les tests.
