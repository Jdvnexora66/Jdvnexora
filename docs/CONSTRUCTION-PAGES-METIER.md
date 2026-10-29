# Construction des pages métier — suivi en parallèle

Le tableau de bord référentiel reste la référence visuelle approuvée : il ne doit pas être reconstruit. La production avance désormais en **chantiers parallèles**, avec un registre unique pour éviter les pages oubliées.

## Chantiers parallèles

### A — Création et édition
- Studio IA : envoi, réponse, historique privé, quota, erreurs et états réseau.
- Mes projets : création, recherche, filtres, édition, statut, suppression, ressources et isolation B2B.
- Studio Design : aperçu réel de la page choisie, brouillon indépendant, édition, historique et publication explicite.

### B — Espaces et identité
- Espace entreprise : organisations, membres, invitations, rôles et autorisations côté serveur.
- Profil et compte : préférences, session, récupération de compte et messages d'erreur.
- Administration : garde-fous de rôle, gestion des contenus et retours d'action.

### C — Contenus et apprentissage
- Académie : catalogue, cours, leçons, progression et transparence sur les paiements.
- Bibliothèque de formation : notes, progression, favoris et persistance.
- Ressources numériques : recherche, filtres, sources, actions et états vides.
- Découverte / créateurs : recherche, pays, fiches, paniers et sources.
- Vidéothèque : intégrations, connexions, synchronisation et actions.

### D — Pilotage et modèle commercial
- Planning / chronologie : dates sourcées, recherche, création et états vides.
- Analyses / Insights : données sourcées, chargement/erreur, aucune métrique inventée.
- Feuille de route : tâches, statuts, priorités, échéances et sauvegarde.
- Abonnement / facturation : offres et statut réel; aucun paiement simulé comme réussi.

### E — Parcours global
- Navigation, vitrine publique, responsive ordinateur/tablette/mobile, accessibilité clavier, authentification et parcours de retour après connexion.
- Intégration croisée entre pages : chaque bouton doit mener à une action ou une destination réelle, pas à un simple décor.

## Registre de départ

| Zone | État connu | Prochaine vérification |
|---|---|---|
| Tableau de bord référentiel | Référence conservée | Régression visuelle uniquement |
| Studio IA | États d'attente/erreur et historique présents dans le code | Tester fonction Edge, quotas, RLS et reprise après erreur |
| Mes projets | CRUD et filtres présents dans le code | Vérifier les politiques RLS, appartenance organisationnelle et toutes les transitions |
| Studio Design | Aperçu réel et brouillon séparé fusionnés | Édition des composants natifs, brouillon persistant, aperçu sans mutation de production |
| Espaces/Profil/Admin | Interfaces présentes | Vérifier chaque permission sur le serveur et les cas non autorisés |
| Académie/Bibliothèques/Ressources | Interfaces présentes; certains services externes peuvent manquer | Tester persistance, source des données et états d'intégration absente |
| Découverte/Vidéothèque | Interfaces présentes | Tester les intégrations facultatives, validation des URLs et droits |
| Planning/Insights/Roadmap | Interfaces présentes | Vérifier persistance, sources et états sans données |
| Facturation | L'interface indique que les paiements automatisés ne sont pas ouverts | Garder ce garde-fou tant que le paiement serveur n'est pas validé |
| Navigation/vitrine publique | À vérifier transversalement | Vérifier chaque lien, route, session et affichage mobile |

## Critères de clôture communs

Une page n'est déclarée terminée qu'après :
1. test réel de chaque bouton/formulaire et des états chargement, vide, succès et erreur;
2. contrôle responsive ordinateur, tablette et mobile;
3. vérification de la source de données, de la persistance et de la gestion des erreurs;
4. vérification des autorisations côté serveur/RLS pour toute donnée privée ou action sensible;
5. contrôle de navigation et d'accessibilité clavier;
6. CI/build réussis, puis vérification du déploiement effectif;
7. mise à jour de ce registre avec résultat et blocages restants.

## Passe déjà effectuée

- Une passe responsive commune a été fusionnée dans `main`; elle ne vaut pas validation fonctionnelle.
- L'aperçu de page réelle du Studio Design a été fusionné; l'édition directe des composants métier natifs reste ouverte.
- Correction en cours : la page Profil doit aussi être accessible dans l'aperçu du Studio Design.
- Sécurité : ne pas affaiblir RLS, ne pas exposer de clés serveur, ne pas présenter les paiements ou intégrations comme opérationnels sans vérification.
