# Reconstruction professionnelle de NEXORA STUDIO AI — plan de livraison

## Règles de travail
- Travailler exclusivement sur la branche `feature/premium-interface-12-parts` jusqu'à revue explicite.
- Ne jamais exposer de secrets ni désactiver les politiques RLS pour contourner un problème.
- Ne pas activer de paiement réel et ne pas publier/merger sur `main` sans validation explicite.
- Pour chaque page : interface responsive, accessibilité de base, états chargement/vide/erreur/succès/accès refusé, permissions côté serveur, tests de parcours et vérification de build.
- Ne jamais présenter comme disponible une fonction qui n'est pas reliée et vérifiée.

## Ordre de réalisation

### Phase 0 — Audit de base
- [x] Identifier les composants déjà présents : application principale, `BillingPanel`, `AdminPanel`, `ProfessionalPages`, `OfficialLandingPage`.
- [x] Identifier le parcours de présentation `/presentation` et les rubriques intégrées du tableau de bord.
- [ ] Exécuter `npm run build` et corriger les erreurs confirmées.
- [ ] Cartographier toutes les routes, tables Supabase, politiques RLS et fonctions Edge avant toute migration.

### Phase 1 — Site public (à terminer avant les abonnements)
- [ ] 1. Accueil public `/` : proposition de valeur, CTA et navigation.
- [ ] 2. Fonctionnalités `/features` : modules réellement disponibles et statuts transparents.
- [ ] 3. Tarifs `/pricing` : seulement après validation commerciale; aucun prix hypothétique présenté comme définitif.
- [ ] 4. À propos `/about` : mission et identité vérifiées.
- [ ] 5. Contact `/contact` : coordonnées vérifiées ou formulaire réellement fonctionnel.
- [ ] 6. FAQ `/faq` : réponses conformes au comportement réel.
- [ ] Vérifier la navigation mobile, les liens, les métadonnées et les états d'erreur.

### Phase 2 — Authentification et récupération
- [ ] 7. Inscription `/signup`.
- [ ] 8. Connexion `/login`.
- [ ] 9. Demande de récupération `/forgot-password`.
- [ ] 10. Vérification d'adresse e-mail et renvoi du message.
- [ ] 11. Réinitialisation `/reset-password`, expiration et erreurs de jeton.
- [ ] Vérifier les redirections, les sessions et la non-divulgation de l'existence d'un compte.

### Phase 3 — Application et modules
- [ ] 12. Tableau de bord avec données réelles et état vide guidé.
- [ ] 13. Chaque module métier : accès, données, création et navigation.
- [ ] 14. Vues création/détail/modification/suppression avec confirmation.
- [ ] 15. Notifications réellement persistées si elles sont présentées comme telles.
- [ ] 16. Rapports et exports si pris en charge.
- [ ] Uniformiser les états chargement, vide, erreur, hors ligne, succès, quotas et accès refusé.

### Phase 4 — Compte et paramètres
- [ ] 17. Profil.
- [ ] 18. Sécurité du compte.
- [ ] 19. Préférences et notifications.
- [ ] 20. Langue et région.
- [ ] 21. Sessions et appareils, si supportés par l'authentification retenue.
- [ ] 22. Intégrations, uniquement pour les fournisseurs réellement connectés.
- [ ] 23. Suppression du compte, avec confirmation et traitement des données associées.
- [ ] 24. Export des données, si requis et correctement implémenté.

### Phase 5 — Aide et confiance
- [ ] Centre d'aide, FAQ et support.
- [ ] Suivi des tickets et traitement côté opérateur.
- [ ] Page de statut et journal des changements uniquement s'ils sont alimentés par des informations réelles.
- [ ] Documents juridiques adaptés à l'éditeur, aux pays ciblés et aux traitements réellement effectués.

### Phase 6 — Administration et sécurité
- [ ] 31. Tableau de bord administrateur.
- [ ] 32. Utilisateurs, rôles et organisations.
- [ ] 33. Outils de gestion commerciale, sans action de paiement non autorisée.
- [ ] 34. Journaux d'audit pour les actions sensibles.
- [ ] 35. Paramètres globaux et secrets côté serveur seulement.
- [ ] 36. Support et incidents.
- [ ] Tester RLS, privilèges, contrôle d'accès serveur et séparation des données entre utilisateurs/organisations.

### Phase 7 — Abonnements (après validation des phases précédentes)
- [ ] Définir les forfaits, limites, conditions et taxes applicables.
- [ ] Auditer tables, grants, RLS, triggers et fonctions Edge.
- [ ] Choisir et configurer un prestataire adapté aux marchés visés.
- [ ] Implémenter le paiement avec vérification serveur/webhooks idempotents.
- [ ] Historique de facturation, échecs, renouvellement, résiliation et remboursement selon le prestataire.
- [ ] Tester en environnement sandbox avant toute activation réelle.

## État actuel confirmé par inspection du code
- `src/App.tsx` importe les composants `BillingPanel`, `AdminPanel`, `ProfessionalPages` et `OfficialLandingPage`.
- `/presentation` est une route détectée dans `src/App.tsx`.
- `ProfessionalPages` contient des rubriques intégrées pour catalogue IA, notifications, compte/sécurité, aide/support, présentation publique, mentions légales et états système.
- L'interface de facturation est présente, mais le cycle de paiement complet n'est pas confirmé.
- Les rubriques juridiques indiquent elles-mêmes que leur contenu reste à compléter/valider.
- Aucun build complet ni test navigateur n'est attesté par ce document.

## Journal de validation
Ajouter pour chaque lot : commit, commandes exécutées, résultats des tests, éléments non vérifiés et décision de poursuivre.
