# Audit des 17 pages et de leurs raccordements — JDV NEXORA AI STUDIO

Date de préparation : 2026-10-29  
Branche de travail : `fix/global-typography-layout-audit`

## Règle de validation

Une page ne sera déclarée « vérifiée » qu'après contrôle du rendu ordinateur/mobile, de ses actions (succès, état vide, chargement et erreur), des lectures/écritures Supabase, des politiques RLS et de ses dépendances Edge Function/Storage. Le succès du build n'est pas une preuve que tous les parcours métier fonctionnent en production.

Le tableau de bord référentiel reste la référence visuelle et fonctionnelle. Il ne doit pas être reconstruit.

## Registre des 17 pages

| Nº | Page | Sources/raccordements recensés dans le dépôt | Vérifications obligatoires | État |
|---:|---|---|---|---|
| 1 | Tableau de bord référentiel | `ReferenceDashboard`; `profiles`, `studio_projects`, `studio_assets` | Non-régression visuelle; chargement réel; navigation vers les modules | À tester en runtime |
| 2 | Studio de création IA | `StudioIA`; `studio_ai_messages`; Edge Function `studio-ai`; quotas d'usage | Authentification, quota côté serveur, erreurs IA, historique et RLS | À tester en runtime |
| 3 | Mes projets et éditeur | `studio_projects`, `studio_assets`, `studio_project_members` | CRUD, autosauvegarde/enregistrement, accès propriétaire et partage | À tester en runtime |
| 4 | Studio de conception visuelle | `visual_studio_layouts`, `visual_studio_versions`, `visual_studio_publications`; `pageDataBindings.ts` | Édition, liaisons en liste blanche, brouillon/version/publication, aperçu de la vraie page | À tester en runtime |
| 5 | Espace entreprise et équipe | `organizations`, `organization_members`, `organization_invitations`, `studio_project_members`, `studio_project_comments`; Edge Functions d'invitation | Rôles, invitation/acceptation, isolation par organisation, autorisations serveur | À tester en runtime |
| 6 | Profil et préférences | `profiles`; Supabase Auth | Lecture et sauvegarde, langue/fuseau, erreurs et session expirée | À tester en runtime |
| 7 | Administration | `profiles`, `audit_logs`, `nexora_courses`, `nexora_course_lessons` | Refus des rôles non autorisés côté serveur/RLS, mutations et journalisation | À tester en runtime |
| 8 | Académie | `nexora_learning_paths`, `nexora_learning_modules`, `nexora_learning_progress`, `nexora_courses`, `nexora_course_enrollments`, `nexora_course_lessons` | Catalogue publié, inscription, progression, accès aux leçons et états vides | À tester en runtime |
| 9 | Bibliothèque de formation | `user_learning_items`, `entrepreneurs`, `content_items` | Favoris/notes/progression persistants; données privées limitées à l'utilisateur | À tester en runtime |
| 10 | Ressources numériques | `nexora_resources`, `nexora_resource_progress` | Catalogue, liens/ressources disponibles, progression persistante | À tester en runtime |
| 11 | Découvrir | `entrepreneurs`, `content_sources`, `followed_entrepreneurs` | Recherche, filtre pays, paniers, suivi, résultats vides et rendu responsive | CSS ciblé ajouté; test runtime requis |
| 12 | Vidéothèque et catalogue des créateurs | `media_library_items`; Storage `nexora-media`; Edge Functions `media-integrations`, `sync-public-creators` | Synchronisation, liens médias, erreurs provider, droits Storage et accès public/privé | À tester en runtime |
| 13 | Roadmap | `roadmap_tasks` | Création, modification, suppression, statuts, dates, filtrage propriétaire | À tester en runtime |
| 14 | Timeline / chronologie | `timeline_events`, `entrepreneurs`, `content_sources` | Sources de dates, ordre, recherche, données manquantes et états vides | À tester en runtime |
| 15 | Analyses / Insights | `content_items`, relation `content_analyses` | Aucun chiffre inventé; états de chargement/erreur; provenance des métriques | À tester en runtime |
| 16 | Abonnement et facturation | `plans`, `subscriptions`; KKIAPAY et Edge Function de vérification | Prix/plan côté serveur, référence de transaction unique, confirmation réelle, clés marchand et modes de test | À tester avec clés KKIAPAY |
| 17 | Vitrine publique et authentification | `PublicVitrine`; Supabase Auth; navigation publique et inscription/connexion | Liens, inscription/connexion/récupération, formulaire contact, affichage mobile | Logo intégré sur la branche; test runtime requis |

## Vérification visuelle globale

- [x] Ajout d'une feuille de styles globale après les styles du workspace.
- [x] Hauteurs de ligne et marges de paragraphes/titres normalisées.
- [x] Espacement et lisibilité des cellules de tableaux améliorés.
- [x] Contrôles de formulaire et boutons avec hauteur minimale cohérente.
- [x] Adaptations responsives de base.
- [x] Emblème original JDV NEXORA créé en SVG et intégré à la navigation du workspace et à la vitrine sur la branche de travail.
- [ ] Parcours visuel complet de chacune des 17 pages sur ordinateur, tablette et téléphone.
- [ ] Vérification clavier/focus de tous les contrôles.
- [ ] Validation finale du Studio Design : l'aperçu d'une page ne prouve pas l'édition arbitraire de chaque élément natif.

## Vérification des raccordements

Pour chaque module, suivre ce parcours sans utiliser de données fictives comme résultat final :

1. Identifier le composant React, les requêtes, la table/vue/RPC, les migrations et les politiques RLS correspondantes.
2. Vérifier que l'identifiant utilisateur ou organisation est appliqué dans la requête et que la sécurité reste imposée côté serveur.
3. Tester une lecture, une création, une modification et une suppression si ces actions sont offertes.
4. Vérifier les erreurs réseau, la session expirée, les résultats vides et le chargement.
5. Pour Edge Functions, vérifier le JWT, les variables d'environnement, les codes HTTP et les journaux sans exposer de secrets.
6. Pour Storage, tester les règles de lecture/écriture et les URL signées si utilisées.
7. Pour paiements, ne jamais activer un abonnement depuis le seul retour navigateur : exiger la vérification serveur du fournisseur.

## Résultats et limites actuels

- Les tests CI et Build NEXORA ont réussi pour un commit antérieur de la branche de correction.
- Le CI du commit qui intègre le logo et les dernières retouches CSS est en attente au moment de cette mise à jour.
- Aucun audit runtime de toutes les tables/RLS/Edge Functions n'est considéré terminé par la seule présence de leurs noms dans le code.
- La production ne doit pas être annoncée comme mise à jour avant qu'un déploiement production récent et le contrôle de son URL soient confirmés.


## Audit approfondi — raccordement des actions du Studio Design

### Défaut confirmé et correction préparée

- **Constat confirmé dans la branche principale :** les boutons d'action rendus par `PublishedVisualLayout` redirigeaient vers `/?section=<module>`.
- **Cause :** `src/main.tsx` rend la vitrine publique lorsque le chemin est `/`, quel que soit le paramètre `section`. La navigation d'une action publiée ne pouvait donc pas garantir l'ouverture du module demandé.
- **Correction préparée sur la branche d'audit :** les actions redirigent désormais vers `/app?section=<module>`, chemin qui utilise la réécriture Netlify `/app /index.html 200` et charge l'application.
- **Validation requise avant clôture :** cliquer chaque destination publiée (dashboard, studio, projets, entreprise, profil, administration, académie, bibliothèques, ressources, découverte, vidéothèque, roadmap, timeline, insights et facturation) avec une session autorisée, puis vérifier le comportement sans session et pour un utilisateur sans droits administrateur.

### Conformité du Studio Design

- [x] La source du code comporte un sélecteur de page, un mode « Page réelle », un mode « Brouillon éditable », les vues ordinateur/tablette/téléphone, les blocs prédéfinis et un panneau de propriétés.
- [x] Les blocs offrent des propriétés de texte, largeur, couleurs autorisées, arrondi, espacement intérieur, visibilité et duplication; l'ordre peut être modifié.
- [x] Les données dynamiques sont limitées à une liste blanche de clés; les URL d'image/vidéo sont validées.
- [ ] L'édition directe des composants natifs existants de chaque écran (pas uniquement la superposition de blocs) reste à implémenter ou à démontrer. Le dépôt documente explicitement cette limite.
- [ ] Le rendu exact des 17 pages, les raccordements de données, les permissions et le responsive restent à confirmer sur un déploiement accessible.

### Limites de preuve

Cette revue est une inspection statique du code et des configurations disponibles. Elle ne prouve pas à elle seule qu'une transaction Supabase, une politique RLS, un appel Edge Function ou un rendu visuel fonctionne dans l'environnement de production.


## Vérification réelle du projet Supabase — 2026-10-29

### Éléments confirmés par inspection du projet

- Les tables métier interrogées sont protégées par RLS, y compris `profiles`, `plans`, `subscriptions` et les tables de projets/catalogues.
- Les Edge Functions attendues existent et sont actives : `studio-ai`, `media-integrations`, `sync-public-creators`, `sync-public-creators-cron`, `invite-organization-member`, `accept-organization-invitation` et `verify-kkiapay-payment`. La configuration `verify_jwt` varie selon le type de fonction; les endpoints OAuth/cron doivent continuer à vérifier leurs secrets/signatures dans leur code.
- Trois tables ont RLS activé sans politiques : `media_oauth_states`, `media_provider_connections` et `organization_invitations`. Cela bloque par défaut les accès via les rôles Data API, et peut être intentionnel si ces tables sont utilisées exclusivement par des fonctions serveur. Ne pas ajouter une politique client générique; vérifier les chemins Edge Function et les permissions de service avant tout changement.
- Les fonctions `nexora_create_course_payment_order`, `nexora_enroll_free_course` et `nexora_reserve_ai_usage` sont SECURITY DEFINER et exécutables par `authenticated`. Leur corps vérifié contient une vérification de `auth.uid()`, la validation du cours publié/prix ou du quota et n'expose pas de confirmation de paiement par simple retour client. Les migrations révoquent l'exécution pour `public` et `anon`. Elles ne doivent pas être rendues invocables par des visiteurs anonymes.
- Les advisors Supabase signalent également `pg_net` dans le schéma public, la protection contre les mots de passe compromis désactivée, et des clés étrangères non indexées. Ces points doivent être planifiés séparément; ne pas déplacer une extension ni ajouter des index en production sans confirmer les dépendances et mesurer l'impact.

### État de preuve

- CI et Build NEXORA : réussite sur le commit `cbc8726cab70b85efa45eaf25b41a72548f270c6`.
- Aperçu Netlify de la demande de fusion : déploiement `ready` pour le commit ci-dessus.
- La consultation automatisée du site d'aperçu depuis l'environnement de contrôle n'a pas permis de récupérer le rendu des pages. Le contrôle visuel par navigateur connecté et les tests avec session réelle restent donc nécessaires.
- Aucune donnée utilisateur, aucun abonnement ni aucune politique RLS n'a été supprimé ou affaibli dans cette passe.
