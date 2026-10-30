# Phase 2 — architecture Web + Mobile de JDV NEXORA

Date : 30 octobre 2026

## Décision d'architecture

JDV NEXORA est organisé en deux pôles de distribution :

1. **Pôle Web** : application accessible depuis les navigateurs sur ordinateur, tablette et téléphone.
2. **Pôle Mobile** : application Android et iOS installable, produite à partir du même client React/Vite au moyen de Capacitor.

Les deux pôles sont deux portes d'entrée vers le même service. Ils partagent le même projet Supabase, les mêmes comptes Auth, les mêmes profils, projets, organisations, médias, bibliothèques, abonnements, permissions et politiques RLS. Aucune base mobile parallèle ne doit être créée.

## Schéma logique

```text
JDV NEXORA
├── Pôle Web
│   ├── Navigateur ordinateur
│   ├── Navigateur tablette
│   └── PWA installable (Android / iOS compatibles)
│
├── Pôle Mobile natif
│   ├── Android — Capacitor
│   └── iOS — Capacitor
│
└── Services partagés
    ├── Supabase Auth
    ├── PostgreSQL + RLS
    ├── Storage
    ├── Edge Functions
    └── Realtime
```

## Règles de cohérence

- Une seule identité utilisateur : même compte et même méthode de connexion sur les deux pôles.
- Une seule source de vérité : Supabase reste l'autorité pour les données et les droits.
- Les autorisations sont contrôlées par RLS et par les fonctions serveur; jamais par un simple masquage de boutons.
- Les clés service_role / secret ne sont jamais embarquées dans le navigateur ou dans l'application mobile.
- Les données privées et les réponses Auth, REST, Storage, Functions et Realtime ne sont jamais mises en cache par le service worker.
- Le cache PWA est limité à la coque statique, aux ressources versionnées et à un écran hors connexion. L'édition et la synchronisation restent dépendantes du réseau.
- Les projets créés sur un pôle doivent être retrouvés sur l'autre dès que le même compte est connecté.

## État du socle livré dans cette passe

- Capacitor 8.6.0 ajouté et versions alignées pour core, CLI, Android et iOS.
- Identifiant d'application natif : `com.jdvglobalcenter.nexora`.
- Sortie web native configurée sur `dist`.
- L'application native ouvre directement l'interface d'authentification NEXORA; la vitrine publique reste l'entrée par défaut du Web.
- Les sessions Supabase natives utilisent `@aparajita/capacitor-secure-storage` : Keychain iOS et Android Keystore/AES-GCM; le navigateur Web conserve le stockage Auth standard du navigateur. Un marqueur non sensible efface les anciens secrets Keychain lors d'une réinstallation iOS.
- PWA : enregistrement du service worker en production, manifeste enrichi, cache prudent de la coque et écran hors connexion.
- Viewport iOS configuré avec `viewport-fit=cover`.
- CSS adapté aux zones de sécurité iOS, à la navigation tactile, aux orientations paysage courtes et aux tablettes de 761 à 1024 px.
- Navigation mobile existante conservée : barre rapide inférieure et menu complet « Plus ».

## Commandes développeur

Node.js 22 ou supérieur est requis par Capacitor 8.

```bash
npm install
npm run build

# Générer une fois les projets natifs
npm run cap:add:android
npm run cap:add:ios

# Après chaque changement web
npm run mobile:build

# Ouvrir les projets natifs
npm run mobile:android
npm run mobile:ios
```

## Environnements de compilation

- Android : Android Studio 2025.2.1 ou supérieur, Android SDK et JDK géré par Android Studio.
- iOS : macOS, Xcode 26 ou supérieur et CocoaPods.
- La compilation iOS et la signature App Store nécessitent un environnement Apple et un compte développeur Apple.
- La publication Google Play nécessite une clé de signature Android conservée hors du dépôt.

## Lots de réalisation

### Lot 1 — socle commun (en cours)
PWA, configuration Capacitor, compatibilité responsive, zones de sécurité, compilation web et premières compilations natives.

### Lot 2 — expérience mobile métier
Optimiser chaque page pour le tactile : Studio IA, projets, vidéothèque, catalogue créateurs, bibliothèque, Académie, collaboration, organisation, facturation et administration. Prévoir des états de chargement, d'erreur et de connexion faible.

### Lot 3 — fonctions natives
Finaliser les liens profonds pour la récupération de compte et les retours OAuth (les liens de réinitialisation et d'invitation utilisent déjà le domaine Web depuis l'application native). Brancher progressivement caméra, sélecteur de fichiers, partage natif, notifications push et liens profonds, uniquement avec permissions explicites et plugins maintenus.

### Lot 4 — validation appareils
Tester Android petit écran, Android grand écran, iPhone compact, iPhone grand écran, iPad portrait/paysage et tablette Android. Contrôler connexion, session restaurée, navigation, upload, lecture, téléchargement autorisé, reprise après perte réseau et déconnexion.

### Lot 5 — distribution
Produire APK/AAB Android, archive iOS signée, fiches Play Store / App Store, politique de confidentialité, captures d'écran et processus de mise à jour.

## Critères de validation avant publication

- Le même utilisateur se connecte sur Web, Android et iOS.
- Les jetons de session natifs sont stockés dans le coffre-fort du système; aucune session n'est enregistrée en clair dans le stockage WebView natif.
- Un projet créé sur Web apparaît sur mobile et inversement.
- RLS bloque toute lecture/écriture inter-utilisateurs non autorisée.
- Aucun secret serveur dans les bundles Web ou mobiles.
- Les appels Supabase ne sont jamais servis depuis un cache statique.
- Pas de défilement horizontal global involontaire, zones tactiles accessibles, clavier mobile non masquant les champs.
- Tests réels sur appareils et compilation native réussie avant publication.

## Limites de cette livraison

Le dépôt contient le socle et la configuration Capacitor, mais les dossiers natifs Android/iOS n'ont pas encore été générés dans cet environnement. Aucun APK/AAB, IPA ou build Xcode n'est déclaré disponible. La validation TypeScript/Vite et les essais sur appareils doivent être réalisés via l'intégration continue et les environnements Android/iOS.
