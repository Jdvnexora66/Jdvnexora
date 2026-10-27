# JDV NEXORA AI STUDIO — Stratégie d’abonnement et plan de mise en œuvre

**Statut :** document de stratégie — aucune activation de paiement autorisée par ce document.  
**Marché de départ :** Afrique francophone.  
**Modèle retenu :** accès gratuit permanent aux fonctions de base, avec options payantes quand le produit et la facturation seront prêts.  
**Moyens visés :** Mobile Money et cartes bancaires, selon disponibilité vérifiée pays par pays.

## 1. Décision stratégique

NEXORA ne doit pas exiger un abonnement pour accéder à la plateforme dès son lancement. Le plan gratuit doit rester utilisable dans la durée et aider les utilisateurs à découvrir la valeur du produit. Les offres payantes doivent financer les usages plus intensifs, les fonctions avancées et le travail en équipe, sans promettre des capacités qui ne sont pas encore construites.

Le paiement en ligne restera désactivé tant que les étapes de validation décrites ci-dessous ne seront pas réalisées et approuvées explicitement.

## 2. État technique vérifié au moment de la rédaction

### Déjà présent (à revalider par des tests avant commercialisation)

- L’application React/TypeScript est connectée à Supabase.
- Le composant `src/components/BillingPanel.tsx` existe dans la branche `feature/premium-interface-12-parts`.
- Le composant peut lire les tables `plans` et `subscriptions`, afficher les forfaits et l’état d’un abonnement.
- Un administrateur peut créer un forfait et l’afficher ou le masquer.
- La table `plans` contient notamment code, nom, description, état actif, fonctionnalités JSON, prix, devise, périodicité et durée d’essai.
- La table `subscriptions` contient notamment utilisateur, forfait, statut, dates, prestataire et référence de transaction.
- L’interface précise déjà que la collecte des paiements doit être reliée à un prestataire avant toute vente en ligne.

### Pas encore confirmé comme construit ou prêt pour la production

- Aucune intégration de paiement réelle n’a été confirmée dans le code consulté.
- Aucun webhook de paiement vérifié, idempotent et protégé n’a été confirmé.
- Aucun flux complet d’achat, de validation du paiement, de renouvellement, d’annulation ou de remboursement n’a été testé de bout en bout.
- Aucun contrôle centralisé des quotas par forfait n’a été validé.
- Aucun mécanisme automatique de renouvellement récurrent n’a été validé. Ne pas confondre paiement manuel mensuel et prélèvement récurrent.
- Aucun tarif commercial définitif n’a été approuvé.
- Les droits RLS et les autorisations administrateur doivent être audités spécifiquement avant d’autoriser l’écriture ou la modification des abonnements.
- La disponibilité des moyens de paiement et des devises doit être confirmée pour chaque pays ciblé, selon le compte marchand réel.

## 3. Catalogue d’offres proposé pour tester le marché

Les montants ci-dessous sont des hypothèses de départ, non des prix publiés ni des tarifs déjà validés. Les offres doivent être activées seulement lorsque leurs fonctions et limites sont effectivement appliquées côté serveur.

| Offre proposée | Prix indicatif | Utilisateur cible | Positionnement |
|---|---:|---|---|
| Free | 0 FCFA, permanent | Toute personne qui découvre NEXORA | Projets et outils de base avec quotas raisonnables |
| Starter | 2 500 FCFA/mois | Indépendants et débutants | Quotas plus élevés et davantage de capacité |
| Pro | 7 500 FCFA/mois | Entrepreneurs actifs | Usage régulier, quotas supérieurs et fonctions avancées disponibles |
| Team | 25 000 FCFA/mois à tester | Petites équipes | Plusieurs membres, rôles et espace partagé si le produit le permet réellement |
| Business | Sur devis, plus tard | Organisations | Besoins d’équipe et accompagnement spécifique, après capacité opérationnelle confirmée |

### Règles de conception des offres

- Free reste gratuit tant que le compte est conforme aux conditions d’utilisation ; annoncer clairement les quotas et les restrictions.
- Proposer éventuellement un essai premium de 7 jours, sans renouvellement payant automatique non consenti. Ne pas l’activer avant que les fonctionnalités premium et le parcours de consentement soient prêts.
- Ne pas annoncer « IA illimitée ». Définir des quotas selon les coûts mesurés.
- Éviter de facturer séparément chaque fonction au départ. Tester d’abord trois offres utilisateurs (Free, Starter, Pro), puis introduire Team après validation de la collaboration et des rôles.
- Proposer l’annuel seulement après observation de l’usage, du taux de conversion et du coût réel de service.
- Afficher le prix total, la devise, la périodicité, les limites, les règles de renouvellement, la procédure d’annulation et la politique de remboursement avant le consentement.

## 4. Paiements : approche recommandée pour l’Afrique francophone

Créer une couche d’abstraction de paiement côté serveur pour ne pas lier toute l’application à un seul prestataire. Le système devra distinguer le pays du client, la devise, le canal de paiement et le type de transaction.

### Candidats à évaluer, sans sélection ni intégration approuvée

- **PayPlus Africa :** sa page publique annonce au Bénin MTN et Moov ainsi que des paiements par cartes Visa/Mastercard/Amex. C’est un candidat à vérifier pour le premier marché, notamment pour l’API, les webhooks, les remboursements, la disponibilité du compte marchand et le support des paiements récurrents.
- **Flutterwave :** sa documentation présente les cartes et des méthodes Mobile Money en XOF/XAF selon les pays. Sa page d’aide Mobile Money énumère toutefois certains pays XOF et ne liste pas le Bénin dans cette liste. Ne pas supposer que tous les opérateurs ou tous les pays sont couverts : obtenir confirmation écrite et tester les paramètres de devise/pays.
- **Paystack :** sa documentation indique les cartes et certains canaux Mobile Money, mais sa liste de pays servis ne permet pas de présumer qu’un marchand enregistré au Bénin peut l’utiliser en production. À considérer pour l’expansion uniquement après vérification de l’éligibilité du marchand.

Références publiques consultées :
- PayPlus Africa : https://payplus.africa/
- Flutterwave, moyens de paiement : https://developer.flutterwave.com/docs/payment-methods
- Flutterwave, disponibilité Mobile Money : https://www.flutterwave.com/rw/support/payment-methods/pay-with-mobile-money
- Paystack, pays desservis : https://support.paystack.com/en/articles/2130562

**Décision proposée :** commencer par vérifier l’éligibilité et le contrat d’un prestataire compatible avec le Bénin, puis confirmer les pays suivants un à un. Ne pas promettre la couverture de toute l’Afrique francophone avec un seul prestataire avant cette vérification.

## 5. Architecture de facturation à construire

### A. Catalogue et accès

- Conserver un catalogue de plans administrable, mais ne jamais permettre au navigateur de définir lui-même le prix ou le statut payé.
- Définir une source serveur de vérité pour le plan courant et les droits associés.
- Créer une matrice de capacités (par exemple nombre de projets, quota IA, stockage, membres d’équipe) avec des limites explicites.
- Appliquer les quotas dans les Edge Functions/API côté serveur et dans les règles de données pertinentes ; le masquage d’un bouton dans l’interface n’est pas un contrôle de sécurité.
- Garder le plan Free comme comportement par défaut pour tout utilisateur sans abonnement payant valide.

### B. Transaction sécurisée

1. L’utilisateur connecté choisit un plan publié.
2. Le serveur relit le plan actif depuis la base, valide la devise et calcule le montant.
3. Le serveur crée une commande avec un identifiant unique et un statut initial non payé.
4. Le serveur demande au prestataire de créer le paiement et conserve la référence fournie.
5. Le navigateur affiche la page/consigne de paiement hébergée ou le flux officiel du prestataire.
6. Le prestataire appelle un webhook serveur. Le webhook vérifie la signature selon les spécifications officielles du prestataire, la référence, le montant, la devise et le statut.
7. Le traitement est idempotent : le même événement reçu plusieurs fois ne crée ni plusieurs paiements ni plusieurs abonnements.
8. Après confirmation serveur seulement, la transaction passe à « payée » et l’abonnement est activé ou prolongé.
9. Les retours du navigateur ne sont jamais une preuve suffisante de paiement.
10. Les événements inconnus, montants incorrects et signatures invalides sont refusés et journalisés sans exposer de secrets.

### C. Données à examiner/compléter après audit du schéma existant

- Une table de commandes/paiements avec référence interne unique, fournisseur, référence fournisseur, montant, devise, statut, horodatages et métadonnées non sensibles.
- Un journal d’événements de webhook avec contrainte d’unicité pour assurer l’idempotence.
- Les champs nécessaires aux renouvellements, annulations, périodes de grâce et remboursements.
- Des contraintes d’intégrité et index adaptés.
- Des politiques RLS : un utilisateur ne peut lire que ses propres abonnements et transactions ; aucune modification directe par le client du prix, du statut payé ou du rôle.
- Les secrets du prestataire restent uniquement dans les secrets Supabase/Edge Functions, jamais dans React, GitHub, les logs ou les réponses au navigateur.

Ne créer aucune migration de facturation avant l’audit des politiques existantes, la validation du prestataire et la revue du schéma actuel.

## 6. Ordre d’exécution

### Étape 1 — Audit sans modification
- Examiner toutes les politiques RLS de `plans` et `subscriptions`.
- Vérifier les fonctions existantes, les secrets configurés (sans afficher leurs valeurs), les migrations et les éventuels webhooks.
- Confirmer les champs de devise et l’unité exacte de `price_minor`. Le composant actuel traite XOF comme une valeur en FCFA et les autres devises comme des unités mineures ; cette convention doit être documentée et validée.
- Vérifier que seul un administrateur autorisé peut créer ou publier des forfaits.
- Vérifier l’absence d’un ancien flux de paiement caché ou incomplet.

**Critère de sortie :** rapport d’audit et schéma cible approuvés ; aucun paiement actif.

### Étape 2 — Définir le produit
- Confirmer les fonctions qui sont réellement incluses dans Free, Starter et Pro.
- Mesurer le coût d’utilisation du Studio IA, du stockage et du support.
- Fixer les quotas et les prix après tests avec des utilisateurs de l’Afrique francophone.
- Préparer les conditions commerciales, la confidentialité, la résiliation et le remboursement.

**Critère de sortie :** catalogue commercial validé explicitement.

### Étape 3 — Choisir le prestataire
- Confirmer l’éligibilité de l’entreprise et du compte marchand.
- Obtenir la liste exacte des pays, opérateurs Mobile Money, devises, frais, délais de règlement et procédures de remboursement.
- Vérifier si le prestataire permet les paiements récurrents automatiques. Sinon, concevoir une facturation mensuelle manuelle avec rappels, sans la présenter comme un prélèvement automatique.
- Tester l’environnement sandbox et le parcours d’assistance.

**Critère de sortie :** prestataire, pays initiaux et moyens de paiement approuvés.

### Étape 4 — Implémenter en environnement de test
- Ajouter le serveur de création de paiement et le webhook signé.
- Ajouter l’historique des transactions et l’état de paiement.
- Appliquer les quotas et les droits côté serveur.
- Tester paiement réussi, paiement annulé, échec, délai expiré, webhook dupliqué, webhook invalide, mauvais montant/devise, double clic, remboursement et abonnement expiré.
- Vérifier qu’un utilisateur ne peut ni s’accorder un plan Pro ni modifier un statut de paiement via l’API Supabase.

**Critère de sortie :** tests réussis et revue de sécurité.

### Étape 5 — Pilote fermé
- Tester avec un petit groupe volontaire, d’abord sur un seul pays et une devise.
- Garder le plan Free disponible et ne facturer que les offres validées.
- Suivre les échecs, le temps de confirmation, le coût des frais et les demandes d’assistance.
- Prévoir un mécanisme manuel sécurisé de réconciliation et de support.

**Critère de sortie :** validation explicite avant toute ouverture publique.

### Étape 6 — Lancement public progressif
- Activer les paiements seulement après approbation explicite du propriétaire du projet.
- Ouvrir les pays supplémentaires un par un après tests et confirmation contractuelle.
- Suivre conversion Free vers payant, rétention, taux d’échec de paiement, coûts de service et résiliations.

## 7. Tests d’acceptation obligatoires

- Le plan Free fonctionne sans carte ni Mobile Money.
- Un prix ou un montant modifié dans le navigateur n’affecte jamais le montant facturé.
- Une capture d’écran ou une redirection de succès ne peut pas activer un abonnement.
- Seul un webhook authentifié et vérifié peut confirmer le paiement.
- Un webhook dupliqué ne double pas la période d’abonnement.
- Un utilisateur ne peut consulter ni modifier les paiements d’un autre utilisateur.
- Les forfaits inactifs ne sont pas vendables.
- Les limites d’usage sont contrôlées côté serveur.
- L’annulation et les conditions de renouvellement sont compréhensibles et testées.
- Les erreurs et journaux ne divulguent ni clés secrètes, ni jetons, ni données de paiement sensibles.
- Aucun paiement réel n’est effectué pendant les tests de sandbox.

## 8. Règle de gouvernance

Ce document prépare la stratégie et les étapes. Il n’autorise ni le déploiement d’un prestataire, ni l’activation des paiements réels, ni la publication des prix. Ces actions nécessitent une validation explicite après audit, tests et revue de sécurité.
