-- Remove client privileges that bypass row-level policies or enable schema-level actions.
-- Ordinary application CRUD remains governed by the existing RLS policies.
begin;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Keep future tables created by the migration owner from inheriting these privileges.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

commit;
