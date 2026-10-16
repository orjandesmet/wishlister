-- Fixes from testing:
-- * Adding an item failed: the app reads the new item's id back, and the read
--   policy (can_view_item) can't see a row inserted by the same statement.
--   List editors may now always read their list's items.
-- * Parents can remove another parent from a child, and delete a child's profile.
-- * Leaving or removing someone from a group goes through remove_from_group, which
--   also removes children left without a parent in that group, and deletes the
--   group once no one with an account is left in it.

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------

drop policy "Read items you can see" on public.items;

create policy "Read items you can see"
  on public.items for select to authenticated
  using (public.can_edit_profile(profile_id) or public.can_view_item(id));

-- ---------------------------------------------------------------------------
-- Children
-- ---------------------------------------------------------------------------

create function public.is_parent_of(child_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profile_managers
    where profile_id = child_profile and manager_profile_id = public.my_profile_id()
  );
$$;

-- A parent removes a parent (another one, or themself) from a child.
-- A child always keeps at least one parent; delete the child's profile instead.
create function public.remove_profile_manager(child_profile uuid, parent_profile uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_parent_of(child_profile) then
    raise exception 'Only a parent of this child can remove a parent';
  end if;
  if (select count(*) from public.profile_managers where profile_id = child_profile) <= 1 then
    raise exception 'A child needs at least one parent';
  end if;
  delete from public.profile_managers
  where profile_id = child_profile and manager_profile_id = parent_profile;
end;
$$;

-- A parent deletes a child's profile, with its list, for everyone.
create function public.delete_child_profile(child_profile uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_parent_of(child_profile) then
    raise exception 'Only a parent of this child can delete their profile';
  end if;
  delete from public.profiles where id = child_profile and account_id is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaving and removing from groups
-- ---------------------------------------------------------------------------

-- Managers remove anyone, you can leave yourself, and parents can take their
-- child out. Children with no parent left in the group are removed with it,
-- and a group with no account holders left is deleted.
-- Returns 'removed' or 'group_deleted'.
create function public.remove_from_group(target_group uuid, target_profile uuid)
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

-- All removals go through remove_from_group so the clean-up always happens.
drop policy "Managers remove members, anyone can leave" on public.group_members;
revoke delete on public.group_members from authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  public.is_parent_of(uuid),
  public.remove_profile_manager(uuid, uuid),
  public.delete_child_profile(uuid),
  public.remove_from_group(uuid, uuid)
from public, anon;

grant execute on function
  public.is_parent_of(uuid),
  public.remove_profile_manager(uuid, uuid),
  public.delete_child_profile(uuid),
  public.remove_from_group(uuid, uuid)
to authenticated;
