-- Groups, wishlist items, purchases and parent-managed child profiles.
--
-- Visibility in one sentence: you see a profile and its items when you share a
-- group with that profile; you see "Someone bought this" on every item you can
-- see except the items on your own list.
--
-- Writes that touch several tables at once (creating a group, inviting someone,
-- adding a child) go through the security-definer functions at the bottom, so
-- the table policies only need to cover simple single-row changes.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Accounts (parents) that may edit a profile without an account (a child).
create table public.profile_managers (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references auth.users (id) on delete cascade,
  primary key (profile_id, account_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  primary key (group_id, profile_id)
);

create index group_members_profile_id_idx on public.group_members (profile_id);

-- People invited by email who haven't signed in yet. They join on first login.
create table public.group_invites (
  group_id uuid not null references public.groups (id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, email)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  url text,
  category text,
  -- When false, the item only shows in the groups listed in item_groups.
  visible_in_all_groups boolean not null default true,
  created_at timestamptz not null default now()
);

create index items_profile_id_idx on public.items (profile_id);

create table public.item_groups (
  item_id uuid not null references public.items (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (item_id, group_id)
);

-- Kept apart from items so the list owner can be denied read access.
create table public.purchases (
  item_id uuid primary key references public.items (id) on delete cascade,
  bought_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bought_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Permission helpers. Security definer so policies can call them without
-- recursing into each other's row-level security.
-- ---------------------------------------------------------------------------

create function public.my_profile_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.profiles where account_id = (select auth.uid());
$$;

-- Groups my own profile belongs to.
create function public.my_group_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select gm.group_id
  from public.group_members gm
  join public.profiles p on p.id = gm.profile_id
  where p.account_id = (select auth.uid());
$$;

create function public.is_group_manager(target_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = target_group
      and gm.role = 'manager'
      and p.account_id = (select auth.uid())
  );
$$;

-- My own profile, or a child's profile I manage.
create function public.can_edit_profile(target_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = target_profile and account_id = (select auth.uid())
  ) or exists (
    select 1 from public.profile_managers
    where profile_id = target_profile and account_id = (select auth.uid())
  );
$$;

create function public.can_view_profile(target_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_edit_profile(target_profile) or exists (
    select 1 from public.group_members
    where profile_id = target_profile
      and group_id in (select public.my_group_ids())
  );
$$;

create function public.can_view_item(target_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    where i.id = target_item
      and (
        public.can_edit_profile(i.profile_id)
        or exists (
          select 1
          from public.group_members gm
          where gm.profile_id = i.profile_id
            and gm.group_id in (select public.my_group_ids())
            and (
              i.visible_in_all_groups
              or exists (
                select 1 from public.item_groups ig
                where ig.item_id = i.id and ig.group_id = gm.group_id
              )
            )
        )
      )
  );
$$;

-- Everyone who can see an item, except the list owner themself.
-- Parents of a child do see purchases on the child's list.
create function public.can_see_purchase(target_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_view_item(target_item) and not exists (
    select 1
    from public.items i
    join public.profiles p on p.id = i.profile_id
    where i.id = target_item and p.account_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profile_managers enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.items enable row level security;
alter table public.item_groups enable row level security;
alter table public.purchases enable row level security;

-- profiles: replace the own-profile-only policies from the first migration.
drop policy "Accounts can read their own profile" on public.profiles;
drop policy "Accounts can rename their own profile" on public.profiles;

create policy "Read profiles you share a group with"
  on public.profiles for select to authenticated
  using (public.can_view_profile(id));

create policy "Rename your own or your child's profile"
  on public.profiles for update to authenticated
  using (public.can_edit_profile(id))
  with check (public.can_edit_profile(id));

-- Only the name can be changed directly; account links are managed by the system.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- profile_managers
create policy "Read the parents of profiles you can see"
  on public.profile_managers for select to authenticated
  using (public.can_view_profile(profile_id));

-- groups
create policy "Read your groups"
  on public.groups for select to authenticated
  using (id in (select public.my_group_ids()));

create policy "Managers rename their group"
  on public.groups for update to authenticated
  using (public.is_group_manager(id))
  with check (public.is_group_manager(id));

create policy "Managers delete their group"
  on public.groups for delete to authenticated
  using (public.is_group_manager(id));

-- group_members
create policy "Read members of your groups"
  on public.group_members for select to authenticated
  using (group_id in (select public.my_group_ids()));

create policy "Managers change member roles"
  on public.group_members for update to authenticated
  using (public.is_group_manager(group_id))
  with check (public.is_group_manager(group_id));

create policy "Managers remove members, anyone can leave"
  on public.group_members for delete to authenticated
  using (public.is_group_manager(group_id) or profile_id = public.my_profile_id());

-- group_invites
create policy "Managers see pending invites"
  on public.group_invites for select to authenticated
  using (public.is_group_manager(group_id));

create policy "Managers cancel invites"
  on public.group_invites for delete to authenticated
  using (public.is_group_manager(group_id));

-- items
create policy "Read items you can see"
  on public.items for select to authenticated
  using (public.can_view_item(id));

create policy "Add items to your own or your child's list"
  on public.items for insert to authenticated
  with check (public.can_edit_profile(profile_id));

create policy "Edit items on your own or your child's list"
  on public.items for update to authenticated
  using (public.can_edit_profile(profile_id))
  with check (public.can_edit_profile(profile_id));

create policy "Delete items from your own or your child's list"
  on public.items for delete to authenticated
  using (public.can_edit_profile(profile_id));

-- item_groups: only the list's editors need to see or change which groups an item is in.
create policy "List editors read item groups"
  on public.item_groups for select to authenticated
  using (exists (
    select 1 from public.items i
    where i.id = item_id and public.can_edit_profile(i.profile_id)
  ));

create policy "List editors choose item groups"
  on public.item_groups for insert to authenticated
  with check (exists (
    select 1
    from public.items i
    join public.group_members gm on gm.profile_id = i.profile_id and gm.group_id = item_groups.group_id
    where i.id = item_id and public.can_edit_profile(i.profile_id)
  ));

create policy "List editors remove item groups"
  on public.item_groups for delete to authenticated
  using (exists (
    select 1 from public.items i
    where i.id = item_id and public.can_edit_profile(i.profile_id)
  ));

-- purchases
create policy "Read purchases on lists that aren't yours"
  on public.purchases for select to authenticated
  using (public.can_see_purchase(item_id));

create policy "Mark items you can see as bought"
  on public.purchases for insert to authenticated
  with check (bought_by = (select auth.uid()) and public.can_see_purchase(item_id));

create policy "Undo your own purchase"
  on public.purchases for delete to authenticated
  using (bought_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Actions that touch several tables
-- ---------------------------------------------------------------------------

-- Create a group with the caller as its first manager.
create function public.create_group(group_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  new_group uuid;
  me uuid := public.my_profile_id();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  insert into public.groups (name) values (group_name) returning id into new_group;
  insert into public.group_members (group_id, profile_id, role) values (new_group, me, 'manager');
  return new_group;
end;
$$;

-- Add someone by email. Existing accounts join right away; anyone else gets a
-- pending invite that turns into a membership on their first login.
-- Returns 'added', 'invited' or 'already_member'.
create function public.invite_to_group(target_group uuid, invitee_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  normalized text := lower(trim(invitee_email));
  invitee_profile uuid;
begin
  if not public.is_group_manager(target_group) then
    raise exception 'Only group managers can invite people';
  end if;
  if normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That does not look like an email address';
  end if;

  select p.id into invitee_profile
  from public.profiles p
  join auth.users u on u.id = p.account_id
  where lower(u.email) = normalized;

  if invitee_profile is null then
    insert into public.group_invites (group_id, email, invited_by)
    values (target_group, normalized, (select auth.uid()))
    on conflict do nothing;
    return 'invited';
  end if;

  insert into public.group_members (group_id, profile_id)
  values (target_group, invitee_profile)
  on conflict do nothing;
  return case when found then 'added' else 'already_member' end;
end;
$$;

-- Add a child (a profile without an account) to a group, managed by the caller.
create function public.add_child_profile(target_group uuid, child_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  child uuid;
begin
  if not public.is_group_manager(target_group) then
    raise exception 'Only group managers can add children';
  end if;
  insert into public.profiles (display_name) values (child_name) returning id into child;
  insert into public.profile_managers (profile_id, account_id) values (child, (select auth.uid()));
  insert into public.group_members (group_id, profile_id) values (target_group, child);
  return child;
end;
$$;

-- Give another member of a shared group (e.g. the other parent) edit rights on a child's list.
create function public.add_profile_manager(child_profile uuid, parent_profile uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  parent_account uuid;
begin
  if not exists (
    select 1 from public.profile_managers
    where profile_id = child_profile and account_id = (select auth.uid())
  ) then
    raise exception 'Only a parent of this child can add another parent';
  end if;

  select p.account_id into parent_account
  from public.profiles p
  where p.id = parent_profile and p.account_id is not null and public.can_view_profile(p.id);

  if parent_account is null then
    raise exception 'That person needs an account in one of your groups';
  end if;

  insert into public.profile_managers (profile_id, account_id)
  values (child_profile, parent_account)
  on conflict do nothing;
end;
$$;

revoke execute on function
  public.create_group(text),
  public.invite_to_group(uuid, text),
  public.add_child_profile(uuid, text),
  public.add_profile_manager(uuid, uuid)
from public, anon;

-- Helpers are for policies; nothing outside needs to call them anonymously.
revoke execute on function
  public.my_profile_id(),
  public.my_group_ids(),
  public.is_group_manager(uuid),
  public.can_edit_profile(uuid),
  public.can_view_profile(uuid),
  public.can_view_item(uuid),
  public.can_see_purchase(uuid)
from public, anon;

grant execute on function
  public.create_group(text),
  public.invite_to_group(uuid, text),
  public.add_child_profile(uuid, text),
  public.add_profile_manager(uuid, uuid),
  public.my_profile_id(),
  public.my_group_ids(),
  public.is_group_manager(uuid),
  public.can_edit_profile(uuid),
  public.can_view_profile(uuid),
  public.can_view_item(uuid),
  public.can_see_purchase(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Turn pending invites into memberships on first login.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_profile uuid;
begin
  insert into public.profiles (display_name, account_id)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    new.id
  )
  returning id into new_profile;

  insert into public.group_members (group_id, profile_id)
  select group_id, new_profile
  from public.group_invites
  where email = lower(new.email);

  delete from public.group_invites where email = lower(new.email);
  return new;
end;
$$;
