# Système de conception visuelle — JDV NEXORA AI STUDIO

**Statut :** règle visuelle de référence du produit.  
**Portée :** vitrine publique, authentification et pages métier.  
**Exception explicite :** le tableau de bord référentiel authentifié est conservé dans son apparence approuvée et n'hérite pas de la palette métier.

## 1. Palette de marque

La spécification maître du produit fixe les quatre couleurs de base suivantes :

| Rôle | Couleur | Usage |
|---|---|---|
| Noir | `#0B0B0D` | Fond principal, arrière-plan des champs |
| Graphite | `#202024` | Cartes, panneaux et surfaces secondaires |
| Ivoire | `#F5F2EA` | Titres, texte principal et contrastes clairs |
| Or | `#D6B66E` | Accent de marque, icônes, éléments actifs, liens d'accent et actions principales |

Les transparences de ces quatre couleurs peuvent servir aux bordures, survols et fonds légers, mais elles ne doivent pas introduire un nouvel accent chromatique pour une page métier. Le violet et le cyan ne sont pas des couleurs d'accent des pages métier dans cette identité. Ils restent présents dans le tableau de bord référentiel historique qui doit demeurer intact.

### Couleurs fonctionnelles

Les couleurs fonctionnelles ne servent qu'à communiquer un état :
- succès ou connexion confirmée : vert accessible ;
- avertissement ou traitement en cours : or ;
- erreur ou action destructive : rouge accessible ;
- information neutre : ivoire atténué ou graphite.

Elles ne remplacent jamais la couleur de marque des boutons principaux, des icônes d'accent ou de la navigation active.

## 2. Règles de cohérence

- Une seule source de vérité pour la palette métier : les variables CSS portées par `.page-shell.brand-theme`.
- La page active doit être clairement distinguée dans la navigation par un fond or discret et un repère or.
- Les titres restent en ivoire ; les paragraphes secondaires et les métadonnées utilisent une teinte ivoire atténuée.
- Les champs, listes déroulantes, panneaux et cartes utilisent le noir et le graphite avec des bordures or discrètes.
- Les actions principales sont or avec un texte noir ; les actions secondaires restent neutres, bordées et lisibles.
- Les indicateurs de chargement, d'erreur, de succès et d'absence de données restent textuels et accessibles.
- Un composant partagé ne doit pas introduire sa propre couleur de marque via un code couleur isolé. Les exceptions sont limitées aux états fonctionnels et aux médias tiers eux-mêmes.
- La vitrine publique peut garder sa composition spécifique, mais elle utilise la même palette de marque.

## 3. Espacement, grilles et comportement adaptatif

L'échelle d'espacement suit des multiples de 4 px. Les espacements courants sont 8, 12, 16, 20 et 24 px. La taille d'espacement peut augmenter sur grand écran, mais deux éléments de même niveau doivent garder le même espacement entre eux.

- Tous les conteneurs de grille/flex doivent pouvoir rétrécir : `min-width: 0` et colonnes avec `minmax(0, 1fr)` lorsque pertinent.
- Les panneaux utilisent un remplissage responsive et des gaps réguliers ; les sections indépendantes gardent une séparation visible.
- Les titres, sources, courriels, statuts, adresses, boutons et libellés longs doivent pouvoir revenir à la ligne.
- Les boutons ne doivent pas dépasser leur carte ; plusieurs actions doivent s'envelopper ou passer en grille quand l'espace manque.
- Les cartes d'intégration des fournisseurs média s'alignent dans une grille adaptative, avec les descriptions au-dessus des actions et un espacement fixe.
- Les métriques et sources raccordées se réorganisent sur petit écran ; elles ne doivent pas provoquer de défilement horizontal.
- Les tableaux et listes denses doivent conserver des colonnes réductibles ou passer à une présentation empilée aux largeurs mobiles.
- Les focus clavier doivent demeurer nettement visibles avec un contraste adapté.

## 4. Contrôle des 17 écrans

| Nº | Écran | Route / mode | Règle visuelle |
|---:|---|---|---|
| 1 | Tableau de bord référentiel | `dashboard` | Exception : apparence approuvée conservée, aucune nouvelle palette métier imposée |
| 2 | Studio IA | `studio` | Palette marque partagée, états de génération visibles |
| 3 | Mes projets | `projects` | Palette marque partagée, filtres et éditeur adaptatifs |
| 4 | Studio de conception visuelle | `design` | Palette marque partagée, panneau de composants, aperçu et propriétés sans débordement ; accès administrateur maintenu |
| 5 | Entreprise / équipe | `organizations` | Palette marque partagée, cartes et invitations adaptatives |
| 6 | Profil et préférences | `profile` | Palette marque partagée, formulaires empilables |
| 7 | Administration | `administration` | Palette marque partagée, états de permission visibles |
| 8 | Académie | `academy` | Palette marque partagée, grilles de cours adaptatives |
| 9 | Bibliothèque de formation | `library` | Palette marque partagée, éléments et métadonnées lisibles |
| 10 | Ressources numériques | `resources` | Palette marque partagée, cartes et états vides cohérents |
| 11 | Découvrir | `discover` | Palette marque partagée, filtres, liste et panneau latéral adaptatifs |
| 12 | Vidéothèque et créateurs | `media` | Palette marque partagée, grilles des fournisseurs et actions sans chevauchement |
| 13 | Roadmap | `roadmap` | Palette marque partagée, cartes de tâches et priorités cohérentes |
| 14 | Timeline | `timeline` | Palette marque partagée, événements en liste verticale réductible |
| 15 | Analyses / Insights | `insights` | Palette marque partagée, métriques en grille adaptative |
| 16 | Abonnement et facturation | `billing` | Palette marque partagée, cartes de forfaits et actions adaptatives |
| 17 | Vitrine publique / inscription | `view=public` / `mode=signup` | Composition publique spécifique, palette de marque partagée ; états et formulaire adaptatifs |

## 5. Sources et raccordements

La couleur et la structure visuelle ne prouvent pas qu'une source fonctionne. Chaque écran doit afficher les données de sa propre source, conserver ses contrôles d'accès, signaler les erreurs et ne jamais inventer une métrique. Les identifiants des sources et les règles de sécurité figurent dans [la carte des pages et de leurs sources](./page-source-map.md).

## 6. Validation exigée avant une déclaration de conformité totale

Une conformité complète doit être confirmée sur le rendu déployé : navigation de chaque écran, mode administrateur/utilisateur, chargement/erreur/état vide, actions longues, texte long, et tailles bureau/tablette/mobile. Le build et les vérifications statiques ne remplacent pas les tests visuels réels. Une capture présentant un chevauchement reste un défaut à corriger, même si la compilation réussit.
