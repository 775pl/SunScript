export const pages = {
  "a-propos": {
    "page": "a-propos",
    "title": "Selma, développeuse web et fondatrice · SunScript",
    "description": "Faites connaissance avec Selma, fondatrice de SunScript : quatre ans de développement et une approche simple pour créer, améliorer et entretenir votre site.",
    "style": "service-web",
    "home": false
  },
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
    "title": "SunScript · Des sites et des outils pour votre activité",
    "description": "Selma vous accompagne dans la création, l’amélioration et la maintenance de sites web pour les particuliers, indépendants et petites structures.",
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
    "title": "Connecter vos outils et éviter les doubles saisies · SunScript",
    "description": "Reliez vos logiciels pour éviter les doubles saisies et simplifier vos tâches répétitives. SunScript vous aide à identifier les échanges utiles.",
    "style": "service-apis",
    "home": false
  },
  "service-systemes": {
    "page": "service-systemes",
    "title": "Des outils pour simplifier votre quotidien · SunScript",
    "description": "Retrouvez vos clients, devis et tâches au même endroit avec un outil adapté à votre activité et à votre équipe.",
    "style": "service-systemes",
    "home": false
  },
  "service-web": {
    "page": "service-web",
    "title": "Sites et applications pour votre activité · SunScript",
    "description": "Présentez votre activité, recevez des demandes et simplifiez la vie de vos clients avec un site ou une application conçus avec SunScript.",
    "style": "service-web",
    "home": false
  }
} as const;
export type PageKey = keyof typeof pages;
