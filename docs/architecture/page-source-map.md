# Carte des pages et de leurs sources — JDV NEXORA AI STUDIO

Cette carte répertorie les sources appelées par le dépôt. Une table citée ici n'est pas considérée comme validée fonctionnellement tant que l'appel réel, les données renvoyées, les erreurs et les politiques RLS n'ont pas été contrôlés.

| Nº / Page | Composant | Source principale | Actions / notes de sécurité |
|---:|---|---|---|
| 1. Tableau de bord référentiel | `ReferenceDashboard` dans `App.tsx` | `profiles`, `studio_projects`, `studio_assets` | Référence visuelle conservée; pas de refonte ni de `ModuleDataOverview` |
| 2. Studio IA | `StudioIA` | `studio_ai_messages` | Edge Function `studio-ai`; historique filtré par `user_id`, quotas calculés côté serveur |
| 3. Mes projets | liste et éditeur dans `App.tsx` | `studio_projects`, `studio_assets`, `studio_project_members` | Propriétaire/membre autorisé par RLS; isolation d'organisation à vérifier |
| 4. Studio Design | `VisualDesignStudio`, `PublishedVisualLayout` | `visual_studio_layouts`, `visual_studio_versions`, `visual_studio_publications` | Accès administrateur; configuration versionnée, publication explicite; blocs personnalisés reliés via liste blanche |
| 5. Entreprise / équipe | `OrganizationPanel`, `CollaborationPanel` | `organizations`, `organization_members`, `organization_invitations`, `studio_project_members`, `studio_project_comments` | Les invitations passent par `invite-organization-member` et `accept-organization-invitation` |
| 6. Profil | formulaire dans `App.tsx` | `profiles`, session Supabase Auth | Le rôle est en lecture seule dans le profil; les droits sont contrôlés côté serveur |
| 7. Administration | `AdminPanel`, `CourseLessonManager` | `profiles`, `audit_logs`, `nexora_courses`, `nexora_course_lessons` | Accès réservé au rôle autorisé; valider les politiques côté serveur |
| 8. Académie | `Academy` | `nexora_learning_paths`, `nexora_learning_modules`, `nexora_learning_progress`, `nexora_courses`, `nexora_course_enrollments`, `nexora_course_lessons` | Progression par utilisateur; paiement des formations payantes non déclaré actif |
| 9. Bibliothèque de formation | `LearningLibrary` | `user_learning_items`, `entrepreneurs`, `content_items` | Notes, favoris et progression privés |
| 10. Ressources | `ResourceLibrary` | `nexora_resources`, `nexora_resource_progress` | Catalogue publié + progression de l'utilisateur |
| 11. Découvrir | `Discover` | `entrepreneurs`, `content_sources`, `followed_entrepreneurs` | Profils publics filtrés; suivi individuel |
| 12. Vidéothèque / créateurs | `MediaLibrary`, `CreatorCatalog` | `media_library_items`, Storage `nexora-media` | Edge Functions `media-integrations`, `sync-public-creators`; OAuth optionnel; formulaire d'ajout, recherche et résultats séparés par une pile responsive explicite |
| 13. Roadmap | `Roadmap` | `roadmap_tasks` | Filtrage `user_id` |
| 14. Timeline | `Timeline` | `timeline_events`, `entrepreneurs`, `content_sources` | Événements publiquement documentés; les dates nécessitent une source |
| 15. Insights | `Insights` | `content_items`, relation `content_analyses` | Ne pas fabriquer d'analyses/indicateurs |
| 16. Facturation | `BillingPanel` | `plans`, `subscriptions` | Paiements et activation doivent rester vérifiés côté serveur |
| 17. Vitrine + connexion | `PublicVitrine`, formulaire d'authentification dans `App.tsx` | Contenu statique public; Supabase Auth pour le compte | La demande de contact ouvre l'application e-mail de l'utilisateur; elle n'enregistre pas elle-même un ticket en base |

## Blocs de disposition configurables

`src/lib/pageDataBindings.ts` fournit une liste blanche de clés de lecture et leurs sources. Exemples de clés :
- `projects.total`, `projects.in_progress` → `studio_projects`, filtré par `owner_id`;
- `media.total` → `media_library_items`, filtré par `owner_id`;
- `resources.published` → `nexora_resources`, filtré sur les ressources publiées;
- `courses.published` → `nexora_courses`, filtré sur les cours publiés;
- `roadmap.open` → `roadmap_tasks`, filtré par `user_id`;
- `discover.public` → `entrepreneurs`, filtré sur les profils publics;
- `library.saved` → `user_learning_items`, filtré par `user_id`;
- `ai.messages` → `studio_ai_messages`, filtré par `user_id`;
- `billing.active_plans` → `plans`, filtré sur les forfaits actifs;
- `organizations.accessible` → `organizations`, compteur limité aux lignes visibles selon RLS;
- `academy.enrollments` → `nexora_course_enrollments`, filtré par `user_id` et statut actif.

Les blocs `text`, `card` et `stat` peuvent sélectionner une clé de cette liste. Les blocs d'action peuvent pointer vers une destination de page choisie dans une liste blanche; la destination est un module existant, pas du code libre. Aucune table libre, expression SQL ou fonction serveur n'est exécutable depuis le concepteur. Si la source ne peut pas être lue, la valeur doit rester indisponible (« N/D »), jamais être inventée.

## Règles de raccordement

1. Chaque entrée de navigation doit afficher le module correspondant à `activeSection`.
2. Les données privées doivent être filtrées par l'identité de session et protégées par RLS; le client ne remplace jamais le contrôle serveur.
3. Les invitations, la synchronisation des créateurs, l'IA et les intégrations média passent par les Edge Functions correspondantes.
4. Les clés privilégiées ne doivent jamais être intégrées au client web.
5. Les écrans d'administration et de conception doivent garder leurs contrôles d'accès.
6. La création d'une disposition ou l'affichage d'un compteur ne prouve pas que tout le module est validé. Les tests d'intégration restent requis.


## Identifiants de navigation vérifiés

Les identifiants internes sont centralisés dans `PAGE_ROUTE_IDS`. Les actions des mises en page publiées utilisent une liste distincte `PAGE_ACTION_TARGETS`, qui exclut les destinations réservées à l'administration. L'initialisation par URL accepte uniquement les identifiants de route connus.

| Écran | Identifiant de navigation |
|---|---|
| Tableau de bord référentiel | `dashboard` |
| Studio IA | `studio` |
| Mes projets | `projects` |
| Studio de conception visuelle | `design` |
| Entreprise et équipe | `organizations` |
| Profil et préférences | `profile` |
| Administration | `administration` |
| Académie | `academy` |
| Bibliothèque de formation | `library` |
| Ressources numériques | `resources` |
| Découvrir | `discover` |
| Vidéothèque et créateurs | `media` |
| Roadmap | `roadmap` |
| Timeline | `timeline` |
| Analyses / Insights | `insights` |
| Abonnement et facturation | `billing` |
| Vitrine publique / inscription | `?view=public` / `?mode=signup` (parcours public séparé du workspace authentifié) |

Les pages métier authentifiées sont les 16 identifiants internes ci-dessus. La vitrine publique est le 17e écran et utilise le parcours public de l'application; elle ne doit pas être exposée comme une destination interne arbitraire après connexion. L'accès direct au Studio Design affiche un état de restriction si le compte n'a pas le rôle administrateur.

## Règles d'espacement et de débordement

- Chaque page métier et chaque panneau doit conserver `min-width: 0`, `max-width: 100%` et `box-sizing: border-box` pour éviter qu'un texte ou un formulaire force le débordement horizontal.
- Les grilles utilisent des colonnes minimales réductibles; les cellules et éléments flexibles autorisent le retour à la ligne.
- Les formulaires des pages métier ont un espacement commun, des libellés séparés de leurs champs et des boutons qui restent dans le conteneur. La vidéothèque dispose d'une grille dédiée pour son formulaire d'ajout et sa recherche, empilée sur mobile.
- Les noms de sources, statuts, titres et boutons longs doivent se couper ou revenir à la ligne au lieu de se chevaucher.
- Le panneau de synthèse réduit ses colonnes sur petit écran et empile les sources en dessous des métriques.
- Le tableau de bord référentiel reste exclu des nouvelles règles visuelles ciblant les pages métier.

## Référence de conformité visuelle

La règle commune de couleurs, composants, grilles et espacements est désormais formalisée dans [`visual-design-system.md`](./visual-design-system.md). Elle suit l'identité visuelle du cahier des charges maître : noir `#0B0B0D`, or `#D6B66E`, ivoire `#F5F2EA`, graphite `#202024`.

La classe de thème `brand-theme` s'applique aux vues métier et à l'authentification ; elle est volontairement retirée du tableau de bord référentiel authentifié (`dashboard`) pour préserver son apparence approuvée. La vitrine publique suit la même palette via `src/vitrine.css`. Les règles adaptatives de cartes, sources, boutons et intégrations média sont maintenues dans les feuilles de style partagées.

Le tableau est une formalisation de la cible de conception, pas une affirmation que les 17 écrans ont tous été parcourus manuellement dans tous leurs états. La validation pixel par pixel sur le site de production doit être confirmée après déploiement et tests authentifiés.

