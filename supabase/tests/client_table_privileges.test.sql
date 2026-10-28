begin;
select plan(2);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
        has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'TRUNCATE')
        or has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'TRUNCATE')
      )
  ),
  'anon and authenticated cannot TRUNCATE public tables'
);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
        has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'REFERENCES')
        or has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'REFERENCES')
        or has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'TRIGGER')
        or has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'TRIGGER')
      )
  ),
  'anon and authenticated cannot create triggers or foreign-key references on public tables'
);

select * from finish();
rollback;
