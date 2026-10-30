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
| 11 | Découvrir | `entrepreneurs`, `content_sources`, `followed_entrepreneurs`, `social_accounts` | Recherche, filtre pays, paniers, suivi, sources et réseaux sociaux officiels, liens externes HTTP(S) uniquement | Réseaux sociaux raccordés à la lecture; tests runtime et RLS requis |
| 12 | Vidéothèque et catalogue des créateurs | `media_library_items`; Storage `nexora-media`; Edge Functions `media-integrations`, `sync-public-creators` (v9), `sync-public-creators-cron` (v6) | Flux RSS avec reprise, playlist uploads en secours, YouTube Data API via OAuth, imports idempotents, isolation par propriétaire; galerie compacte de miniatures cliquables (grille dense responsive, cadres 16:9 sans débordement), lecteur dédié fermable avec Échap et téléchargement forcé via URL signée Supabase réservé au propriétaire du fichier | Synchronisation runtime confirmée le 30/10/2026; refonte galerie commitée le 30/10/2026; test visuel navigateur et build à effectuer |
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


## Correctifs de stabilisation UI et enrichissement Discover — 2026-10-30

- `src/styles.css` : suppression des fragments de fusion non résolus dans le bloc mobile final. La section a été reconstruite avec des règles responsives consolidées pour 760 px et 420 px, les tableaux défilants, les formulaires tactiles et les panneaux métier. Le tableau de bord référentiel n'a pas été reconstruit.
- `src/components/Discover.tsx` : chargement groupé des comptes sociaux associés aux profils depuis `social_accounts`. Les liens des sites et réseaux sont limités aux protocoles HTTP/HTTPS avant rendu; les réseaux officiels sont identifiés et les handles sont inclus dans la recherche de chaque panier.
- `src/styles.css` : ajout de pastilles de liens sociaux qui se replient sur plusieurs lignes sur petits écrans.
- `src/components/CreatorCatalog.tsx` : clarification du texte d'aide pour refléter la synchronisation planifiée toutes les six heures déjà configurée dans le projet.

### Contrôles encore nécessaires

- Le contrôle de statut CI doit être relu sur le commit final après les derniers changements.
- Le build TypeScript/Vite et le parcours navigateur authentifié n'ont pas été exécutés dans cette passe. Les nouvelles lectures `social_accounts` dépendent des politiques RLS existantes et doivent être validées avec un compte utilisateur.
- Les liens externes ont une validation de protocole côté interface, mais l'exactitude et le caractère officiel des comptes restent une responsabilité de vérification éditoriale.


## Contrôle RLS et protection des badges créateurs — 2026-10-30

- Inspection directe de Supabase : RLS activé et politiques présentes sur `entrepreneurs`, `content_sources`, `social_accounts` et `followed_entrepreneurs`. Les lectures des profils et réseaux publics sont réservées aux utilisateurs authentifiés; les suivis sont limités à `auth.uid()`.
- Correctif appliqué dans Supabase : migration `20261030045727_protect_creator_verification_status`. Les utilisateurs ordinaires ne peuvent plus attribuer ou modifier eux-mêmes `verification_status`; le contrôle est assuré par un trigger PostgreSQL et la fonction `private.is_admin()` existante.
- Optimisation appliquée : migration `20261030045808_consolidate_creator_admin_rls_policies`, qui fusionne les permissions propriétaire/administrateur pour les insertions et mises à jour afin d'éviter les politiques permissives redondantes sur `entrepreneurs`.
- Test SQL négatif exécuté avec un contexte `authenticated` : tentative de passage de `unverified` à `verified` bloquée par PostgreSQL; la ligne temporaire de test a été supprimée (zéro ligne de test résiduelle).
- Les fonctions de contrôle restent dans le schéma `private`; le trigger est `SECURITY INVOKER`, `search_path` vide, et ne confie pas la validation aux métadonnées modifiables par l'utilisateur.

### État des alertes Supabase après ce correctif

- Les advisors sécurité continuent de signaler trois tables RLS sans politiques (`media_oauth_states`, `media_provider_connections`, `organization_invitations`), un `pg_net` dans `public`, trois RPC SECURITY DEFINER accessibles aux utilisateurs authentifiés (paiement de cours, inscription gratuite, réservation de quota IA — à contrôler séparément selon leur modèle d'autorisation) et la protection contre les mots de passe compromis désactivée.
- Les advisors performance signalent 29 clés étrangères sans index couvrant, des index inutilisés, un index dupliqué et des politiques permissives multiples sur plusieurs tables. Aucun index ou objet de ces autres modules n'a été modifié dans cette passe.
- La production Netlify est toujours sur le commit `5789cf61d78cfe64170ab145cccac01ea718e61e` (déploiement `6ae2f0141814af2ae50e6987`, état `ready`), antérieur aux commits de cette session. Le nouveau front n'est donc pas encore confirmé en production.
- Le statut CI interrogé sur le commit de stabilisation CSS ne retourne aucun statut publié; aucun build TypeScript/Vite ni test navigateur n'est déclaré réussi dans cette passe.


## Extension du formulaire Discover — 2026-10-30

- Le formulaire de création de profil permet désormais de renseigner un réseau social principal (YouTube, Instagram, TikTok, LinkedIn, Facebook, X ou autre) et son URL. Le compte est créé comme non vérifié; seul un administrateur peut ensuite confirmer son caractère officiel.
- Les erreurs d'enregistrement des liens sont conservées comme avertissements au lieu d'être écrasées par le message de succès du profil. L'état d'enregistrement reste actif jusqu'à la fin de la création et du rechargement.
- Test SQL positif exécuté avec un contexte `authenticated` : création d'un profil privé et ajout/lecture de son lien YouTube dans `social_accounts` réussis selon les politiques RLS; les données temporaires ont été supprimées (zéro ligne résiduelle).
- Le tableau de synthèse inclut maintenant `social_accounts`; les recherches par panier tiennent compte des plateformes et handles. Les liens des sources documentaires sont également filtrés pour n'autoriser que HTTP/HTTPS.
- Après consolidation des politiques RLS, l'advisor performance ne signale plus de doublon de politiques `INSERT`/`UPDATE` sur `entrepreneurs`; les alertes multiples restantes concernent d'autres tables et modules.


## Phase 2 — architecture Web + Mobile — 2026-10-30

- Architecture retenue : deux pôles de distribution, Web et Mobile natif, avec un seul projet Supabase et une seule source de vérité. Les comptes, projets, organisations, médias, droits RLS, stockage et fonctions serveur restent partagés; aucune base mobile parallèle.
- Socle natif : Capacitor 8.6.0 (core, CLI, Android, iOS), application `com.jdvglobalcenter.nexora`, sortie web `dist`, schéma Android HTTPS et contenu mixte désactivé. Le client natif ouvre directement l'application authentifiée, tandis que le navigateur conserve la vitrine publique.
- PWA : service worker de production et écran hors connexion ajoutés. Le cache est limité à la coque et aux ressources statiques; les routes Supabase Auth, REST, Storage, Functions, Realtime et GraphQL sont explicitement exclues du cache.
- Responsive : viewport iOS `viewport-fit=cover`, gestion des zones de sécurité, orientation paysage de faible hauteur et navigation/tablette 761–1024 px. La navigation rapide mobile existante est conservée.
- CI : workflow Web TypeScript/Vite sur push/PR et workflow natif manuel qui génère et compile un APK Android debug ainsi qu'une application iOS simulateur non signée.
- Dépendances natives alignées et épinglées à 8.6.0; Node.js 22 minimum. L'environnement Android exige Android Studio 2025.2.1+ et SDK; l'environnement iOS exige macOS/Xcode 26+ et CocoaPods.

### Limites de validation de la phase 2

- Les projets natifs `android/` et `ios/` sont générés par le workflow de compilation; ils ne sont pas encore matérialisés/commités dans le dépôt.
- Aucun build TypeScript/Vite, APK, AAB, application iOS, essai sur téléphone réel ou publication store n'est déclaré réussi tant que les workflows et tests appareils ne sont pas exécutés.
- Le cache hors connexion ne promet pas l'édition hors ligne : les données privées et la synchronisation Supabase nécessitent une connexion active.


## Durcissement SQL complémentaire — 2026-10-30

- Les trois RPC `nexora_create_course_payment_order`, `nexora_enroll_free_course` et `nexora_reserve_ai_usage` utilisent désormais `search_path = ''`. Leurs accès restent réservés aux utilisateurs authentifiés, qui passent les contrôles `auth.uid()` et les règles métier; `anon` et `PUBLIC` ne disposent pas d'EXECUTE. Les tests pgTAP vérifient maintenant le search_path des trois fonctions.
- Indexation : 29 index couvrant les clés étrangères signalées par Supabase ont été ajoutés, ainsi qu'un index complet sur `nexora_notifications.user_id` (l'ancien index étant partiel). Le doublon `media_library_owner_platform_external_uidx` a été supprimé; l'index unique lié à la contrainte reste en place.
- Contrôle SQL post-migration : zéro clé étrangère publique restante sans index de tête selon le contrôle de catalogue; l'index dupliqué n'existe plus. Les advisors n'affichent plus les alertes `unindexed_foreign_keys` ni `duplicate_index`.
- Les 46 alertes `unused_index` post-migration ne signifient pas que les index doivent être supprimés : la base est encore peu chargée et les nouveaux index n'ont pas encore servi de requêtes en production. À réévaluer après une période d'usage réel.
- Les 13 groupes de politiques permissives multiples ont été consolidés : les droits d'écriture sont séparés des règles SELECT et les lectures des projets/assets ont été fusionnées en conservant propriétaires, administrateurs et membres. L'advisor ne signale plus de `multiple_permissive_policies`.
- Test de non-régression ciblé exécuté après consolidation : un utilisateur authentifié a créé son profil créateur privé, ajouté, relu, modifié puis supprimé un lien social; toutes les opérations ont réussi et aucune donnée temporaire n'est restée.
- Les trois tables `media_oauth_states`, `media_provider_connections` et `organization_invitations` restent sans politique RLS, mais les privilèges de table `anon` et `authenticated` sont absents; seul `service_role` dispose de privilèges. Ces tables sont actuellement utilisées par les Edge Functions côté serveur.
- Les trois RPC SECURITY DEFINER signalées ont été revues : elles exigent `auth.uid()`, contrôlent l'accès au cours ou au quota de l'utilisateur et ne permettent pas l'accès anonyme. L'advisor continue de les signaler car les RPC authentifiées sont intentionnelles.
- `pg_net` : les tâches cron `nexora-rss-sync-every-6-hours` et `nexora-public-creators-sync-every-6-hours` s'exécutent sous `postgres`. Une migration de restriction a été enregistrée, mais les ACL du schéma `net` et des fonctions restent détenues par `supabase_admin`; le rôle SQL connecté n'a pas l'appartenance/propriété nécessaire pour les révoquer. Le contrôle de permissions confirme que les privilèges n'ont pas changé. Ne pas considérer ce point comme corrigé; intervention du propriétaire de l'extension requise. Le schéma `net` n'a pas été déplacé, car `pg_net` est déclaré non-relocatable et les cron jobs en dépendent.
- La protection des mots de passe compromis reste désactivée dans Supabase Auth. Elle ne peut pas être modifiée via les fonctions SQL disponibles dans cette connexion; elle doit être activée dans les paramètres Auth du projet.


## Stockage sécurisé des sessions natives — 2026-10-30

- Dépendance `@aparajita/capacitor-secure-storage` 8.0.1 ajoutée pour Capacitor 8. Les sessions Supabase natives utilisent l'adaptateur `getItem`/`setItem`/`removeItem` du plugin : Keychain iOS et chiffrement AES-GCM avec clé Android Keystore. Le navigateur Web conserve le stockage standard Supabase.
- iOS : accessibilité Keychain `whenUnlockedThisDeviceOnly`; synchronisation iCloud non activée. Un marqueur non sensible du WebView permet d'effacer le préfixe NEXORA du Keychain après une réinstallation, car les éléments Keychain peuvent survivre à la suppression de l'application.
- Les liens de récupération de mot de passe et de secours d'invitation générés depuis le client natif pointent maintenant vers le domaine Web hébergé au lieu de `capacitor://localhost`.
- Le retour OAuth natif des fournisseurs média et les liens profonds de reprise de session restent à implémenter avant de déclarer tous les parcours d'intégration natifs prêts.
