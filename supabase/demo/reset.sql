-- Demo database only: wipes every account and row, then loads seed.sql with a shared
-- password on the seed accounts, so demo visitors can sign in without an email.
-- The Demo workflow runs it in one transaction after applying the migrations:
--   psql "$DEMO_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/demo/reset.sql

set client_min_messages = warning;

-- Safety net against pointing this at the real database: the demo only ever has the
-- seed accounts (sign-ups are off there), so any other account means this is not the demo.
do $$
begin
  if exists (select 1 from auth.users where email not like '%@example.com') then
    raise exception 'This database has real accounts. Not resetting it.';
  end if;
end;
$$;

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('truncate table public.%I restart identity cascade', t.tablename);
  end loop;
end;
$$;

delete from auth.users;

\ir ../seed.sql

-- Same password as demoPassword in src/lib/demo.ts.
update auth.users
set encrypted_password = extensions.crypt('wishlister-demo', extensions.gen_salt('bf'))
where email like '%@example.com';
