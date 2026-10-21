-- Following someone's list (#27), step 2: the daily email with what changed.
--
-- netlify/functions/send-digests.mts runs every evening. It asks pending_digest()
-- for the changes since the last run, mails one digest to each follower, and
-- calls digest_sent() to move on. Both functions are for the secret key only.
--
-- What a follower hears about, on a list they follow:
-- * added: items added since the last digest that they can see;
-- * removed: items removed since then that they could see (one added and removed
--   between two digests doesn't show up at all);
-- * bought: purchases since then that they can see, except their own.
-- People who edit the list (parents of a child) don't hear about added or removed
-- items, they made those changes themselves. Nobody learns who bought something.

-- Removed items, kept until the next digest. Who could see them is copied here,
-- because their item_groups rows go with them.
create table public.removed_items (
  item_id uuid primary key,
  list_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  visible_in_all_groups boolean not null,
  group_ids uuid[] not null,
  item_created_at timestamptz not null,
  removed_at timestamptz not null default now()
);

-- No grants and no policies: only the functions below read it.
alter table public.removed_items enable row level security;

create function public.remember_removed_item()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- The whole list is going (a child's profile was deleted): nobody to tell.
  if not exists (select 1 from public.profiles where id = old.profile_id) then
    return old;
  end if;
  insert into public.removed_items
    (item_id, list_id, name, visible_in_all_groups, group_ids, item_created_at)
  values (
    old.id,
    old.profile_id,
    old.name,
    old.visible_in_all_groups,
    array(select ig.group_id from public.item_groups ig where ig.item_id = old.id),
    old.created_at
  )
  on conflict (item_id) do nothing;
  return old;
end;
$$;

-- Before the delete, while the item's groups are still there.
create trigger remember_removed_item
  before delete on public.items
  for each row execute function public.remember_removed_item();

-- Where the last digest stopped. One row.
create table public.digest_state (
  id boolean primary key default true check (id),
  sent_up_to timestamptz not null
);

alter table public.digest_state enable row level security;

-- Start from now: nothing that happened before this migration gets mailed.
insert into public.digest_state (sent_up_to) values (now());

-- Can `viewer` see an item on `list` that shows in all groups, or only in
-- `group_ids`? Like can_view_item(), but for someone else than the caller.
create function public.profile_sees_item(
  viewer uuid,
  list uuid,
  all_groups boolean,
  group_ids uuid[]
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profile_managers
    where profile_id = list and manager_profile_id = viewer
  ) or exists (
    select 1
    from public.group_members owner_gm
    join public.group_members viewer_gm on viewer_gm.group_id = owner_gm.group_id
    where owner_gm.profile_id = list
      and owner_gm.role <> 'guardian'
      and viewer_gm.profile_id = viewer
      and (all_groups or owner_gm.group_id = any (group_ids))
  );
$$;

-- Every change to mail since the last digest, up to `upto`: one row per follower,
-- list and item, with what the email needs. Ordered for grouping.
create function public.pending_digest(upto timestamptz)
returns table (
  follower_id uuid,
  email text,
  locale text,
  list_id uuid,
  list_name text,
  unfollow_token uuid,
  change text,
  item_name text
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
      i.created_at as at
    from public.items i, window_ w
    where i.created_at > w.since and i.created_at <= upto
    union all
    select r.list_id, 'removed', r.name, r.visible_in_all_groups, r.group_ids, null, r.removed_at
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
      pu.bought_at
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
    c.item_name
  from follows f
  join changes c on c.list_id = f.list_id
  where (
      (c.change = 'bought' and c.buyer <> f.follower_id)
      or (c.change <> 'bought' and not f.is_editor)
    )
    and public.profile_sees_item(f.follower_id, f.list_id, c.all_groups, c.group_ids)
  order by f.follower_id, f.list_name, f.list_id, c.change, c.at;
$$;

-- The digest up to `upto` went out: move on, and forget what's no longer needed.
create function public.digest_sent(upto timestamptz)
returns void
language sql security definer set search_path = ''
as $$
  update public.digest_state set sent_up_to = upto where sent_up_to < upto;
  delete from public.removed_items where removed_at <= upto;
  -- Ended follows. A day of slack, like the window above.
  delete from public.list_follows where until < (upto at time zone 'UTC')::date - 1;
$$;

-- The "stop following" link in the emails. Works without signing in: the token
-- is the proof. Returns whose list it was, or null when the link no longer works.
create function public.unfollow_by_token(token uuid)
returns text
language sql security definer set search_path = ''
as $$
  with gone as (
    delete from public.list_follows where unfollow_token = token returning list_id
  )
  select p.display_name from gone join public.profiles p on p.id = gone.list_id;
$$;

revoke execute on function
  public.remember_removed_item(),
  public.profile_sees_item(uuid, uuid, boolean, uuid[]),
  public.pending_digest(timestamptz),
  public.digest_sent(timestamptz),
  public.unfollow_by_token(uuid)
from public, anon, authenticated;

grant execute on function
  public.pending_digest(timestamptz),
  public.digest_sent(timestamptz)
to service_role;

grant execute on function public.unfollow_by_token(uuid) to anon, authenticated;
