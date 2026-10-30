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

## État de livraison après les PR #120, #122, #121 et #123

| Nº | Page | Fonctions maintenant présentes dans le code | Reste avant clôture fonctionnelle |
|---:|---|---|---|
| 1 | Tableau de bord référentiel | Référence visuelle et navigation vers les modules | Contrôle de non-régression uniquement; aucune refonte prévue |
| 2 | Studio IA | Historique, quota, génération, export, nouvelle conversation et contexte transmis par Insights | Test du fournisseur IA, du quota, des erreurs et de la persistance avec un compte de recette |
| 3 | Mes projets | Création, recherche, filtres, édition des métadonnées et chapitres, sauvegarde et accès aux projets partagés | Vérifier les scénarios multi-comptes; l'édition collaborative avancée dépendra des permissions de la phase sécurité |
| 4 | Studio Design | Brouillon, blocs, sources de données autorisées, versions, publication, aperçu réel et sélection directe d'un élément natif précis; styles et texte des éléments textuels simples | PR #123 fusionnée; Build NEXORA, CI, qualité Web, Android debug et iOS simulateur réussis; reste la recette visuelle page par page avec sauvegarde/publication/rechargement; les composants complexes avec enfants ne sont pas réécrits arbitrairement |
| 5 | Entreprise et équipe | Organisations, membres, invitations et acceptation par fonctions serveur | Gestion complète des rôles, révocation et isolation stricte à finaliser dans la phase sécurité |
| 6 | Profil et préférences | Modification du nom, de la langue et du fuseau horaire | Test de sauvegarde et de récupération sur compte de recette |
| 7 | Administration | Gestion des rôles, cours, leçons et consultation des journaux autorisés | Tests des rôles et des actions serveur; les permissions restent dans le lot sécurité |
| 8 | Académie | Parcours, progression, inscription gratuite et paiement KKIAPAY des cours avec confirmation serveur | Ajouter les clés marchandes sandbox et tester les scénarios Mobile Money/carte, annulation, attente, reprise et doublon |
| 9 | Bibliothèque de formation | Ajout, modification de notes, favoris, signets, objectifs et progression | Test de persistance et de séparation entre comptes |
| 10 | Ressources numériques | Catalogue, recherche, filtres et progression individuelle | Vérifier liens externes, contenus publiés et états d'erreur avec des données réelles |
| 11 | Découvrir | Recherche, filtres, profils, sources, suivi, modification des profils possédés et visibilité | Test des droits propriétaire/public et des données réelles |
| 12 | Vidéothèque + créateurs | Ajout de liens, fichiers possédés, suppression, visibilité, OAuth natif/web et synchronisation | Tester les fournisseurs réels, les droits de fichiers et les appareils Android/iOS |
| 13 | Roadmap | Création, édition, suppression, priorités, échéances et statuts | Test complet de persistance et des états limites |
| 14 | Timeline | Lecture, filtres, ajout, modification et suppression d'événements des profils possédés | Vérifier les sources et les événements sans preuve; test de persistance |
| 15 | Insights | Catalogue d'analyses et envoi de contenus possédés au Studio IA; sauvegarde du résultat dans `content_analyses` | Tester la génération réelle et l'affichage après rechargement |
| 16 | Facturation | Forfaits gratuits/payants/devis, commande serveur, KKIAPAY, vérification et activation idempotente | Tester Sandbox et règles de changement/renouvellement; le prélèvement récurrent automatique n'est pas inclus |
| 17 | Vitrine publique | Présentation publique, navigation vers le portail, formulaire de contact | Vérifier liens, affichage mobile et envoi du contact sur le déploiement final |

### État du paiement déployé

Les fonctions Edge suivantes sont actives sur le projet Supabase `gkguyjmqdvjwcqjivcwj`, avec JWT obligatoire :
- `create-course-payment-order` — version 1
- `create-subscription-payment-order` — version 1
- `verify-kkiapay-payment` — version 2

Le serveur fixe le montant à partir du tarif enregistré en base, vérifie l'identité de l'utilisateur, contrôle la transaction KKIAPAY avant d'activer l'accès et permet de reprendre une vérification interrompue. Le déploiement des fonctions est confirmé; cela ne prouve pas qu'un paiement Sandbox ou réel a été exécuté.

**Configuration marchande encore nécessaire :** `KKIAPAY_PUBLIC_KEY`, `KKIAPAY_PRIVATE_KEY`, `KKIAPAY_SECRET_KEY`, puis `KKIAPAY_SANDBOX=true` pour les essais. Les clés privées ne doivent jamais être ajoutées au dépôt ni au client web.

**Déploiement web :** le code est fusionné dans GitHub, mais le déploiement Netlify de production reste à effectuer par l'équipe JDV, conformément au périmètre convenu.

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
