# Déploiement — JDV NEXORA AI STUDIO

## 1. Variables de build

Configurer ces variables dans l'hébergeur (Netlify ou autre) :

- `VITE_SUPABASE_URL` : URL du projet Supabase.
- `VITE_SUPABASE_ANON_KEY` : clé publishable/anon du projet. Ne jamais utiliser une clé `service_role` dans le navigateur.

## 2. Supabase Auth

Dans les URL de redirection autorisées, ajouter le domaine de production et le domaine de preview réellement utilisés. Vérifier aussi l'URL de redirection des e-mails de réinitialisation du mot de passe.

## 3. Studio IA

La fonction Edge `studio-ai` doit conserver `verify_jwt=true`. Configurer `OPENAI_API_KEY` dans les secrets Edge Functions de Supabase. Ne pas mettre cette clé dans les variables `VITE_*`.

## 4. Paiements

La phase 10 prépare les forfaits et abonnements, mais n'initie pas de paiement réel. Avant d'activer les ventes, choisir un prestataire adapté aux pays ciblés, configurer ses secrets côté serveur, vérifier les signatures des webhooks et ne jamais activer un abonnement uniquement à partir d'un retour navigateur.

## 5. Validation avant publication

- Vérifier CI et le build Vite.
- Tester inscription, connexion, récupération de mot de passe et déconnexion.
- Tester l'accès à deux comptes distincts et les politiques RLS.
- Tester Studio IA avec une session authentifiée.
- Tester les commentaires et les rôles de collaboration.
- Tester les vues mobile et tablette.
- Vérifier les alertes de sécurité Supabase et les URL de redirection.

## 6. Limites actuelles connues

- Les collaborateurs peuvent lire les projets partagés et commenter, mais l'édition collaborative des chapitres n'est pas encore activée.
- Le paiement en ligne n'est pas activé tant que le prestataire et ses secrets ne sont pas configurés.
- Les alertes Supabase déjà relevées concernant l'extension `pg_net` dans le schéma `public` et la protection des mots de passe compromis doivent être traitées dans les paramètres du projet après validation.
