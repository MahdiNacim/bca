# Audit du prototype ThermoClair

## Fonctionnel dans le fichier d'origine

- Calcul dynamique du budget, de la puissance et du temps de pose.
- Synchronisation des cartes de solution avec le simulateur.
- Validation locale des champs principaux.
- Génération et copie d'un récapitulatif.
- Brouillon conservé dans `localStorage`.
- Mise en page responsive et thème sombre.

## Limites et corrections nécessaires

1. **Le formulaire n'envoie rien** : la soumission masque seulement le formulaire et affiche un texte local.
2. **Aucune persistance serveur** : aucun prospect n'est enregistré de façon fiable ou partagée.
3. **Aucune notification e-mail** : aucun SMTP ni mécanisme de reprise en cas d'échec.
4. **Aucun espace administrateur** : absence d'authentification, de suivi et de qualification.
5. **Données personnelles dans `localStorage`** : nom, e-mail et téléphone restent dans le navigateur. La nouvelle version ne conserve que les choix du simulateur localement.
6. **Estimation uniquement côté client** : les chiffres pourraient être falsifiés. La nouvelle API recalcule l'estimation côté serveur.
7. **Validation e-mail trop permissive** : expression régulière minimale. La nouvelle API valide strictement le payload.
8. **Fichier issu d'un Artifact** : absence de structure HTML autonome complète. La nouvelle application utilise des pages HTML standard.
9. **Pas de protection anti-abus** : la nouvelle API ajoute limitation de débit, champ piège et limites de taille.
10. **Identité générique ThermoClair** : la nouvelle interface est marquée BCA, tout en conservant la structure et le langage visuel technique.
11. **Coordonnées et identité BCA inconnues** : aucun téléphone, logo ou e-mail officiel ne doit être inventé. Ils sont donc configurables dans `.env`.
12. **Accessibilité** : le prototype est globalement correctement étiqueté, mais la nouvelle version doit aussi gérer explicitement les états réseau, le focus et les erreurs serveur.

## Décision d'architecture

Une application monolithique Node.js/Express sert le frontend statique et une API JSON. Les prospects sont traites en memoire et les identifiants administrateur viennent du fichier d'environnement. Cette architecture reste simple a lancer sur Windows, tout en separant clairement interface, logique metier, validation et notifications.
