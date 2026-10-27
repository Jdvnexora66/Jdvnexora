begin;
select plan(12);

select has_table('public', 'organizations', 'B2B organizations table exists');
select has_table('public', 'organization_members', 'B2B membership table exists');
select has_table('public', 'organization_invitations', 'B2B invitations table exists');

select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organizations'), 'organizations has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organization_members'), 'organization_members has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organization_invitations'), 'organization_invitations has RLS enabled');

select ok(not has_table_privilege('anon', 'public.organization_invitations', 'SELECT'), 'anon cannot read invitation rows');
select ok(not has_table_privilege('authenticated', 'public.organization_invitations', 'SELECT'), 'authenticated clients cannot read invitation rows');

select ok(not has_function_privilege('anon', 'public.create_organization_invitation(uuid,uuid,text,text,text)', 'EXECUTE'), 'anon cannot execute invitation creation RPC');
select ok(not has_function_privilege('authenticated', 'public.create_organization_invitation(uuid,uuid,text,text,text)', 'EXECUTE'), 'authenticated cannot execute invitation creation RPC');
select ok(not has_function_privilege('authenticated', 'public.accept_organization_invitation(uuid,text)', 'EXECUTE'), 'authenticated cannot execute invitation acceptance RPC');
select ok(has_function_privilege('service_role', 'public.accept_organization_invitation(uuid,text)', 'EXECUTE'), 'service_role can execute invitation acceptance RPC');

select * from finish();
rollback;
