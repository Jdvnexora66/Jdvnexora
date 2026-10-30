# Plan de construction et validation — JDV NEXORA AI STUDIO

Ce registre couvre les **17 écrans** demandés, y compris le tableau de bord référentiel qui reste inchangé. Les pages métier sont construites en réutilisant les composants et les sources déjà présents. Une page ne peut être déclarée « validée » qu'après les tests de rendu, des interactions, des données, des permissions et du responsive.

## Statuts

- **Base présente** : composant/écran trouvé dans le dépôt.
- **Raccordé dans le code** : les lectures/écritures du composant utilisent les sources indiquées dans la carte des sources.
- **À vérifier** : les tests d'intégration réels n'ont pas encore été entièrement faits.
- **Bloqué / dépendance** : nécessite une configuration ou un service externe.
- **Validée** : CI/build réussis et critères fonctionnels prouvés sur le bon déploiement.

## Tableau de suivi

| Nº | Page | Base dans le dépôt | Source à conserver | À terminer avant clôture |
|---:|---|---|---|---|
| 1 | Tableau de bord référentiel | Oui | `ReferenceDashboard`, `profiles`, `studio_projects`, `studio_assets` | Ne pas reconstruire; vérifier seulement les régressions |
| 2 | Studio IA | Oui | `studio_ai_messages`, Edge Function `studio-ai` | IA, historique, quota, export, erreurs et RLS |
| 3 | Mes projets | Oui | `studio_projects`, `studio_assets`, `studio_project_members` | CRUD, détails, sauvegarde, statut, export, appartenance B2B |
| 4 | Studio Design | Oui | `visual_studio_layouts`, `visual_studio_versions`, `visual_studio_publications`, `pageDataBindings` | Page native dans l'aperçu, édition de blocs et sources autorisées, restauration, publication; l'édition complète de composants natifs reste un critère distinct |
| 5 | Entreprise et équipe | Oui | `organizations`, `organization_members`, `organization_invitations` | Création, invitations, acceptation, rôles, isolation des organisations |
| 6 | Profil et préférences | Oui | `profiles`, Supabase Auth | Sauvegarde, récupération de compte, erreurs et permissions |
| 7 | Administration | Oui | `profiles`, `audit_logs`, `nexora_courses`, `nexora_course_lessons` | Rôles, journal d'audit, contenus et accès administrateur |
| 8 | Académie | Oui | tables `nexora_learning_*`, `nexora_courses`, `nexora_course_enrollments`, `nexora_course_lessons` | Cours, leçons, progression, inscription gratuite, statut des cours payants |
| 9 | Bibliothèque de formation | Oui | `user_learning_items`, `entrepreneurs`, `content_items` | Notes, favoris, progression et persistance privée |
| 10 | Ressources numériques | Oui | `nexora_resources`, `nexora_resource_progress` | Filtres, accès aux liens, états vides/erreur, sauvegarde de progression |
| 11 | Découvrir | Oui | `entrepreneurs`, `content_sources`, `social_accounts`, `followed_entrepreneurs` | Filtres, sources, suivi, modification et visibilité des profils possédés |
| 12 | Vidéothèque + créateurs | Oui | `media_library_items`, Storage `nexora-media`, Edge Functions média/créateurs | Liens, upload, connexions optionnelles, synchronisation et droits |
| 13 | Roadmap | Oui | `roadmap_tasks` | Créer/éditer/supprimer, priorités, échéances et statuts — édition ajoutée dans la branche de complétion |
| 14 | Timeline | Oui | `timeline_events`, `entrepreneurs`, `content_sources` | Dates sourcées, filtres et états sans données |
| 15 | Insights | Oui | `content_items`, `content_analyses`, `studio_ai_messages` | Sources et état des analyses; Studio IA enregistre les analyses structurées pour les contenus appartenant à l'utilisateur |
| 16 | Facturation | Oui | `plans`, `subscriptions` | Statut, offres, permissions; pas de paiement fictif |
| 17 | Vitrine + connexion/inscription | Oui | `PublicVitrine`, Supabase Auth | Navigation publique, signup/signin, reset, contact et mobile |

## État fonctionnel constaté — 30 octobre 2026

Les améliorations suivantes sont présentes dans les branches de travail, mais ne doivent pas être confondues avec une validation en production :

- **Roadmap** : création, modification, suppression, priorité, échéance et changement de statut; l'édition des champs d'un objectif est ajoutée dans la branche de complétion.
- **Discover** : ajout, suivi, modification des profils appartenant à l'utilisateur et bascule public/privé. Les profils d'autres propriétaires restent en lecture seule.
- **Insights + Studio IA** : lancement d'une analyse depuis un contenu. Pour un contenu appartenant à l'utilisateur, le résultat structuré est enregistré dans `content_analyses`; les contenus publics appartenant à d'autres auteurs restent consultables sans écriture sur leur fiche.
- **Entreprise et équipe** : création d'organisation, création et acceptation d'invitations, lecture des membres et de leurs rôles. La modification/révocation des rôles et l'envoi automatique d'e-mails dépendent encore des contrôles serveur et de la phase sécurité.
- **Académie + Facturation** : le paiement KKIAPAY des formations et des forfaits est développé dans la PR #121, encore séparée de `main` au moment de cette mise à jour. Les essais marchands Sandbox restent requis.
- **Studio Design** : une première sélection de familles de composants natifs et des réglages visuels sont disponibles depuis la PR #120. L'édition de chaque élément individuel, l'aperçu fidèle et les tests de publication restent à approfondir.

### Statut de validation

Aucune des 17 pages ne doit être déclarée « validée en production » uniquement parce que son composant existe ou que le build passe. Les contrôles réels des comptes, des données, des rôles, du responsive et du déploiement doivent être exécutés avant clôture. Le tableau de bord référentiel reste inchangé.

## Couche commune des pages métier

`ModuleDataOverview` affiche les valeurs calculées par les composants et leurs sources de lecture. Il n'exécute pas de requête et ne transforme pas une erreur en valeur zéro. Le tableau de bord référentiel n'utilise pas ce composant afin de conserver son design approuvé.

Les blocs personnalisés `text`, `card` et `stat` du Studio Design acceptent des clés fixes via `src/lib/pageDataBindings.ts`. Les clés privées sont filtrées par l'utilisateur authentifié et restent protégées par RLS. Les sources non disponibles sont affichées « N/D ».

## Critères de clôture

1. Tester toutes les actions et tous les formulaires; capturer les états chargement, vide, succès et erreur.
2. Vérifier ordinateur, tablette, téléphone et navigation clavier.
3. Confirmer que la source attendue est appelée et que les données persistent après actualisation.
4. Tester explicitement l'isolation inter-utilisateurs et inter-organisations.
5. Vérifier les fonctions Edge et configurations externes; ne pas annoncer comme opérationnelles les intégrations non testées.
6. Attendre un build/CI réussi sur le dernier commit, vérifier le bon déploiement.
7. Mettre à jour ce tableau avec des preuves, sans confondre présence de code et validation réelle.
