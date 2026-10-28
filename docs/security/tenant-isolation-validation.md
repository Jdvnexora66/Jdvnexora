# Tenant isolation validation — JDV NEXORA AI STUDIO

## Scope

Migration: `supabase/migrations/20261028103000_tenant_isolation_studio_projects.sql`

The migration adds nullable `studio_projects.organization_id`. Existing projects remain personal when this value is NULL. It replaces the existing permissive project/asset/member policies with policies that check the parent project and active organization membership.

## Deployment gate

Do not apply this migration to production until it has been applied to a staging Supabase project and the tests below pass. Do not merge if any cross-tenant test succeeds unexpectedly.

## Required staging tests

Prepare two confirmed users (A and B), two organizations (Org A and Org B), and projects/assets for each tenant.

- [ ] Existing personal projects remain visible and editable to their owner.
- [ ] User A cannot select, update, or delete a personal project owned by B.
- [ ] A member of Org A can access only eligible projects in Org A, not Org B.
- [ ] A user removed from an organization loses access to its projects and assets.
- [ ] A viewer cannot create or edit a project or asset.
- [ ] A member cannot change project membership or promote their own role.
- [ ] Only owner/admin can delete an organization project or manage project membership.
- [ ] An asset's owner_id alone does not grant access when its parent project is inaccessible.
- [ ] A client cannot attach a project to an organization where they have no active membership.
- [ ] An ordinary update cannot move a project from one organization to another; any future transfer must use an explicit privileged workflow.
- [ ] Direct PostgREST calls and Edge Function calls enforce the same authorization as the UI.
- [ ] Anonymous requests cannot access private projects, assets, or membership rows.
- [ ] Existing project and asset row counts are unchanged after migration.

## Current implementation status (2026-10-28)

- The front-end workspace integration is merged in PR #69. The selected organization is held in the main app state, project loading is scoped to the selected organization when the column is available, and organization-scoped creation is blocked when the tenant column is missing.
- The security-policy hardening is merged in PR #67.
- **Production database verification confirms that studio_projects.organization_id is still absent and migration 20261028103000 is not recorded.** The application is therefore still running against the legacy project schema. Do not infer that tenant isolation is live from the merged code.
- The GitHub build/CI checks verify compilation and static assertions only. They do not prove cross-tenant RLS behavior.
- The production security advisor currently reports leaked-password protection disabled. Enable it in Supabase Auth settings when an authorized dashboard operator is available; this is a separate Auth setting, not part of the tenant migration.
- The advisor also reports no direct RLS policies on organization_invitations and selected media OAuth tables. These appear intentionally server-only because client grants are revoked; verify their Edge Function/service-role paths remain the only access route before changing those policies.

## Required next steps before B2B activation

1. Apply the tenant migration to a staging database only and run the required real-user tests above. No staging Supabase branch should be created without explicit budget approval.
2. If no staging environment is available at zero additional cost, keep B2B project creation blocked and do not apply the migration to production.
3. Re-run Supabase security advisors after any approved schema change and review the leaked-password protection setting.
4. Confirm the live Netlify production deployment is serving the merged main commit before announcing the feature as available.

## Rollback note

The migration is additive but replaces RLS policies. A rollback must restore the exact previous policy definitions before dropping the new helper functions or the column. Do not drop `organization_id` if any organization-scoped projects have been created.


## Client table-privilege hardening (separate rollout)

Read-only production audit on 2026-10-28 found that `anon` and `authenticated` have `TRUNCATE`, `REFERENCES`, and `TRIGGER` table privileges on multiple public tables, including Studio tables. These privileges are not governed by row-level security in the same way as ordinary row CRUD, so they are unnecessary for browser clients and should be removed.

Migration: `supabase/migrations/20261028161000_revoke_dangerous_client_table_privileges.sql`.

- [ ] Apply this independent migration to a zero-cost staging/local database first.
- [ ] Run `supabase/tests/client_table_privileges.test.sql` and confirm both assertions pass.
- [ ] Confirm the app's normal authenticated CRUD flows still work under the existing RLS policies.
- [ ] Verify that no client-facing feature intentionally depends on table-level TRUNCATE, TRIGGER, or REFERENCES privileges.
- [ ] Apply to production only through the approved migration process after validation; this migration has **not** been applied to production.

The migration intentionally leaves SELECT/INSERT/UPDATE/DELETE grants and their RLS policy behavior unchanged. It also updates default privileges for future tables created by the migration owner in `public`.
