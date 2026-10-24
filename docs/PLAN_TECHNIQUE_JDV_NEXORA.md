# JDV NEXORA AI STUDIO — Plan technique

## 1. État actuel

- Le dépôt GitHub est `Jdvnexora66/Jdvnexora`.
- Le projet Supabase associé est `gkguyjmqdvjwcqjivcwj`.
- Le schéma initial Supabase a été appliqué.
- Les tables principales et les politiques de sécurité RLS sont en place.
- L’interface d’authentification reste à développer et à tester.
- Le Studio IA reste désactivé jusqu’à validation de la sécurité.

## 2. Ordre de développement

1. Préparer le socle frontend.
2. Connecter Supabase avec des variables d’environnement.
3. Développer l’inscription, la connexion, la déconnexion et la réinitialisation du mot de passe.
4. Vérifier la création automatique des profils.
5. Tester les rôles et les permissions avec plusieurs comptes.
6. Vérifier les politiques RLS et les alertes de sécurité.
7. Activer le Studio IA uniquement après validation des tests.

## 3. Règles de sécurité

- Ne jamais publier de mot de passe, jeton ou clé secrète dans GitHub.
- Ne jamais placer la clé Supabase service_role dans le navigateur.
- Utiliser les politiques RLS pour protéger les données.
- Vérifier les autorisations côté serveur ou dans la base de données.
- Ne pas supprimer les tables existantes sans analyse et sauvegarde.
- Distinguer les fonctionnalités planifiées, développées, testées et opérationnelles.

## 4. Prochaine étape

Intégrer le frontend d’authentification, puis tester l’inscription, la connexion, la déconnexion et l’isolation des données avant d’activer le Studio IA.
