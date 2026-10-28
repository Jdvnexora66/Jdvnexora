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
- [ ] Direct PostgREST calls and Edge Function calls enforce the same authorization as the UI.
- [ ] Anonymous requests cannot access private projects, assets, or membership rows.
- [ ] Existing project and asset row counts are unchanged after migration.

## Important integration note

This migration establishes the database boundary. The UI and server functions must explicitly write/read `organization_id` and send the selected workspace context where appropriate. Until that integration is completed and tested, organization-scoped project creation is not considered production-ready.

## Rollback note

The migration is additive but replaces RLS policies. A rollback must restore the exact previous policy definitions before dropping the new helper functions or the column. Do not drop `organization_id` if any organization-scoped projects have been created.
