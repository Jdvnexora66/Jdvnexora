# JDV NEXORA — feuille de route produit et technique

## Vision
JDV NEXORA est une plateforme indépendante pour observer, suivre, comprendre, analyser, apprendre, créer et développer. Elle rassemble des profils d'entrepreneurs, des parcours documentés, des contenus publics et des ressources transformables en plans d'action, livres, formations, applications et produits SaaS.

## Modules produit
- **Discover** : recherche et découverte d'entrepreneurs, secteurs, pays, profils et sources.
- **Timeline** : chronologie des étapes importantes, avec date, source et niveau de confiance.
- **Insights** : synthèses, idées clés, modèles économiques, stratégies et plans d'action. Une analyse générée doit rester identifiable comme telle et ses sources doivent être consultables.
- **Studio** : espace personnel pour écrire et organiser des projets, chapitres, notes et ressources.
- **Build** : préparation de produits concrets (ebook, formation, document, application et SaaS).
- **Roadmap** : objectifs, tâches, progression et étapes de réalisation.
- **Compte & bibliothèque** : favoris, entrepreneurs suivis, notes privées, progression d'apprentissage, notifications et préférences.

## Principes non négociables
1. JDV NEXORA reste un projet GitHub/Supabase indépendant : ne pas mélanger ses dépôts, données, secrets ou bases avec d'autres projets JDV.
2. Les sources publiques sont conservées avec URL canonique, éditeur, date et notes de vérification lorsque disponibles.
3. Ne jamais inventer une citation, une date, une statistique ou une stratégie attribuée à une personne. Distinguer faits sourcés, inférences et recommandations IA.
4. Chaque donnée privée est protégée par Row Level Security et liée à l'utilisateur authentifié.
5. Les clés de service et secrets ne doivent jamais être livrés au navigateur ou commités.
6. Les intégrations YouTube/réseaux sociaux doivent respecter les API officielles, leurs quotas, les droits d'auteur et les conditions des plateformes. Ne pas prétendre avoir synchronisé un compte sans intégration réelle.
7. Aucun bouton ne doit annoncer une action qui n'est pas implémentée.

## Architecture de données
La migration 20261025090000_nexora_research_intelligence_schema.sql pose les tables pour profils, entrepreneurs, sources, comptes sociaux, contenus, analyses, chronologies, abonnements, ressources d'apprentissage, notifications et tâches de synchronisation. Les données publiques et les données personnelles ont des politiques RLS distinctes.

## Ordre de réalisation
### Phase 1 — fondations
- Authentification, profil et permissions.
- Schéma SQL, index, politiques RLS et vérification de migrations.
- Studio existant : projets, chapitres, sauvegarde, suppression et états vides.
- Tests de build et de sécurité.

### Phase 2 — bibliothèque et Discover
- Recherche par nom, pays, secteur.
- Fiches d'entrepreneurs et comptes publics vérifiés.
- Sources consultables et indicateur de vérification.
- Favoris et suivi privé.

### Phase 3 — Timeline et veille
- Événements datés reliés à des sources.
- Import de contenus par intégrations autorisées.
- File de tâches de synchronisation, statuts et gestion d'erreurs.
- Notifications utilisateur.

### Phase 4 — Insights
- Résumés, enseignements, modèles économiques, stratégies et plans d'action.
- Traçabilité des sources, date d'analyse et statut de revue.
- Connexion à un fournisseur IA uniquement après configuration sécurisée côté serveur.

### Phase 5 — apprentissage et monétisation
- Notes privées, favoris, progression et objectifs.
- Quotas et limites freemium côté serveur, puis offre Premium.
- Guides et ressources premium avec contrôle d'accès.

### Phase 6 — Studio, Build et Roadmap
- Transformer les notes et analyses en briefs de livres, formations, applications et SaaS.
- Plans de projet, tâches, progression et export.
- Contrôles de qualité, sauvegarde et historique des modifications.

## État actuel
- Authentification Supabase et Studio de projets/chapitres présents dans l'application.
- Raccourci de sauvegarde et compteurs de texte ajoutés.
- Suppression de chapitre avec confirmation ajoutée.
- Schéma de recherche et d'intelligence publié comme migration ; son application à l'instance Supabase et son exécution doivent encore être vérifiées.
- Les modules Discover, Timeline et Insights nécessitent encore l'interface, les tests et les intégrations réelles avant d'être considérés comme terminés.
