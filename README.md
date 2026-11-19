# BCA Énergies

Application locale Windows pour présenter les services BCA, simuler une installation de pompe à chaleur, recevoir des demandes de devis et gérer les prospects.

## État du projet

Le code de l'application est terminé et testé. L'ancien prototype a été déplacé dans `archive/` afin qu'il ne soit plus confondu avec l'application réelle.

Les coordonnées légales publiques ont été vérifiées le 10 novembre 2026 : BCA, SIREN 107 480 279, SIRET 107 480 279 00010, siège 14 rue Friedland à Bourges, SASU au capital de 1 000 €. Restent à fournir avant publication : téléphone, e-mail, zone d'intervention précise, responsable de publication, qualifications vérifiées, paramètres SMTP et choix d'un hébergeur. Aucune publication en ligne n'a été effectuée.

## Architecture

- `public/` : site, simulateur, administration et pages légales
- `src/` : API Express, authentification, validation, stockage mémoire et e-mail
- `scripts/` : installation et lancement sous Windows
- `tests/` : tests métier du simulateur
- `archive/` : ancien prototype, à ne pas ouvrir comme application

## Installation sous Windows

Pré-requis :

- Node.js 22 ou plus récent.

### Installation guidée

1. Ouvrez PowerShell dans ce dossier.
2. Exécutez :

```powershell
.\scripts\setup-windows.ps1
```

Le script crée `.env` s'il est absent, installe les dépendances et lance les tests.

### Configuration obligatoire

Ouvrez `.env` et remplacez au minimum :

- `JWT_SECRET` par au moins 32 caractères aléatoires ;
- `ADMIN_EMAIL` et `ADMIN_PASSWORD` ;
- `BCA_PHONE`, `BCA_PHONE_LINK`, `BCA_EMAIL` ;
- `BCA_LEGAL_NAME`, `BCA_ADDRESS`, `BCA_SIRET`, `BCA_SERVICE_AREA` ;
- les paramètres SMTP pour recevoir les notifications.

## Lancement

```powershell
.\scripts\start-windows.ps1
```

Le navigateur s'ouvre automatiquement :

- Site public : `http://localhost:3179`
- Administration : `http://localhost:3179/admin`
- Santé technique : `http://localhost:3179/api/health`

## Administration

L'espace sécurisé permet :

- la recherche et le filtrage des prospects ;
- le suivi des statuts et des notes ;
- l'affichage du détail tarifaire ;
- un résumé des prospects ;
- l'export CSV ;
- l'anonymisation individuelle ;
- l'anonymisation des dossiers ayant dépassé la durée de conservation.

Les prospects sont conservés uniquement en mémoire dans le processus Node.js. Un redémarrage de l'application efface ces données.

## Simulateur

Le référentiel tarifaire français a été vérifié le 10 novembre 2026. Le calcul prend en compte surface, pièces, isolation, logement, complexité, puissance et eau chaude sanitaire. Il sépare matériel, main-d'œuvre et travaux complémentaires, puis affiche un prix TTC avant aides.

La simulation ne constitue pas un devis. La visite BCA doit confirmer les déperditions, le matériel, la faisabilité, la TVA et les aides. Aucune aide n'est déduite automatiquement.

## Sécurité et confidentialité

- mot de passe administrateur via variables d'environnement ;
- session administrateur en cookie `HttpOnly`, `SameSite=Strict` ;
- limitation du débit sur le formulaire et la connexion ;
- validation Zod côté serveur ;
- CSP et en-têtes Helmet ;
- contrôle de l'origine des requêtes d'écriture ;
- aucune donnée de contact stockée dans `localStorage` ;
- durée de conservation configurable avec anonymisation ;
- pages de confidentialité et mentions légales à compléter avant publication.

## Notifications e-mail

Si `SMTP_HOST` ou `LEAD_NOTIFICATION_TO` reste vide, les demandes sont enregistrées mais les notifications sont marquées `disabled`. En cas d'échec SMTP, le prospect reste enregistré avec l'état `failed`.
