-- Things I don't want (#55): "please don't buy" entries on a wish list.
--
-- They are items with not_wanted = true, so they're shown to the same groups,
-- edited, bulk edited and removed like any other item. Nobody can buy them.
--
-- Backwards compatible: existing items stay wishes, and the digest keeps its
-- columns (it only gains a last one), so the deployed app works before and after.

alter table public.items add column not_wanted boolean not null default false;

grant update (not_wanted) on public.items to authenticated;

-- ---------------------------------------------------------------------------
-- No "I bought this"
-- ---------------------------------------------------------------------------

create function public.refuse_not_wanted_purchase()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.items where id = new.item_id and not_wanted) then
    raise exception 'This item is on the "please don''t buy" list'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger refuse_not_wanted_purchase
  before insert on public.purchases
  for each row execute function public.refuse_not_wanted_purchase();

-- A wish that becomes a "please don't buy" loses its purchase: nobody should see
-- "Someone bought this" on something the owner doesn't want.
create function public.forget_not_wanted_purchase()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.purchases where item_id = new.id;
  return new;
end;
$$;

create trigger forget_not_wanted_purchase
  after update of not_wanted on public.items
  for each row when (new.not_wanted and not old.not_wanted)
  execute function public.forget_not_wanted_purchase();

revoke execute on function
  public.refuse_not_wanted_purchase(),
  public.forget_not_wanted_purchase()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The daily digest says when an added or removed item is a "please don't buy"
-- ---------------------------------------------------------------------------

alter table public.removed_items add column not_wanted boolean not null default false;

create or replace function public.remember_removed_item()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- The whole list is going (a child's profile was deleted): nobody to tell.
  if not exists (select 1 from public.profiles where id = old.profile_id) then
    return old;
  end if;
  insert into public.removed_items
    (item_id, list_id, name, visible_in_all_groups, group_ids, item_created_at, not_wanted)
  values (
    old.id,
    old.profile_id,
    old.name,
    old.visible_in_all_groups,
    array(select ig.group_id from public.item_groups ig where ig.item_id = old.id),
    old.created_at,
    old.not_wanted
  )
  on conflict (item_id) do nothing;
  return old;
end;
$$;

-- Same as in 20261021160000_list_digest.sql, plus the not_wanted column at the end.
-- The return type changes, so it has to be dropped first.
drop function public.pending_digest(timestamptz);

create function public.pending_digest(upto timestamptz)
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
    union all
    select
      r.list_id, 'removed', r.name, r.visible_in_all_groups, r.group_ids, null, r.removed_at,
      r.not_wanted
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
      or (c.change <> 'bought' and not f.is_editor)
    )
    and public.profile_sees_item(f.follower_id, f.list_id, c.all_groups, c.group_ids)
  order by f.follower_id, f.list_name, f.list_id, c.change, c.at;
$$;

revoke execute on function public.pending_digest(timestamptz) from public, anon, authenticated;
grant execute on function public.pending_digest(timestamptz) to service_role;
