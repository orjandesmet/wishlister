-- A group always keeps a manager while people with an account are in it:
-- the last manager has to make someone else a manager before leaving.

create or replace function public.remove_from_group(target_group uuid, target_profile uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if not (
    public.is_group_manager(target_group)
    or target_profile = public.my_profile_id()
    or public.is_parent_of(target_profile)
  ) then
    raise exception 'You can''t remove this person from the group';
  end if;

  -- The last manager may only go when no one else with an account stays behind.
  if exists (
    select 1 from public.group_members
    where group_id = target_group and profile_id = target_profile and role = 'manager'
  ) and not exists (
    select 1 from public.group_members
    where group_id = target_group and profile_id <> target_profile and role = 'manager'
  ) and exists (
    select 1
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = target_group and gm.profile_id <> target_profile and p.account_id is not null
  ) then
    raise exception 'Make someone else a manager first';
  end if;

  delete from public.group_members
  where group_id = target_group and profile_id = target_profile;

  -- Children in the group none of whose parents are still in it.
  delete from public.group_members gm
  using public.profiles child
  where gm.group_id = target_group
    and child.id = gm.profile_id
    and child.account_id is null
    and not exists (
      select 1
      from public.profile_managers pm
      join public.group_members parent_gm
        on parent_gm.profile_id = pm.manager_profile_id and parent_gm.group_id = target_group
      where pm.profile_id = child.id
    );

  if not exists (
    select 1
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = target_group and p.account_id is not null
  ) then
    delete from public.groups where id = target_group;
    return 'group_deleted';
  end if;
  return 'removed';
end;
$$;

-- Managers can't demote the last manager either.
create function public.keep_a_manager()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'manager' and new.role <> 'manager' and not exists (
    select 1 from public.group_members
    where group_id = old.group_id and profile_id <> old.profile_id and role = 'manager'
  ) then
    raise exception 'A group needs at least one manager';
  end if;
  return new;
end;
$$;

create trigger keep_a_manager
  before update of role on public.group_members
  for each row execute function public.keep_a_manager();
