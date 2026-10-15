-- A profile is a person who has a wishlist. Every account gets one on sign-up;
-- children get a profile without an account (added with groups in the next migration).
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) > 0),
  account_id uuid unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Accounts can read their own profile"
  on public.profiles for select
  to authenticated
  using (account_id = (select auth.uid()));

create policy "Accounts can rename their own profile"
  on public.profiles for update
  to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

-- Create the profile when someone signs in for the first time.
-- The display name defaults to the part of the email before the @.
create function public.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (display_name, account_id)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    new.id
  );
  return new;
end;
$$;

create trigger on_auth_account_created
  after insert on auth.users
  for each row execute function public.handle_new_account();

-- Called once a day by netlify/functions/keepalive.mts so the free project never pauses.
create function public.keepalive()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
