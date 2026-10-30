# Déploiement — JDV NEXORA AI STUDIO

## 1. Variables de build

Configurer ces variables dans l'hébergeur (Netlify ou autre) :

- `VITE_SUPABASE_URL` : URL du projet Supabase.
- `VITE_SUPABASE_ANON_KEY` : clé publishable/anon du projet. Ne jamais utiliser une clé `service_role` dans le navigateur.

## 2. Supabase Auth

Dans les URL de redirection autorisées, ajouter le domaine de production et le domaine de preview réellement utilisés. Vérifier aussi l'URL de redirection des e-mails de réinitialisation du mot de passe.

## 3. Studio IA

La fonction Edge `studio-ai` doit conserver `verify_jwt=true`. Configurer `OPENAI_API_KEY` dans les secrets Edge Functions de Supabase. Ne pas mettre cette clé dans les variables `VITE_*`.

## 4. Paiements Kkiapay

Les fonctions de commande et de vérification Kkiapay sont déployées côté Supabase. Avant d'activer les ventes en production :

- Configurer `KKIAPAY_PUBLIC_KEY`, `KKIAPAY_PRIVATE_KEY` et `KKIAPAY_SECRET_KEY` dans les secrets Edge Functions Supabase.
- Définir `KKIAPAY_SANDBOX=true` pour les essais, puis basculer explicitement à `false` après validation marchand.
- Configurer l'URL de notification dans le compte marchand Kkiapay : `https://gkguyjmqdvjwcqjivcwj.supabase.co/functions/v1/kkiapay-webhook`.
- Générer un jeton webhook aléatoire long, puis stocker uniquement son SHA-256 hexadécimal (64 caractères) sous `KKIAPAY_WEBHOOK_SECRET_HASH`. Ne jamais envoyer le jeton brut dans GitHub ou dans cette conversation. Exemple local pour calculer son empreinte : `printf '%s' "$KKIAPAY_WEBHOOK_SECRET" | sha256sum`.
- Configurer le webhook Kkiapay pour transmettre le jeton brut dans l'en-tête `x-kkiapay-secret`. La fonction calcule son empreinte et compare celle-ci en temps constant.
- Tester les paiements réussis, refusés, abandonnés, les notifications répétées et les vérifications serveur. Le webhook enregistre un événement ; il n'active jamais seul un abonnement.
- Ne jamais activer un abonnement uniquement à partir d'un retour navigateur.

Les fonctions de paiement restent bloquées côté serveur si leurs secrets marchands ne sont pas configurés.

## 5. Publication Netlify

Le dépôt fournit le workflow manuel `Deploy NEXORA to Netlify production` dans GitHub Actions. Pour publier :

1. Créer un jeton personnel Netlify dans les paramètres du compte Netlify.
2. Ajouter ce jeton dans GitHub : `Settings → Secrets and variables → Actions`, sous le nom `NETLIFY_AUTH_TOKEN`.
3. Ouvrir l'onglet Actions du dépôt, choisir `Deploy NEXORA to Netlify production`, puis cliquer sur `Run workflow`.
4. Le workflow relance `npm test`, compile le site avec Node 22 et publie le dossier `dist` sur le site Netlify `jdvnexora`.
5. Vérifier que le déploiement Netlify est à l'état `ready` et correspond au commit attendu.

Ne jamais inscrire le jeton Netlify dans le dépôt ou dans une conversation. Le workflow est manuel pour éviter de lancer un déploiement de production sans validation explicite.

## 6. Sécurité Auth et validation avant publication

- Vérifier CI et le build Vite.
- Tester inscription, connexion, récupération de mot de passe et déconnexion.
- Tester l'accès à deux comptes distincts et les politiques RLS.
- Tester Studio IA avec une session authentifiée.
- Tester les commentaires et les rôles de collaboration.
- Tester les vues mobile et tablette.
- Activer la protection contre les mots de passe compromis dans la configuration Supabase Auth.
- Vérifier les alertes de sécurité Supabase et les URL de redirection.

## 7. Limites actuelles connues

- Les collaborateurs peuvent lire les projets partagés et commenter, mais l'édition collaborative des chapitres n'est pas encore activée.
- Le paiement en ligne n'est pas activé tant que le prestataire et ses secrets ne sont pas configurés.
- Les alertes Supabase déjà relevées concernant l'extension `pg_net` dans le schéma `public` et la protection des mots de passe compromis doivent être traitées dans les paramètres du projet après validation.
