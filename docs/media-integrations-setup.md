# Configuration des intégrations médias NEXORA

La fonction Edge `media-integrations` est déployée sur le projet Supabase `gkguyjmqdvjwcqjivcwj`. Elle gère l’autorisation OAuth, la synchronisation des médias autorisés et le stockage des jetons côté serveur.

## Secrets à configurer

Dans Supabase Dashboard → Edge Functions → Secrets, ajoutez ces variables. Ne placez jamais les valeurs dans le code React, GitHub ou des variables `VITE_*` :

- `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` : application OAuth Google/YouTube.
- `TIKTOK_CLIENT_KEY` et `TIKTOK_CLIENT_SECRET` : application TikTok avec Display API approuvée.
- `META_APP_ID` et `META_APP_SECRET` : application Meta configurée pour Instagram professionnel/créateur.
- `META_GRAPH_VERSION` est facultatif (défaut `v22.0`).

Supabase fournit déjà les variables serveur `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`. Ne partagez jamais la clé service-role.

## URI de redirection OAuth

Enregistrez l’URI exacte de chaque fournisseur :

- YouTube / Google : `https://gkguyjmqdvjwcqjivcwj.supabase.co/functions/v1/media-integrations?action=callback&platform=youtube`
- TikTok : `https://gkguyjmqdvjwcqjivcwj.supabase.co/functions/v1/media-integrations?action=callback&platform=tiktok`
- Instagram / Meta : `https://gkguyjmqdvjwcqjivcwj.supabase.co/functions/v1/media-integrations?action=callback&platform=instagram`

L’URI doit correspondre exactement à celle enregistrée dans la console développeur.

## Autorisations et limites

- YouTube : l’utilisateur autorise sa propre chaîne. Les vidéos sont affichées via le lecteur officiel ; aucune copie vidéo n’est téléchargée.
- TikTok : nécessite l’accès Display API et les permissions d’affichage des vidéos du compte autorisé.
- Instagram : nécessite un compte professionnel/créateur correctement relié à une Page Facebook et les permissions Meta nécessaires.
- Les comptes privés, vidéos supprimées, géobloquées ou non intégrables ne peuvent pas être rendus accessibles par NEXORA.
- La synchronisation concerne uniquement les comptes explicitement autorisés ; elle ne récupère pas secrètement les contenus de tiers.

## Vérification

La fonction utilise une validation JWT manuelle pour les actions POST et permet le callback OAuth public. Les actions `connect`, `status`, `sync` et `disconnect` doivent continuer à vérifier la session utilisateur côté serveur. Les identifiants développeur et validations de plateformes ne sont pas inclus dans le dépôt ; ils doivent être ajoutés avant les tests réels.