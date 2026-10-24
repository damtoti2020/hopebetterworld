# Hope Better World : site et espace de gestion

Site de l'association **HOPE BETTER WORLD (Pour un monde meilleur)**, association loi 1901
(RNA W751253775, SIRET 753 753 983 00019), siège : 15 rue Crespin du Gast, 75011 Paris.

Une seule application web, installable comme une appli sur Android, iPhone, iPad, Windows,
macOS et Linux (PWA), sans passer par les stores.

## Ce que contient le site

**Partie publique**
- Accueil : présentation, flash vidéos, domaines d'action, prochains événements
- Nos actions : les 8 engagements de l'article 2 des statuts, bénévolat, partenariats
- Flash vidéos et galerie : vidéos courtes (YouTube, Shorts, Vimeo, MP4) et photos
- Agenda : calendrier mensuel, inscription aux événements, ajout à Google Agenda ou au calendrier du téléphone (.ics)
- L'association : bureau, fiche d'identité, statuts complets et PDF signé
- Adhérer : formulaire par catégorie de membre (actif, bienfaiteur, personne morale), lien de paiement HelloAsso
- Faire un don : ponctuel ou mensuel, montants suggérés, lien de paiement HelloAsso
- Contact : formulaire et coordonnées

**Espace gestion (bureau)**, calqué sur les statuts
- Tableau de bord : membres, taux de cotisations à jour, dons par mois, alertes
- Membres : demandes d'adhésion, agrément par le CA (art. 5), radiation avec motif (art. 6), export CSV
- Cotisations : suivi par année, encaissement, liste des e-mails à relancer
- Dons : promesses et dons reçus, saisie manuelle, export CSV
- Événements : création, places limitées, liste des inscrits
- Flash et galerie : publication de vidéos et de photos
- AG et conseils : délais de convocation (15 jours AG, 8 jours CA), texte de convocation généré,
  destinataires à jour de cotisation, procès-verbal avec calcul de la majorité
- Messages reçus via le formulaire de contact
- Paramètres : montants des cotisations, liens HelloAsso, code d'accès, sauvegarde et restauration

## Lancer le site en local

Aucun outil à installer. Depuis ce dossier :

```bash
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000. Code de l'espace gestion en démonstration : `hbw2026`.

## État actuel et étapes suivantes

Cette version stocke les données **dans le navigateur** de la personne qui l'utilise : c'est une
démonstration complète, mais les adhésions et dons saisis sur un téléphone ne sont pas visibles
depuis un autre appareil. Pour la mise en production (base de données partagée, comptes du bureau,
e-mails automatiques, paiement HelloAsso), voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

## Structure

```
index.html              page unique (application)
css/style.css           styles, thème clair et sombre
js/app.js               pages publiques et navigation
js/admin.js             espace gestion
js/data.js              données, règles tirées des statuts
js/ui.js                utilitaires d'interface
js/statuts.js           texte des statuts
js/vendor/lucide.min.js icônes (licence ISC)
manifest.webmanifest    installation comme application
sw.js                   fonctionnement hors connexion
docs/statuts-hbw.pdf    statuts signés du 3 août 2019
```
