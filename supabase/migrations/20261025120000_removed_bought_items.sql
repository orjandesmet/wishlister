-- Removing an item someone already bought (#89).
--
-- The list owner can't see purchases, so they can remove a wish that is already
-- bought. Until now that deleted the purchase with it, and the buyer only heard
-- about it, maybe, as a plain "removed" line in the daily digest.
--
-- Now, when the item has a purchase:
-- * it isn't deleted but hidden from the list's editors (removed_at is set), so
--   to them it looks deleted, and they still don't learn it was bought;
-- * everyone else still sees it as bought, marked as removed, so nobody buys it
--   again;
-- * the buyer gets an email straight away (netlify/functions/notify-removed.mts),
--   in case they can still cancel their order;
-- * when the buyer undoes "I bought this", the item is deleted for real.
--
-- Removing something you bought yourself (a parent on their child's list)
-- deletes it straight away, as before.
--
-- Backwards compatible: the deployed app keeps working, it just doesn't show the
-- "removed" note, and the digest keeps its columns.

alter table public.items
  add column removed_at timestamptz,
  -- When the buyer's email went out (or is going out): see claim_removal_notices().
  add column removal_mailed_at timestamptz;

-- No grants: only the triggers below set these. Inserts are granted on the whole
-- table (see 20261016120000_table_grants.sql), so the insert policy checks it.

-- ---------------------------------------------------------------------------
-- Editors don't see removed items; the others do
-- ---------------------------------------------------------------------------

drop policy "Read items you can see" on public.items;
drop policy "Add items to your own or your child's list" on public.items;
drop policy "Edit items on your own or your child's list" on public.items;
drop policy "Delete items from your own or your child's list" on public.items;

create policy "Read items you can see"
  on public.items for select to authenticated
  using (
    case when public.can_edit_profile(profile_id)
      then removed_at is null
      else public.can_view_item(id)
    end
  );

create policy "Add items to your own or your child's list"
  on public.items for insert to authenticated
  with check (public.can_edit_profile(profile_id) and removed_at is null);

create policy "Edit items on your own or your child's list"
  on public.items for update to authenticated
  using (public.can_edit_profile(profile_id) and removed_at is null)
  with check (public.can_edit_profile(profile_id));

create policy "Delete items from your own or your child's list"
  on public.items for delete to authenticated
  using (public.can_edit_profile(profile_id) and removed_at is null);

-- ---------------------------------------------------------------------------
-- Keep bought items when they're removed
-- ---------------------------------------------------------------------------

-- Runs after remember_removed_item (triggers of the same kind run in name order),
-- so the digest still says "removed". Returning null skips the delete.
create function public.keep_bought_item()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- The whole list is going (a child's profile was deleted): delete everything.
  if not exists (select 1 from public.profiles where id = old.profile_id) then
    return old;
  end if;
  if exists (
    select 1 from public.purchases
    where item_id = old.id
      and bought_by is distinct from public.my_profile_id()
  ) then
    update public.items set removed_at = now() where id = old.id and removed_at is null;
    return null;
  end if;
  return old;
end;
$$;

create trigger soft_remove_bought_item
  before delete on public.items
  for each row execute function public.keep_bought_item();

-- The buyer undid their purchase, or their account went: nothing keeps a removed
-- item any more.
create function public.delete_removed_item()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.items where id = old.item_id and removed_at is not null;
  return old;
end;
$$;

create trigger delete_removed_item
  after delete on public.purchases
  for each row execute function public.delete_removed_item();

-- ---------------------------------------------------------------------------
-- The digest: the buyer gets their own email instead of a "removed" line
-- ---------------------------------------------------------------------------

alter table public.removed_items add column bought_by uuid;

-- Same as in 20261021180000_not_wanted_items.sql, plus the buyer. An item that
-- was already reported when it was hidden isn't reported again when it really goes.
create or replace function public.remember_removed_item()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- The whole list is going (a child's profile was deleted): nobody to tell.
  if not exists (select 1 from public.profiles where id = old.profile_id) then
    return old;
  end if;
  if old.removed_at is not null then
    return old;
  end if;
  insert into public.removed_items
    (item_id, list_id, name, visible_in_all_groups, group_ids, item_created_at, not_wanted,
     bought_by)
  values (
    old.id,
    old.profile_id,
    old.name,
    old.visible_in_all_groups,
    array(select ig.group_id from public.item_groups ig where ig.item_id = old.id),
    old.created_at,
    old.not_wanted,
    (select pu.bought_by from public.purchases pu where pu.item_id = old.id)
  )
  on conflict (item_id) do nothing;
  return old;
end;
$$;

-- Same as in 20261021180000_not_wanted_items.sql, except:
-- * a removed item that is kept for its buyer isn't "added";
-- * the buyer of a removed item doesn't get the "removed" line (they get an email
--   of its own).
create or replace function public.pending_digest(upto timestamptz)
returns table (
  follower_id uuid,
  email text,
  locale text,
  list_id uuid,
  list_name text,
  unfollow_token uuid,
  change text,
  item_name text,
  not_wanted boolean
)
language sql stable security definer set search_path = ''
as $$
  with window_ as (
    select sent_up_to as since from public.digest_state
  ),
  follows as (
    select
      f.follower_id,
      f.list_id,
      f.unfollow_token,
      u.email,
      coalesce(u.raw_user_meta_data ->> 'locale', 'en') as locale,
      p.display_name as list_name,
      exists (
        select 1 from public.profile_managers pm
        where pm.profile_id = f.list_id and pm.manager_profile_id = f.follower_id
      ) as is_editor
    from public.list_follows f
    cross join window_ w
    join public.profiles fp on fp.id = f.follower_id
    join auth.users u on u.id = fp.account_id
    join public.profiles p on p.id = f.list_id
    -- Still following on the day the window starts: changes on the last day count.
    where f.until >= (w.since at time zone 'UTC')::date
      and u.email is not null
  ),
  changes as (
    select
      i.profile_id as list_id,
      'added' as change,
      i.name as item_name,
      i.visible_in_all_groups as all_groups,
      array(select ig.group_id from public.item_groups ig where ig.item_id = i.id) as group_ids,
      null::uuid as buyer,
      i.created_at as at,
      i.not_wanted
    from public.items i, window_ w
    where i.created_at > w.since and i.created_at <= upto
      and i.removed_at is null
    union all
    select
      r.list_id, 'removed', r.name, r.visible_in_all_groups, r.group_ids, r.bought_by,
      r.removed_at, r.not_wanted
    from public.removed_items r, window_ w
    where r.removed_at > w.since and r.removed_at <= upto
      and r.item_created_at <= w.since
    union all
    select
      i.profile_id,
      'bought',
      i.name,
      i.visible_in_all_groups,
      array(select ig.group_id from public.item_groups ig where ig.item_id = i.id),
      pu.bought_by,
      pu.bought_at,
      i.not_wanted
    from public.purchases pu
    join public.items i on i.id = pu.item_id
    cross join window_ w
    where pu.bought_at > w.since and pu.bought_at <= upto
  )
  select
    f.follower_id,
    f.email,
    f.locale,
    f.list_id,
    f.list_name,
    f.unfollow_token,
    c.change,
    c.item_name,
    c.not_wanted
  from follows f
  join changes c on c.list_id = f.list_id
  where (
      (c.change = 'bought' and c.buyer <> f.follower_id)
      or (
        c.change <> 'bought'
        and not f.is_editor
        and c.buyer is distinct from f.follower_id
      )
    )
    and public.profile_sees_item(f.follower_id, f.list_id, c.all_groups, c.group_ids)
  order by f.follower_id, f.list_name, f.list_id, c.change, c.at;
$$;

-- ---------------------------------------------------------------------------
-- The buyer's email
-- ---------------------------------------------------------------------------

-- Removed items whose buyer hasn't been mailed yet, marked as mailed, so two
-- calls at the same time don't both send. Hand them back with
-- release_removal_notices() when sending fails.
create function public.claim_removal_notices()
returns table (
  item_id uuid,
  item_name text,
  list_id uuid,
  list_name text,
  occasion_name text,
  email text,
  locale text
)
language sql security definer set search_path = ''
as $$
  with claimed as (
    update public.items i
    set removal_mailed_at = now()
    where i.removed_at is not null and i.removal_mailed_at is null
    returning i.id, i.name, i.profile_id
  )
  select
    c.id,
    c.name,
    c.profile_id,
    lp.display_name,
    o.name,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'locale', 'en')
  from claimed c
  join public.profiles lp on lp.id = c.profile_id
  join public.purchases pu on pu.item_id = c.id
  left join public.occasions o on o.id = pu.occasion_id
  join public.profiles bp on bp.id = pu.bought_by
  join auth.users u on u.id = bp.account_id
  where u.email is not null;
$$;

create function public.release_removal_notices(item_ids uuid[])
returns void
language sql security definer set search_path = ''
as $$
  update public.items set removal_mailed_at = null where id = any (item_ids);
$$;

revoke execute on function
  public.keep_bought_item(),
  public.delete_removed_item(),
  public.remember_removed_item(),
  public.pending_digest(timestamptz),
  public.claim_removal_notices(),
  public.release_removal_notices(uuid[])
from public, anon, authenticated;

grant execute on function
  public.pending_digest(timestamptz),
  public.claim_removal_notices(),
  public.release_removal_notices(uuid[])
to service_role;
