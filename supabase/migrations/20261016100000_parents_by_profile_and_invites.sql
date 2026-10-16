-- Review follow-ups on groups and children:
-- * profile_managers points at the parent's profile instead of their auth account.
-- * A group manager who isn't the parent can add a child and pick who the parent is.
-- * A parent can add their existing child to another group (no duplicate child profiles).
-- * Inviting an email that's already waiting reports 'already_invited'.

-- ---------------------------------------------------------------------------
-- profile_managers: parent account → parent profile
-- ---------------------------------------------------------------------------

alter table public.profile_managers
  add column manager_profile_id uuid
  constraint profile_managers_manager_profile_id_fkey
  references public.profiles (id) on delete cascade;

update public.profile_managers pm
set manager_profile_id = p.id
from public.profiles p
where p.account_id = pm.account_id;

alter table public.profile_managers
  drop constraint profile_managers_pkey,
  drop column account_id,
  alter column manager_profile_id set not null,
  add primary key (profile_id, manager_profile_id),
  -- Only children are managed, and only by someone who signs in.
  add constraint profile_managers_not_self check (profile_id <> manager_profile_id);

create index profile_managers_manager_profile_id_idx
  on public.profile_managers (manager_profile_id);

create or replace function public.can_edit_profile(target_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = target_profile and account_id = (select auth.uid())
  ) or exists (
    select 1 from public.profile_managers
    where profile_id = target_profile and manager_profile_id = public.my_profile_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- Children
-- ---------------------------------------------------------------------------

-- Is this profile an account holder in the group? Parents must be.
create function public.is_account_member(target_group uuid, target_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = target_group and gm.profile_id = target_profile and p.account_id is not null
  );
$$;

drop function public.add_child_profile(uuid, text);

-- A group manager adds a new child to the group. The parent is the manager
-- themself unless they name another member of the group.
create function public.add_child_profile(
  target_group uuid,
  child_name text,
  parent_profile uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  parent uuid := coalesce(parent_profile, public.my_profile_id());
  child uuid;
begin
  if not public.is_group_manager(target_group) then
    raise exception 'Only group managers can add children';
  end if;
  if not public.is_account_member(target_group, parent) then
    raise exception 'The parent needs to be a member of this group';
  end if;
  insert into public.profiles (display_name) values (child_name) returning id into child;
  insert into public.profile_managers (profile_id, manager_profile_id) values (child, parent);
  insert into public.group_members (group_id, profile_id) values (target_group, child);
  return child;
end;
$$;

-- A parent adds their existing child to another group they belong to.
create function public.add_child_to_group(target_group uuid, child_profile uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profile_managers
    where profile_id = child_profile and manager_profile_id = public.my_profile_id()
  ) then
    raise exception 'Only a parent of this child can add them to a group';
  end if;
  if not public.is_account_member(target_group, public.my_profile_id()) then
    raise exception 'You need to be in the group yourself';
  end if;
  insert into public.group_members (group_id, profile_id)
  values (target_group, child_profile)
  on conflict do nothing;
end;
$$;

-- Give another member of a shared group (e.g. the other parent) edit rights on a child's list.
create or replace function public.add_profile_manager(child_profile uuid, parent_profile uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profile_managers
    where profile_id = child_profile and manager_profile_id = public.my_profile_id()
  ) then
    raise exception 'Only a parent of this child can add another parent';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = parent_profile and p.account_id is not null and public.can_view_profile(p.id)
  ) then
    raise exception 'That person needs an account in one of your groups';
  end if;

  insert into public.profile_managers (profile_id, manager_profile_id)
  values (child_profile, parent_profile)
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invites: report an invite that's already waiting.
-- Returns 'added', 'invited', 'already_invited' or 'already_member'.
-- ---------------------------------------------------------------------------

create or replace function public.invite_to_group(target_group uuid, invitee_email text)
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
    return case when found then 'invited' else 'already_invited' end;
  end if;

  insert into public.group_members (group_id, profile_id)
  values (target_group, invitee_profile)
  on conflict do nothing;
  return case when found then 'added' else 'already_member' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  public.is_account_member(uuid, uuid),
  public.add_child_profile(uuid, text, uuid),
  public.add_child_to_group(uuid, uuid)
from public, anon;

grant execute on function
  public.is_account_member(uuid, uuid),
  public.add_child_profile(uuid, text, uuid),
  public.add_child_to_group(uuid, uuid)
to authenticated;
