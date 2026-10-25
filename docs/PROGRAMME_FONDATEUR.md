# JDV NEXORA — Programme fondateur

## Vision
JDV NEXORA est une plateforme SaaS de formation et de réalisation de projets numériques pour le marché initial de l'Afrique francophone. Elle transforme l'apprentissage en livrables concrets : contenus publiés, offres numériques, applications et micro-SaaS.

## Publics et parcours
1. **Découvrir le numérique** — débutants : compétences de base, choix d'une idée, premier produit et première vente.
2. **Créer et vendre** — créateurs et entrepreneurs digitaux : contenu, marque, audience, offres, distribution et revenus.
3. **Construire un produit** — créateurs d'applications/SaaS : UX, prototypage, données, authentification, sécurité, déploiement et acquisition.

Chaque parcours a son propre tableau de bord, des étapes adaptées et un projet final. Les utilisateurs peuvent changer de parcours sans perdre leur progression.

## Programme fondateur (12 modules)
1. Comprendre l'économie numérique et choisir une opportunité.
2. Identifier un problème et valider une idée auprès de vrais utilisateurs.
3. Concevoir une offre et un produit numérique minimum.
4. Produire du contenu utile et développer une identité de marque.
5. Acquérir une audience par des canaux organiques.
6. Concevoir une expérience utilisateur claire et accessible sur mobile.
7. Construire un premier outil ou une application.
8. Structurer un SaaS : données, rôles, API et architecture.
9. Sécuriser, tester, sauvegarder et maintenir le produit.
10. Fixer un prix, vendre et encaisser de façon adaptée au marché.
11. Acquérir, activer et fidéliser les utilisateurs.
12. Lancer, mesurer, améliorer et faire grandir le produit.

## Projets pratiques
- Parcours Découvrir : fiche d'opportunité validée, offre simple et première page de présentation.
- Parcours Créer et vendre : calendrier éditorial, bibliothèque de contenus, page d'offre et plan d'acquisition.
- Parcours Construire : prototype mobile, application connectée à une base de données, règles d'accès et déploiement préparé.
Chaque module doit produire un livrable vérifiable, pas uniquement une vidéo ou un texte à lire.

## Coffrets numériques
- Starter Digital : bases, outils et plan de démarrage.
- Content Creator : calendrier, scripts, formats et système de publication.
- Digital Product : validation, positionnement, offre et page de vente.
- Organic Growth : stratégie éditoriale, distribution et mesure.
- App Builder : cadrage, UX, prototype et plan de construction.
- SaaS Blueprint : modèle de données, rôles, sécurité et architecture.
- Launch & Sales : lancement, messages commerciaux et suivi.
- AI Workflow : processus assistés par IA, modèles et contrôles qualité.

Un coffret est un ensemble de ressources et d'exercices versionnés. Il ne doit pas être présenté comme une fonctionnalité interactive tant que celle-ci n'est pas construite.

## Modèle économique
- **Gratuit** : accès limité mais réellement utile aux cours de base, à un parcours et au suivi essentiel.
- **Premium** : parcours complets, projets avancés, coffrets inclus selon l'offre et outils de productivité.
- **Coffrets à l'unité** : achat ponctuel de ressources spécialisées.
Les prix, moyens de paiement, taxes et disponibilité doivent être confirmés pour chaque pays avant activation. Ne jamais simuler un paiement réussi.

## Architecture fonctionnelle cible
- Authentification et profil.
- Onboarding et choix du parcours.
- Tableau de bord et reprise de progression.
- Académie : parcours, modules, leçons et exercices.
- Projet Lab : livrables, jalons, tâches et notes.
- Coffrets : catalogue, accès et progression.
- Offres et abonnements : droits calculés côté serveur, jamais sur la seule interface.
- Administration : gestion du contenu, publication, utilisateurs et indicateurs.

## Ordre de développement
1. **Stabiliser l'existant** : vérifier compilation, dépendances, variables d'environnement, migrations et politiques RLS.
2. **Socle utilisateur** : profil, onboarding, parcours actif et permissions.
3. **Académie MVP** : catalogue de cours réel, modules, leçons, exercices et progression sauvegardée.
4. **Projet Lab** : tâches, jalons, livrables et reprise de projet.
5. **Coffrets** : catalogue et contrôle des droits d'accès.
6. **Premium et paiements** : fournisseur adapté aux pays ciblés, webhooks vérifiés et accès piloté par le serveur.
7. **Administration et lancement** : édition de contenu, tests, monitoring, sauvegardes et déploiement.

## Principes de qualité
- Priorité à une expérience mobile, rapide, accessible et en français clair.
- Aucune clé secrète dans le frontend ou dans Git.
- Toute donnée privée doit être protégée par des politiques RLS testées.
- Le rôle administrateur doit être vérifié côté serveur/base de données.
- Les contenus de démonstration doivent être explicitement identifiés.
- Mesurer activation, progression, projets terminés, rétention et conversion.
- Livrer par petites étapes testables ; ne pas déclarer une fonctionnalité prête sans l'avoir vérifiée.

## Définition du MVP
Un utilisateur peut créer un compte, choisir son parcours, suivre une leçon, terminer un exercice, sauvegarder sa progression, gérer un projet pratique et retrouver son travail à la prochaine connexion. L'administration peut publier le contenu de départ. Le paiement vient après la validation du parcours gratuit et des permissions.
