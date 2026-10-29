# Plan de construction et validation des pages — JDV NEXORA AI STUDIO

Ce registre est le suivi central des pages. Une page ne passe à **Validée** qu'après contrôle du rendu, des interactions, des états de chargement/erreur, des droits et du responsive. Une modification CSS seule ne vaut pas validation fonctionnelle.

## Statuts
- **En cours** : inclus dans la passe transversale de cohérence responsive.
- **À vérifier** : audit fonctionnel et comparaison visuelle à effectuer.
- **Bloqué / dépendance** : une dépendance technique ou une configuration externe empêche de valider le parcours complet.
- **Validée** : seulement après vérification des critères et des contrôles automatisés.

## Registre des pages

| Page / module | Présente dans l'application | État de départ | Contrôles à terminer |
|---|---|---|---|
| Tableau de bord référentiel | Oui | En cours | Comparaison à la maquette, cartes/statistiques réelles, actions, responsive |
| Studio IA | Oui | En cours | Prompt, génération, historique, export, erreurs, chargement, mobile |
| Studio de conception visuelle | Oui | En cours | Sélecteur de page, sélection/édition/déplacement de blocs, brouillon, publication, versions |
| Mes projets | Oui | À vérifier | Création, liste, recherche/filtre, détails, états vides/erreur |
| Espace entreprise | Oui | À vérifier | Organisations, invitations, rôles, contrôles serveur et responsive |
| Académie | Oui | À vérifier | Cours, inscriptions gratuites, leçons, progression, statut clair des paiements |
| Bibliothèque de formation | Oui | À vérifier | Favoris, notes, progression, synchronisation et états vides |
| Ressources numériques | Oui | À vérifier | Recherche, filtres, source, progression, mobile |
| Vidéothèque | Oui | En cours | Cartes plateformes, actions, statut de connexion, synchronisation, mobile |
| Découverte | Oui | À vérifier | Profils, filtres pays, paniers, recherche, sources et formulaires |
| Catalogue des créateurs | Oui | À vérifier | Recherche, filtres, cartes et détails |
| Planning / chronologie | Oui | À vérifier | Recherche, dates sourcées, affichage et états vides |
| Analyses / Insights | Oui | À vérifier | Sources, états d'analyse, indicateurs non inventés, responsive |
| Feuille de route | Oui | À vérifier | Création, priorités, échéances, statuts, sauvegarde |
| Abonnement / facturation | Oui | À vérifier | Offres, statuts, gestion admin, ne pas annoncer de paiement tant qu'il n'est pas intégré |
| Administration | Oui | À vérifier | Rôles, formations, journal d'audit, droits serveur |
| Profil et compte | Oui | À vérifier | Informations, préférences, sécurité, erreurs |
| Navigation générale | Oui | À vérifier | Sidebar, en-tête, navigation, petits écrans et focus clavier |
| Vitrine publique | Oui | À vérifier | Rendu non authentifié, liens et responsive |

## Critères obligatoires avant clôture d'une page

1. Comparer la page à la maquette de référence applicable.
2. Tester chaque bouton et formulaire, y compris les erreurs et les chargements.
3. Tester les formats ordinateur, tablette et mobile.
4. Vérifier l'authentification, les rôles et les politiques côté serveur pour les opérations sensibles.
5. Confirmer que les données sont réelles ou clairement présentées comme exemples; ne pas inventer de métriques.
6. Exécuter CI et build; vérifier l'aperçu ou la production après déploiement.
7. Mettre à jour ce registre avec un résultat factuel, les blocages et la prochaine action.

## Passe transversale en cours

Une passe CSS transversale harmonise les débordements, la flexibilité des cartes/formulaires et les points de rupture responsives. Elle ne remplace pas les audits fonctionnels page par page et ne signifie pas que les maquettes ont déjà été comparées visuellement.
