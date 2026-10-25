# Mise en ligne de Hope Better World

## 1. Publier le site (gratuit)

**Option conseillée : GitHub Pages**, puisque le code est déjà sur GitHub.

1. Sur GitHub, ouvrir le dépôt `hopebetterworld` → **Settings** → **Pages**.
2. Source : *Deploy from a branch*, branche `main`, dossier `/ (root)`.
3. Le site est disponible quelques minutes plus tard à `https://damtoti2020.github.io/hopebetterworld/`.

Alternative : Netlify ou Cloudflare Pages (glisser-déposer du dossier, ou connexion au dépôt).

## 2. Brancher le nom de domaine hopebetterworld.org

1. Dans **Settings → Pages → Custom domain**, saisir `hopebetterworld.org`.
2. Chez le registraire du domaine, créer les enregistrements DNS indiqués par GitHub
   (4 enregistrements `A` vers les adresses GitHub Pages, et un `CNAME` `www` vers `damtoti2020.github.io`).
3. Cocher **Enforce HTTPS** une fois le certificat émis.

À faire seulement quand la nouvelle version est validée, car l'ancien site cessera d'être servi.

## 3. Paiements avec HelloAsso (gratuit pour les associations)

1. Créer le compte de l'association sur helloasso.com (RNA et SIRET requis, justificatifs du président).
2. Créer une **campagne d'adhésion** avec les tarifs votés en AG, et un **formulaire de don**.
3. Coller les deux liens dans **Espace gestion → Paramètres → Paiement en ligne**.

Les boutons « Payer ma cotisation » et « Finaliser le paiement » apparaissent alors automatiquement.

## 4. Base de données partagée (Supabase, offre gratuite)

Aujourd'hui, les données restent dans le navigateur. Pour que tout le bureau voie les mêmes membres,
dons et inscriptions depuis n'importe quel appareil :

1. Créer un projet sur supabase.com (région Europe).
2. Créer une table par collection de `js/data.js` : `membres`, `cotisations`, `dons`, `evenements`,
   `flashs`, `medias`, `instances`, `messages`, et une table `settings`.
3. Activer **Supabase Auth** : un compte par membre du bureau (président, vice-président, secrétaire, trésorier),
   à la place du code d'accès unique.
4. Règles de sécurité (RLS) : le public peut seulement *créer* une adhésion, une promesse de don,
   une inscription ou un message ; seul le bureau peut lire et modifier.
5. Remplacer `load()` et `persist()` de `js/data.js` par des appels au client Supabase.
6. Stocker photos et vidéos dans **Supabase Storage** plutôt que dans le navigateur.

## 5. E-mails automatiques (optionnel)

Avec Supabase (fonctions Edge) et un service d'envoi (Brevo, gratuit jusqu'à 300 e-mails par jour) :
accusé de réception d'adhésion, confirmation d'inscription à un événement, envoi des convocations
d'AG directement depuis l'espace gestion.

## Données personnelles (RGPD)

- Ajouter une page « Mentions légales et confidentialité » (responsable : le président).
- Ne collecter que le nécessaire, permettre la suppression sur demande (déjà possible dans Membres).
- Le registre prévu par la loi de 1901 (art. 12) correspond aux procès-verbaux archivés dans « AG et conseils ».
