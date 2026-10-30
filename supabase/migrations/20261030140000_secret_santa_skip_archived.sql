-- The Secret Santa nudge (#138, 20261030130000_secret_santa_nudge_and_reminder.sql)
-- counts the items a giver could buy. Items archived after an occasion (#7,
-- 20261030120000_occasion_cleanup.sql) are gone for everyone, so they don't count.
--
-- Backwards compatible: same signature, it only counts fewer items.

create or replace function public.secret_santa_buyable_items(target_group uuid, target_profile uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
  from public.items i
  where i.profile_id = target_profile
    and i.removed_at is null
    and i.archived_at is null
    and not i.not_wanted
    and not exists (select 1 from public.purchases pu where pu.item_id = i.id)
    and (
      i.visible_in_all_groups
      or exists (
        select 1 from public.item_groups ig
        where ig.item_id = i.id and ig.group_id = target_group
      )
    );
$$;

-- create or replace keeps the existing grants; repeated here so they're explicit.
revoke execute on function public.secret_santa_buyable_items(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.secret_santa_buyable_items(uuid, uuid) to service_role;
