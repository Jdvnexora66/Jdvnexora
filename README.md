# JDV NEXORA AI STUDIO

Plateforme de création et d’organisation de projets (e-books, formations, documents et autres contenus), avec un espace de travail connecté à Supabase.

## Démarrer dans GitHub Codespaces

1. Ouvrir le dépôt dans un Codespace.
2. Ouvrir le terminal intégré.
3. Installer les dépendances :

   ```bash
   npm install
   ```

4. Préparer les variables d’environnement :

   ```bash
   cp .env.example .env.local
   ```

5. Ouvrir `.env.local` et vérifier les valeurs Supabase du projet autorisé. Les variables côté navigateur attendues sont :

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (ou la clé publishable compatible)

   Ne jamais placer une clé `service_role`, un secret fournisseur IA ou une autre clé privée dans une variable `VITE_*` : ces valeurs sont exposées au navigateur. Ne pas publier le contenu de `.env.local`.

6. Démarrer Vite en exposant le serveur au port transféré de Codespaces :

   ```bash
   npm run dev -- --host 0.0.0.0
   ```

7. Dans l’onglet **Ports** de Codespaces, repérer le port **5173** et choisir **Open in Browser**. Si le port n’apparaît pas, vérifier que la commande de développement tourne toujours dans le terminal ; arrêter un ancien serveur bloqué avec `Ctrl+C`, puis relancer la commande.

## Vérifications avant intégration

Exécuter le contrôle TypeScript et la compilation de production :

```bash
npm run build
```

Le workflow GitHub Actions `CI` exécute cette commande à chaque pull request vers `main` et à chaque push sur `main`.

## Dépendances externes

L’application utilise React, Vite et le client Supabase. Certaines fonctions nécessitent un projet Supabase configuré, les tables attendues et les permissions correspondantes. Un build réussi vérifie le typage et la compilation, mais ne prouve pas que les accès Supabase, les comptes, les fonctions IA ou le déploiement sont opérationnels.

Les migrations Supabase ne sont pas appliquées automatiquement par le démarrage local. Examiner et valider séparément les changements de base de données et de permissions avant toute application.

## Scripts

- `npm run dev` : serveur local de développement.
- `npm run build` : vérification TypeScript et compilation de production.
- `npm run preview` : prévisualisation du build de production.
