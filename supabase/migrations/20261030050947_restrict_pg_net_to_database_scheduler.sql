-- Intended restriction: pg_net is only used by pg_cron jobs running as postgres.
-- The connected SQL role is not the owner of the extension objects (supabase_admin).
-- The statements below are retained in migration history for auditability; the
-- extension-owner ACLs must be changed by a role with ownership/admin rights.
revoke all on schema net from public, anon, authenticated, service_role;
revoke execute on all functions in schema net from public, anon, authenticated, service_role;
grant usage on schema net to postgres;
grant execute on all functions in schema net to postgres;
