# Carte des pages et de leurs sources — JDV NEXORA AI STUDIO

Ce document décrit les sources réellement référencées par les composants du dépôt. Les tables restent soumises aux politiques RLS de Supabase; la carte ne remplace pas les contrôles d'accès.

| Page du menu | Composant | Source principale | Actions / source serveur |
|---|---|---|---|
| Tableau de bord | `ReferenceDashboard` + sections du tableau | `profiles`, `studio_projects`, `studio_assets` | Données du compte connecté |
| Studio de création | `StudioIA` | `studio_ai_messages` | Edge Function `studio-ai` |
| Vidéothèque | `MediaLibrary`, `CreatorCatalog` | `media_library_items`, Storage `nexora-media` | Edge Functions `media-integrations`, `sync-public-creators` |
| Découvrir | `Discover` | `entrepreneurs`, `content_sources` | Sources publiques, filtres et suivis du compte |
| Bibliothèque | `LearningLibrary` | `user_learning_items`, `entrepreneurs`, `content_items` | Progression personnelle filtrée par `user_id` |
| Académie | `Academy` | `nexora_learning_paths`, `nexora_learning_modules`, `nexora_learning_progress` | Progression personnelle filtrée par `user_id` |
| Ressources | `ResourceLibrary` | `nexora_resources`, `nexora_resource_progress` | Progression personnelle filtrée par `user_id` |
| Mes projets | formulaire/liste/éditeur dans `App.tsx` | `studio_projects`, `studio_assets`, `studio_project_members` | Propriétaire/membre vérifié par RLS |
| Roadmap | `Roadmap` | `roadmap_tasks` | Filtrage par `user_id` |
| Timeline | `Timeline` | `timeline_events` | Événements chargés par le composant |
| Insights | `Insights` | `content_items` | Contenus d'analyse |
| Organisations & équipe | `OrganizationPanel` | `organizations`, `organization_members`, `organization_invitations` | Edge Functions `invite-organization-member`, `accept-organization-invitation` |
| Profil & préférences | formulaire dans `App.tsx` | `profiles` | Profil de l'utilisateur connecté |
| Facturation & sécurité | `BillingPanel` | `plans`, `subscriptions` | Les opérations de paiement doivent rester côté serveur |
| Administration | `AdminPanel` | `profiles`, `audit_logs` | Accès administrateur uniquement |
| Studio de conception visuelle | `VisualDesignStudio` | `visual_studio_layouts`, `visual_studio_versions`, `visual_studio_publications` | Accès administrateur uniquement |
| Disposition publiée | `PublishedVisualLayout` | `visual_studio_publications` | Charge la disposition marquée `is_default = true` |

## Règles de raccordement

1. La navigation doit afficher le module correspondant à `activeSection`, plutôt que monter tous les modules à la fois.
2. Les données personnelles doivent rester filtrées par l'identité de session et protégées par RLS.
3. Les opérations sensibles (invitation, synchronisation de créateurs, IA et intégrations média) passent par les Edge Functions correspondantes.
4. Une table citée par un composant n'est pas considérée comme vérifiée fonctionnellement tant que les appels réels, erreurs, permissions et résultats ne sont pas testés dans l'application.
5. Les pages de conception et d'administration restent réservées au rôle `admin`; aucune permission n'est élargie côté client.
