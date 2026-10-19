-- Guardians: a parent can be in a group only to look after their children there,
-- for example a grandparents' group where only the grandchildren should appear.
--
-- A guardian is a group member with role 'guardian'. They see the group and its
-- lists like any member, and manage their children's lists as usual, but their
-- own list isn't shown in that group. Members can switch themselves between
-- 'member' and 'guardian'; managers can set anyone's role.

alter table public.group_members
  drop constraint group_members_role_check,
  add constraint group_members_role_check check (role in ('manager', 'member', 'guardian'));

-- Items show in the groups where their owner is a member or manager, not a guardian.
create or replace function public.can_view_item(target_item uuid)
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
            and gm.role <> 'guardian'
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

-- An item can only be limited to groups where its list is shown.
drop policy "List editors choose item groups" on public.item_groups;

create policy "List editors choose item groups"
  on public.item_groups for insert to authenticated
  with check (exists (
    select 1
    from public.items i
    join public.group_members gm on gm.profile_id = i.profile_id and gm.group_id = item_groups.group_id
    where i.id = item_id and gm.role <> 'guardian' and public.can_edit_profile(i.profile_id)
  ));

create policy "Members switch themselves between member and guardian"
  on public.group_members for update to authenticated
  using (profile_id = public.my_profile_id() and role in ('member', 'guardian'))
  with check (profile_id = public.my_profile_id() and role in ('member', 'guardian'));
