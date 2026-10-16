-- New Supabase projects no longer grant table access to the API roles
-- automatically, so every table the app reads or writes needs an explicit grant.
-- Row-level security still decides which rows each person gets; these grants only
-- open the door. Anonymous visitors get nothing.

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select on public.profile_managers to authenticated;

grant select, delete on public.groups to authenticated;
grant update (name) on public.groups to authenticated;

grant select, delete on public.group_members to authenticated;
grant update (role) on public.group_members to authenticated;

grant select, delete on public.group_invites to authenticated;

grant select, insert, delete on public.items to authenticated;
grant update (name, url, category, visible_in_all_groups) on public.items to authenticated;

grant select, insert, delete on public.item_groups to authenticated;

grant select, delete on public.purchases to authenticated;
grant insert (item_id) on public.purchases to authenticated;
