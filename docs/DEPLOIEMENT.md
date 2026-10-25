# Mise en ligne de Hope Better World

Le parcours prévu : **tester sur GitHub Pages**, puis **mettre en production sur Hostinger**,
puis **faire pointer hopebetterworld.org** (aujourd'hui chez Amen) vers Hostinger.

## 1. Version de test sur GitHub Pages (gratuit)

1. Dépôt `hopebetterworld` → **Settings** → **General** → tout en bas, **Change visibility** → **Public**.
2. **Settings** → **Pages** → Source : *Deploy from a branch*, branche `main`, dossier `/ (root)` → **Save**.
3. Après 1 à 2 minutes, le site de test est en ligne sur
   **https://damtoti2020.github.io/hopebetterworld/**.

Chaque fusion dans `main` met à jour ce site de test automatiquement.

## 2. Deux modes de fonctionnement

Le site choisit tout seul son mode au démarrage :

- **Mode démo** (GitHub Pages, aperçu) : aucune base de données, tout est gardé dans le
  navigateur. Espace gestion ouvert avec le code d'accès de démonstration.
- **Mode serveur** (Hostinger) : dès que le dossier `api/` répond, les adhésions, dons,
  inscriptions et messages sont enregistrés dans **MySQL**. L'espace gestion demande alors
  un **e-mail et un mot de passe** propres à chaque membre du bureau.

Ce que voit un visiteur en mode serveur : les projets publiés, l'agenda, les vidéos flash
publiées et les noms des membres du bureau. Jamais les e-mails, cotisations, dons ou messages.
Un visiteur peut seulement *ajouter* : demande d'adhésion, promesse de don, message,
inscription à un événement.

## 3. Mise en production sur Hostinger

**Une seule fois :**
1. hPanel Hostinger → **Sites web** → ajouter `hopebetterworld.org`.
2. hPanel → **Bases de données** → **MySQL** : créer une base et un utilisateur.
   Noter le nom de la base, l'utilisateur et le mot de passe.
3. hPanel → **Fichiers** → **Comptes FTP** : noter le serveur, l'identifiant et le mot de passe.
4. GitHub → dépôt → **Settings** → **Secrets and variables** → **Actions** → créer
   `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.
5. GitHub → onglet **Actions** → **Déployer sur Hostinger** → **Run workflow**.
6. hPanel → **Gestionnaire de fichiers** → `public_html/api/` : copier `config.sample.php`
   en **`config.php`** et y remplir le nom de la base, l'utilisateur et le mot de passe MySQL.
   ⚠️ Ce fichier contient le mot de passe : il reste uniquement chez Hostinger,
   **jamais sur GitHub** (il est exclu du dépôt et du déploiement).
7. Ouvrir `https://<adresse du site>/api/install.php` et créer le **premier compte du bureau**.
   La page se bloque ensuite d'elle-même.
8. Ouvrir **Espace gestion**, se connecter : le site est initialisé avec les informations de
   l'association (statuts, bureau, instances), sans les données d'exemple.
9. **Paramètres** : coller les liens HelloAsso, ajouter une photo d'accueil, créer les comptes
   des autres membres du bureau (**Comptes du bureau**).

**À chaque mise en production :** GitHub → onglet **Actions** → **Déployer sur Hostinger** →
**Run workflow**. Les fichiers de `main` sont copiés dans `public_html/` ; les données MySQL
et `api/config.php` ne sont pas touchés.

Le site peut être vérifié chez Hostinger avec l'adresse temporaire fournie par hPanel
avant de toucher au nom de domaine.

## 4. Faire pointer hopebetterworld.org vers Hostinger (chez Amen)

⚠️ **Avant toute modification, vérifiez si des adresses e-mail en `@hopebetterworld.org`
sont utilisées chez Amen.** Changer les serveurs DNS coupe ces boîtes si rien n'est prévu.

- **Option A, recommandée si aucune adresse e-mail n'utilise le domaine** : dans l'espace client
  Amen → nom de domaine → **Serveurs DNS**, remplacer par ceux indiqués par Hostinger
  (`ns1.dns-parking.com` et `ns2.dns-parking.com` en général, à confirmer dans hPanel).
- **Option B, si des e-mails tournent chez Amen** : garder les DNS chez Amen et modifier
  seulement l'enregistrement **A** de `hopebetterworld.org` et le **CNAME** `www`
  avec les valeurs données par Hostinger. Les enregistrements MX (e-mails) restent intacts.

La propagation prend de quelques minutes à 48 h. Activer ensuite le **SSL gratuit**
dans hPanel (HTTPS).

Le transfert complet du domaine d'Amen vers Hostinger est possible plus tard, mais n'est pas
nécessaire pour que le site fonctionne.

## 5. Paiements avec HelloAsso (gratuit pour les associations)

1. Créer le compte de l'association sur helloasso.com (RNA et SIRET requis).
2. Créer une **campagne d'adhésion** avec les tarifs votés en AG, et un **formulaire de don**.
3. Coller les deux liens dans **Espace gestion → Paramètres → Paiement en ligne**.

## Données personnelles (RGPD)

- Ajouter une page « Mentions légales et confidentialité » (responsable : le président,
  hébergeur : Hostinger).
- Ne collecter que le nécessaire, permettre la suppression sur demande.
