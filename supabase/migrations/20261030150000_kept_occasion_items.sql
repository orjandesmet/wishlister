-- After Keep on the cleanup question (#7, 20261030120000_occasion_cleanup.sql):
-- the occasion has passed, so the list's editors now see which items were bought
-- for it, and handle them one at a time: Remove (archived, like the cleanup does)
-- or "I want another" (the bought mark goes, so it can be bought again).
--
-- Backwards compatible: only new functions.

-- Items on this list bought for an occasion its editors chose Keep for. Only for
-- the list's editors; empty for anyone else.
create function public.kept_occasion_items(target_profile uuid)
returns table (item_id uuid, occasion_name text, occasion_date date)
language sql stable security definer set search_path = ''
as $$
  select i.id, o.name, o.date
  from public.items i
  join public.purchases pu on pu.item_id = i.id
  join public.occasions o on o.id = pu.occasion_id
  join public.kept_after_occasions k on k.profile_id = i.profile_id and k.occasion_id = o.id
  where public.can_edit_profile(target_profile)
    and i.profile_id = target_profile
    and i.archived_at is null
    and i.removed_at is null;
$$;

-- The kept item this editor may handle, or null.
create function public.kept_occasion_item(target_item uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select i.id
  from public.items i
  join public.purchases pu on pu.item_id = i.id
  join public.kept_after_occasions k on k.profile_id = i.profile_id and k.occasion_id = pu.occasion_id
  where i.id = target_item
    and i.archived_at is null
    and i.removed_at is null
    and public.can_edit_profile(i.profile_id);
$$;

-- Remove: archived, like the cleanup does. Returns the moment, for undo_clean_up().
create function public.archive_kept_item(target_item uuid)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  stamp timestamptz := now();
begin
  if public.kept_occasion_item(target_item) is null then
    raise exception 'This item wasn''t bought for an occasion you kept';
  end if;
  update public.items set archived_at = stamp where id = target_item;
  return stamp;
end;
$$;

-- "I want another": the bought mark goes, so it can be bought again. Put aside
-- like the cleanup does, so undo_clean_up() can bring it back.
create function public.want_another(target_item uuid)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  stamp timestamptz := now();
begin
  if public.kept_occasion_item(target_item) is null then
    raise exception 'This item wasn''t bought for an occasion you kept';
  end if;

  insert into public.cleared_purchases (item_id, bought_by, occasion_id, bought_at, cleared_at)
  select pu.item_id, pu.bought_by, pu.occasion_id, pu.bought_at, stamp
  from public.purchases pu
  where pu.item_id = target_item
  on conflict (item_id) do update set
    bought_by = excluded.bought_by,
    occasion_id = excluded.occasion_id,
    bought_at = excluded.bought_at,
    cleared_at = excluded.cleared_at;

  delete from public.purchases where item_id = target_item;
  return stamp;
end;
$$;

revoke execute on function
  public.kept_occasion_items(uuid),
  public.kept_occasion_item(uuid),
  public.archive_kept_item(uuid),
  public.want_another(uuid)
from public, anon;

grant execute on function
  public.kept_occasion_items(uuid),
  public.archive_kept_item(uuid),
  public.want_another(uuid)
to authenticated;
