# Construction des pages métier — suivi continu

Le tableau de bord référentiel est la référence visuelle approuvée. Il est conservé comme référence et ne fait pas partie de la reconstruction des pages métier.

## Ordre de production

1. **Studio IA** — priorité métier immédiate : prompt, envoi, réponse, chargement, erreurs, confidentialité, contexte et responsive.
2. **Mes projets** — liste, création, recherche, filtres, détails, états vides et erreurs.
3. **Espace entreprise** — organisations, sélection de l'espace, invitations, rôles, validation côté serveur et mobile.
4. **Académie** — catalogue, cartes de cours, leçons, progression, états d'accès et clarté sur les paiements.
5. **Bibliothèque de formation** — notes, progression, favoris et persistance.
6. **Ressources numériques** — recherche, filtres, sources, actions et progression.
7. **Découverte et catalogue des créateurs** — recherche, pays, filtres, fiches, paniers et sources.
8. **Vidéothèque** — intégrations facultatives, statut de connexion, synchronisation et actions.
9. **Planning / chronologie** — événements, dates sourcées, recherche et états vides.
10. **Analyses** — résultats sourcés, états de chargement/erreur et aucune métrique inventée.
11. **Feuille de route** — tâches, statuts, priorités, échéances et sauvegarde.
12. **Abonnement et facturation** — offres, état réel de l'abonnement, administration; aucun paiement présenté comme opérationnel s'il ne l'est pas.
13. **Administration** — utilisateurs, contenus, rôles et permissions serveur.
14. **Profil et compte** — identité, préférences, sécurité et erreurs.
15. **Vitrine publique et navigation générale** — liens, menus, responsive et focus clavier.

## Statuts initiaux

- Tableau de bord référentiel : **Référence conservée**.
- Studio Design : **En cours** — aperçu de la page réelle fusionné; l'édition directe des composants métier natifs reste à construire et valider.
- Pages métier listées ci-dessus : **À valider individuellement**. Une passe responsive commune ne suffit pas à déclarer leur fonctionnement terminé.

## Critères de clôture obligatoires

Pour chaque page, avant de la déclarer terminée :
- comparer visuellement à la référence ou au système de design retenu;
- essayer chaque bouton et formulaire, y compris erreurs et chargement;
- tester ordinateur, tablette et mobile;
- vérifier la source des données, les états vides et les liens;
- contrôler les rôles et les autorisations côté serveur pour toute action sensible;
- exécuter CI et build, puis contrôler le déploiement;
- noter les blocages restants et la prochaine action.

## Passe actuelle

Passe 1 : renforcer la robustesse responsive des pages métier existantes (Studio IA, projets, organisation, Académie, bibliothèques, découverte, planning, analyses, roadmap, facturation et administration). Cette passe ne remplace pas les tests fonctionnels page par page.
