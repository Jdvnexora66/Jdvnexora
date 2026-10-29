# Construction des 17 écrans — JDV NEXORA AI STUDIO

## Règle d'architecture

Le **tableau de bord référentiel reste la référence approuvée**. Il ne doit pas être reconstruit ni recevoir les indicateurs ajoutés aux pages métier. Les pages doivent réutiliser les composants, tables, fonctions Edge et règles RLS déjà présents dans le dépôt et la base Supabase. On ne crée pas une deuxième table lorsque la source existante répond déjà au besoin.

Les composants de synthèse métier affichent des valeurs calculées à partir des données que chaque module a réellement chargées et nomment leurs sources. Ils n'interrogent pas eux-mêmes la base et ne remplacent pas les tests fonctionnels.

## Registre des 17 écrans

| Nº | Écran | Composant / parcours actuel | Sources principales | État du travail |
|---:|---|---|---|---|
| 1 | Tableau de bord référentiel | `ReferenceDashboard` dans `App.tsx` | `profiles`, `studio_projects`, `studio_assets` | Référence à conserver; régression visuelle uniquement |
| 2 | Studio de création IA | `StudioIA` | `studio_ai_messages`; Edge Function `studio-ai` | Écran et historique présents; génération, quota, RLS et erreurs à vérifier |
| 3 | Mes projets et éditeur | `App.tsx` | `studio_projects`, `studio_assets`, `studio_project_members` | Création, recherche, filtres et édition présents; audit du CRUD et de l'isolation restant |
| 4 | Studio de conception visuelle | `VisualDesignStudio`, `PublishedVisualLayout` | `visual_studio_layouts`, `visual_studio_versions`, `visual_studio_publications` | Aperçu natif, brouillon et blocs personnalisés présents; liaison des blocs, versions, publication et édition de chaque composant natif à valider séparément |
| 5 | Espace entreprise et équipe | `OrganizationPanel`, `CollaborationPanel` | `organizations`, `organization_members`, `organization_invitations`, `studio_project_members`, `studio_project_comments` | Organisation et invitations implémentées; rôles, parcours et politiques serveur à tester |
| 6 | Profil et préférences | Formulaire de profil dans `App.tsx` | `profiles`, session Supabase Auth | Informations, langue et fuseau horaire modifiables; test de sauvegarde et récupération à terminer |
| 7 | Administration | `AdminPanel`, `CourseLessonManager` | `profiles`, `audit_logs`, `nexora_courses`, `nexora_course_lessons` | Interface de gestion présente; contrôle de tous les rôles et actions serveur requis |
| 8 | Académie | `Academy` | `nexora_learning_paths`, `nexora_learning_modules`, `nexora_learning_progress`, `nexora_courses`, `nexora_course_enrollments`, `nexora_course_lessons` | Catalogue, parcours et inscription gratuite présents; progression et accès aux leçons à tester |
| 9 | Bibliothèque de formation | `LearningLibrary` | `user_learning_items`, `entrepreneurs`, `content_items` | Notes, favoris et progression présents; persistance et isolation à tester |
| 10 | Ressources numériques | `ResourceLibrary` | `nexora_resources`, `nexora_resource_progress` | Catalogue filtrable et progression présents; disponibilité des ressources et actions à vérifier |
| 11 | Découvrir | `Discover` | `entrepreneurs`, `content_sources`, `followed_entrepreneurs` | Recherche, pays, sources, paniers et suivi présents; contrôle de qualité des résultats à terminer |
| 12 | Vidéothèque et catalogue des créateurs | `MediaLibrary`, `CreatorCatalog` | `media_library_items`, Storage `nexora-media`; Edge Functions `media-integrations`, `sync-public-creators` | Interface, liens et intégrations présents; synchronisation, connexion et droits à vérifier |
| 13 | Roadmap | `Roadmap` | `roadmap_tasks` | Objectifs, priorités, échéances et statuts présents; toutes les mutations à tester |
| 14 | Timeline / chronologie | `Timeline` | `timeline_events`, `entrepreneurs`, `content_sources` | Frise et recherche présentes; sources des dates et états vides à tester |
| 15 | Analyses / Insights | `Insights` | `content_items`, relation `content_analyses` | Contenus et analyses existants; aucune métrique ne doit être inventée |
| 16 | Abonnement et facturation | `BillingPanel` | `plans`, `subscriptions` | Consultation des forfaits et du statut présente; ne pas annoncer de paiement réussi tant que le parcours serveur n'est pas intégré et vérifié |
| 17 | Vitrine publique et authentification | `PublicVitrine`, formulaire d'authentification de `App.tsx` | Contenu public dans le dépôt; Supabase Auth pour connexion/inscription | Interface présente et raccord de navigation en cours de validation; liens, formulaire de contact et mobile à tester |

## Raccordement des blocs du Studio Design

`src/lib/pageDataBindings.ts` fournit une **liste blanche** de sources de données en lecture seule. Les blocs personnalisés de type texte, carte et statistique peuvent être reliés à une clé autorisée, par exemple `projects.total`, `media.total`, `resources.published`, `courses.published`, `roadmap.open` ou `academy.enrollments`.

- Les valeurs privées sont filtrées sur l'identifiant de l'utilisateur connecté, et les politiques RLS continuent de s'appliquer.
- Le concepteur n'accepte ni nom de table libre, ni SQL, ni expression exécutable.
- Une source absente ou en erreur doit être montrée comme indisponible, pas remplacée par une fausse statistique.
- Les configurations publiées et les brouillons sont distincts; la publication est une action explicite.
- Le mode « Page réelle » affiche l'écran métier sélectionné. Le canevas éditable compose les blocs de disposition et leurs styles/données. **L'édition arbitraire de tout élément natif de chaque écran n'est pas considérée comme terminée simplement parce que l'aperçu existe** : elle reste un critère séparé avant de déclarer le Studio Design achevé.

## Couche commune des pages métier

Les pages métier utilisent `ModuleDataOverview` pour afficher les compteurs déjà calculés par les modules, l'état de chargement/erreur et les sources raccordées. Ce composant ne fait pas de requête et ne prétend pas vérifier que les données sont correctes. La page référentielle est explicitement exclue de cette couche.

## Critères obligatoires avant de déclarer une page terminée

1. Tester chaque bouton, formulaire et transition ainsi que les états de chargement, vide, succès et erreur.
2. Contrôler le rendu sur ordinateur, tablette et mobile, et la navigation clavier.
3. Vérifier chaque table, Storage et Edge Function contre la base réellement utilisée.
4. Tester les permissions serveur/RLS, y compris l'accès interdit entre deux comptes et entre deux organisations.
5. Distinguer une source configurée d'une intégration réellement opérationnelle.
6. Exécuter CI et build, puis vérifier le déploiement qui correspond au dernier commit.
7. Mettre à jour ce registre avec des résultats observés. Une page présente dans le code n'est pas automatiquement validée.

## Passe commune déjà intégrée

- Une passe de différenciation visuelle est ajoutée aux modules métier sans cibler le tableau de bord référentiel.
- Les blocs de synthèse et les sources sont visibles dans les pages métier existantes.
- Le Studio Design possède un aperçu de page native et les blocs personnalisés peuvent utiliser des sources de données de la liste blanche.
- Le Studio IA, les projets, les médias, la progression d'apprentissage, les rôles et la facturation requièrent encore des tests fonctionnels ciblés avant une clôture globale.
