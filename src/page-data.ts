export const pages = {
  "cgv": {
    "page": "cgv",
    "title": "Conditions Générales de Vente · SunScript",
    "description": "Conditions générales de vente B2B des prestations de développement SunScript.",
    "style": "cgv",
    "home": false
  },
  "confidentialite": {
    "page": "confidentialite",
    "title": "Politique de confidentialité · SunScript",
    "description": "Politique de confidentialité et exercice des droits RGPD auprès de SunScript.",
    "style": "confidentialite",
    "home": false
  },
  "home": {
    "page": "home",
    "title": "SunScript · Studio de développement",
    "description": "SunScript conçoit des sites web, applications, systèmes internes et intégrations d'API rapides et sur mesure.",
    "style": "home",
    "home": true
  },
  "mentions-legales": {
    "page": "mentions-legales",
    "title": "Mentions Légales · SunScript",
    "description": "Mentions légales et informations sur l'éditeur du site SunScript.",
    "style": "mentions-legales",
    "home": false
  },
  "service-apis": {
    "page": "service-apis",
    "title": "APIs & Intégrations · SunScript",
    "description": "Intégration d'API et connexion de services métier fiables par SunScript.",
    "style": "service-apis",
    "home": false
  },
  "service-systemes": {
    "page": "service-systemes",
    "title": "Systèmes Métier · SunScript",
    "description": "Systèmes internes, automatisations et outils métier sur mesure par SunScript.",
    "style": "service-systemes",
    "home": false
  },
  "service-web": {
    "page": "service-web",
    "title": "Applications Web · SunScript",
    "description": "Conception de sites et applications web rapides, accessibles et évolutifs par SunScript.",
    "style": "service-web",
    "home": false
  }
} as const;
export type PageKey = keyof typeof pages;
