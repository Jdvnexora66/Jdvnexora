# Audit général JDV NEXORA AI — 30 octobre 2026

## Synthèse exécutive

Le dépôt contient un socle React/TypeScript/Vite, une architecture Web/PWA et un shell natif Capacitor Android/iOS, reliés à un projet Supabase unique. Les dernières exécutions GitHub Actions contrôlées sur le commit documentaire `5046f1fb8bc35aa27260be527e3188f7fcb8802f` sont réussies :
- `NEXORA native build` : Android debug APK et iOS simulator build (unsigned).
- `NEXORA web quality` : TypeScript et build Vite.
- `CI` : build réussi.
- `Build NEXORA` : build réussi.

Cette preuve valide la compilation, pas les parcours utilisateurs complets ni les tests sur appareils physiques. Le déploiement Netlify en production n'a pas été actualisé dans cette passe ; le propriétaire a indiqué qu'il le ferait lui-même.

## Éléments vérifiés

- Projet Supabase actif et sain, région `eu-west-1`, PostgreSQL 17.
- 47 tables publiques avec RLS activé ; 3 sont sans politique RLS : `media_oauth_states`, `media_provider_connections`, `organization_invitations`. Ce choix peut être intentionnel pour des tables réservées au backend ; ne pas créer de politiques client génériques.
- 47 migrations appliquées jusqu'à `20261030051402`.
- Edge Functions actives : `studio-ai` v9 (JWT requis), `media-integrations` v12, `sync-public-creators` v9 (JWT requis), `sync-public-creators-cron` v6, `sync-resource-catalog` v21, `invite-organization-member` v1 (JWT requis), `accept-organization-invitation` v1 (JWT requis), `verify-kkiapay-payment` v1 (JWT requis).
- Deux tâches pg_cron actives toutes les six heures : synchronisation des ressources et synchronisation des créateurs.
- Journaux Edge récents : appels HTTP 200 observés pour les synchronisations de créateurs et de ressources ; des réponses 502 transitoires sont aussi présentes pour une synchronisation créateur le 30 octobre à 04:05 UTC, suivies d'appels 200. Prévoir observabilité et stratégie de reprise plutôt que considérer tout incident isolé comme une panne durable.
- Les advisors performance ne signalent plus de clés étrangères sans index ni index dupliqué ; 46 index sont signalés comme inutilisés. Ne pas les supprimer sans analyse des charges réelles et des périodes d'observation suffisantes.

## Risques et corrections prioritaires

### P0 — Permissions pg_net trop larges à corriger prudemment

Contrôle SQL du 30 octobre :
- L'extension `pg_net` est installée dans le schéma `public`.
- Le schéma `net` accorde USAGE à `anon` et `authenticated`.
- Les fonctions du schéma `net`, notamment `http_post`, retournent EXECUTE=true pour `anon` et `authenticated`.

L'exposition réelle via PostgREST n'a pas été établie par cet audit. Il s'agit néanmoins d'une surface SQL trop large à réduire. Les deux tâches cron dépendent de `net.http_post`. Ne pas révoquer ni déplacer l'extension à l'aveugle : confirmer d'abord le propriétaire effectif des objets et la méthode Supabase prise en charge, restreindre les rôles applicatifs, puis tester les deux jobs et leur accès Vault. Le rôle de connexion courant ne semble pas disposer des droits de propriétaire nécessaires à une correction directe.

### P1 — Protection Auth des mots de passe compromis

L'advisor Supabase confirme que la protection contre les mots de passe compromis est désactivée. Activer le contrôle dans les paramètres Auth Supabase, puis vérifier inscription, connexion, changement et réinitialisation de mot de passe.

### P1 — Validation réelle des paiements et abonnements

La fonction `verify-kkiapay-payment` est active avec JWT requis et les migrations protègent les références de transaction. Il reste à tester en environnement de paiement réel/test :
1. création d'une commande serveur ;
2. lancement du paiement ;
3. vérification serveur auprès de KKIAPAY ;
4. idempotence et doublons ;
5. confirmation d'abonnement et mise à jour des droits/quota ;
6. échec, annulation, timeout et callback tardif.

Ne jamais activer un forfait sur la seule base d'un retour navigateur.

### P1 — Studio Design : édition native incomplète

Le composant contient sélecteur de page, brouillon, versions, publication, aperçus responsive, blocs configurables, liaisons de données en liste blanche et destinations d'action contrôlées. Cela ne démontre pas l'édition directe de tous les composants natifs existants de chaque écran. Le périmètre à terminer est la sélection visuelle d'un élément natif, l'édition de ses propriétés, l'aperçu fidèle, l'historique/annulation, puis publication contrôlée avec rollback.

### P1 — Parcours d'authentification et multi-tenant

Les requêtes de projets combinent projets possédés, partagés et organisationnels. Il faut vérifier en tests multi-comptes que :
- un membre ne lit que les projets partagés avec lui ;
- un utilisateur d'une organisation ne lit pas les données d'une autre ;
- les rôles entreprise et admin sont imposés côté RLS/Edge Function, et pas seulement par l'interface ;
- changement de compte, session expirée et restauration de session nettoient les états privés du client ;
- les invitations ne peuvent être acceptées que par l'adresse et le compte autorisés.

### P1 — Studio IA : cycle de vie des quotas

La fonction vérifie le JWT, valide la demande, réserve le quota via RPC, appelle le fournisseur IA et finalise l'usage via un client serveur. Les erreurs fournisseur laissent la réservation expirer après 15 minutes selon le code. Ajouter des tests automatisés pour erreur fournisseur, réponse vide, timeout, quota dépassé, échec de finalisation et double soumission. Contrôler le résultat de la RPC de finalisation et rendre le statut de réservation observable. Vérifier que les secrets OPENAI restent uniquement dans les secrets Supabase.

### P2 — Tests de bout en bout des 17 vues

Le registre du dépôt identifie 16 routes authentifiées et la vitrine publique. La plupart sont raccordées à des tables ou fonctions, mais restent marquées « à tester en runtime ». Pour chaque vue, couvrir lecture, création, modification, suppression si proposée, états vides, chargement, erreur, session expirée, responsive et permissions.

### P2 — Mobile physique et distribution

Les compilations natives réussies produisent un APK Android debug et une application iOS simulateur non signée. Il manque :
- essais sur appareils Android et iPhone réels ;
- validation du retour OAuth avec les applications développeur réelles ;
- deep links de récupération de compte/invitation ;
- tests caméra, fichiers, téléchargements, clavier, reprise réseau et notifications si ces capacités sont retenues ;
- APK/AAB signé, IPA signé et publication Play Store/App Store.

Le cache PWA ne fournit pas une édition hors ligne : les opérations privées restent dépendantes du réseau.

### P2 — Production Web

Les routes SPA et le chemin `/app` sont configurés. Toutefois, le code récent de `main` ne doit pas être confondu avec le site Netlify actuellement servi. Le propriétaire gère le déploiement Netlify ; après son déploiement, contrôler le SHA servi, l'authentification, les redirections, les assets et les parcours de chaque rôle.

## Architecture cible recommandée

- Une identité et un projet Supabase uniques partagés par Web, PWA, Android et iOS.
- Une séparation nette entre espace personnel B2C et organisations B2B, avec un contexte d'organisation explicite.
- Autorisations centralisées : RLS pour les données, Edge Functions pour les opérations sensibles, aucune confiance dans le seul état React.
- Une couche de services métier typée, évitant les requêtes Supabase divergentes copiées dans chaque écran.
- Un registre unique des routes, des capacités par rôle et des sources de données.
- Studio Design en mode « édition native » avec sélection d'élément, propriétés, prévisualisation et publication versionnée.
- Observabilité : erreurs client, logs Edge sans secrets, métriques de quotas, synchronisations, paiements et alertes.
- Tests automatiques : unitaires, intégration RLS multi-utilisateurs, E2E Playwright web, tests natifs sur appareils avant publication.

## Ordre d'exécution recommandé

1. Réduire la surface de sécurité pg_net sans casser cron ; activer la protection des mots de passe compromis.
2. Automatiser les tests Auth, RLS, multi-tenant et permissions.
3. Tester les paiements KKIAPAY et l'application réelle des abonnements.
4. Stabiliser Studio IA : quotas, erreurs, historique, reprise et observabilité.
5. Achever le Studio Design en édition directe des composants natifs.
6. Tester les 17 vues avec scénarios de bout en bout et plusieurs rôles.
7. Valider les appareils Android/iOS et les flux OAuth.
8. Déployer la version Web par le propriétaire sur Netlify, puis vérifier le SHA servi et les parcours production.

## Limites de cet audit

Audit effectué à partir du code GitHub, des migrations et métadonnées Supabase, des advisors, de contrôles SQL en lecture seule, des statuts GitHub Actions et des journaux Edge disponibles le 30 octobre 2026. Il ne remplace pas un test navigateur authentifié complet, un test sur appareils physiques, un paiement réel ni une revue d'intrusion indépendante.
