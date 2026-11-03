-- Cleaning up bought items after an occasion (#7).
--
-- From the day after an occasion, a list's editors (the owner, or the managing
-- parents of a child) see one dialog: "These items were bought for a past
-- occasion and will be removed", listing every item bought for any occasion that
-- has passed, each with a checkbox, all checked, and only an OK button.
--
-- * Checked items are deleted for good, with their purchase, pictures and
--   questions. Nobody is told: no "removed" line in the digest, no email to the
--   buyer.
-- * Unchecked items stay; only their bought mark goes, so they can be bought again.
--
-- No spoilers: before the occasion has passed, editors see nothing, same as before.
--
-- Backwards compatible: only new functions.

-- The day an occasion has to be before to count as passed. The app passes its own
-- "today", because the database's current_date is in UTC, but never more than a
-- day ahead: no peeking at future occasions.
create function public.cleanup_day(on_date date)
returns date
language sql stable set search_path = ''
as $$
  select least(on_date, current_date + 1);
$$;

-- Items on this list bought for an occasion that has passed. Only for the list's
-- editors; empty for anyone else.
create function public.pending_cleanup(target_profile uuid, on_date date default current_date)
returns table (item_id uuid, item_name text, occasion_name text, occasion_date date)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.name, o.name, o.date
  from public.items i
  join public.purchases pu on pu.item_id = i.id
  join public.occasions o on o.id = pu.occasion_id
  where public.can_edit_profile(target_profile)
    and i.profile_id = target_profile
    and i.removed_at is null
    and o.date < public.cleanup_day(on_date)
  order by o.date, i.created_at;
$$;

-- The dialog's OK: every item bought for a passed occasion loses its purchase, and
-- the ones in `remove_ids` are deleted too. Items the editors had already removed
-- (kept only for their buyer, see 20261025120000_removed_bought_items.sql) go as
-- well. Returns how many items were deleted.
create function public.clean_up_bought_items(
  target_profile uuid,
  remove_ids uuid[],
  on_date date default current_date
)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  due uuid[];
  gone uuid[];
begin
  if not public.can_edit_profile(target_profile) then
    raise exception 'You can only clean up your own list or your child''s';
  end if;

  select
    coalesce(array_agg(i.id), '{}'),
    coalesce(array_agg(i.id) filter (where i.id = any (remove_ids) or i.removed_at is not null), '{}')
  into due, gone
  from public.items i
  join public.purchases pu on pu.item_id = i.id
  join public.occasions o on o.id = pu.occasion_id
  where i.profile_id = target_profile
    and o.date < public.cleanup_day(on_date);

  -- Purchases first, so deleting a bought item doesn't keep it for its buyer
  -- (keep_bought_item). Items that were already removed go with their purchase
  -- (delete_removed_item).
  delete from public.purchases where item_id = any (due);
  delete from public.items where id = any (gone);
  -- Not a change anyone hears about.
  delete from public.removed_items where item_id = any (gone);

  return cardinality(gone);
end;
$$;

revoke execute on function
  public.cleanup_day(date),
  public.pending_cleanup(uuid, date),
  public.clean_up_bought_items(uuid, uuid[], date)
from public, anon;

grant execute on function
  public.cleanup_day(date),
  public.pending_cleanup(uuid, date),
  public.clean_up_bought_items(uuid, uuid[], date)
to authenticated;
