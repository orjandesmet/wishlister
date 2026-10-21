-- Following someone's list (#27), step 1: who follows which list, and until when.
-- The daily email with the changes comes in a later migration.
--
-- * A purchase can say which occasion it's for ("I bought this for Christmas").
--   The buyer picks from the upcoming occasions of the groups where they see the
--   item. #7 uses the same link to clean up bought items after the occasion.
-- * You follow a list until a date. Marking something as bought follows that list
--   until the purchase's occasion, or 30 days without one. When you already follow
--   it, the date furthest in the future wins.

-- ---------------------------------------------------------------------------
-- Purchases for an occasion
-- ---------------------------------------------------------------------------

alter table public.purchases
  add column occasion_id uuid references public.occasions (id) on delete set null;

-- Groups I'm in where this item shows: its owner's list is shown there (they're no
-- guardian) and the item isn't limited to other groups.
create function public.item_group_ids(target_item uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select gm.group_id
  from public.items i
  join public.group_members gm on gm.profile_id = i.profile_id
  where i.id = target_item
    and gm.role <> 'guardian'
    and gm.group_id in (select public.my_group_ids())
    and (
      i.visible_in_all_groups
      or exists (
        select 1 from public.item_groups ig
        where ig.item_id = i.id and ig.group_id = gm.group_id
      )
    );
$$;

-- The occasions you can buy this item for: from `from_date` on, in the groups
-- where you see it. Soonest first. The app passes its own "today", because the
-- database's current_date is in UTC.
create function public.purchase_occasions(target_item uuid, from_date date default current_date)
returns table (id uuid, group_id uuid, name text, date date)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.group_id, o.name, o.date
  from public.occasions o
  where o.group_id in (select public.item_group_ids(target_item))
    and o.date >= from_date
  order by o.date, o.name;
$$;

drop policy "Mark items you can see as bought" on public.purchases;

create policy "Mark items you can see as bought"
  on public.purchases for insert to authenticated
  with check (
    bought_by = public.my_profile_id()
    and public.can_see_purchase(item_id)
    and (
      occasion_id is null
      or exists (
        select 1 from public.occasions o
        where o.id = occasion_id and o.group_id in (select public.item_group_ids(item_id))
      )
    )
  );

grant insert (occasion_id) on public.purchases to authenticated;

-- ---------------------------------------------------------------------------
-- Following lists
-- ---------------------------------------------------------------------------

create table public.list_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  list_id uuid not null references public.profiles (id) on delete cascade,
  -- The last day you hear about changes. Past dates are simply ended follows.
  until date not null,
  -- For the one-click "stop following" link in the emails.
  unfollow_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  primary key (follower_id, list_id),
  constraint list_follows_not_own_list check (follower_id <> list_id)
);

create index list_follows_list_id_idx on public.list_follows (list_id);

alter table public.list_follows enable row level security;

create policy "Read the lists you follow"
  on public.list_follows for select to authenticated
  using (follower_id = public.my_profile_id());

create policy "Stop following a list"
  on public.list_follows for delete to authenticated
  using (follower_id = public.my_profile_id());

-- Starting to follow and changing the date go through follow_list() below. The
-- token stays out of the app: it only travels in the emails.
grant select (follower_id, list_id, until) on public.list_follows to authenticated;
grant delete on public.list_follows to authenticated;

-- Follow a list you can see, or change the end date of a list you follow.
create function public.follow_list(target_profile uuid, until_date date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := public.my_profile_id();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if target_profile = me then
    raise exception 'You can''t follow your own list';
  end if;
  if not public.can_view_profile(target_profile) then
    raise exception 'You can only follow lists you can see';
  end if;
  -- A day of slack: the app's "today" can be a day behind the database's.
  if until_date < current_date - 1 then
    raise exception 'The end date has passed';
  end if;

  insert into public.list_follows (follower_id, list_id, until)
  values (me, target_profile, until_date)
  on conflict (follower_id, list_id) do update set until = excluded.until;
end;
$$;

-- "I bought this" follows that list until the purchase's occasion, or for 30 days
-- without one. An existing follow only ever gets longer.
create function public.follow_after_purchase()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  list uuid;
  end_date date;
begin
  select profile_id into list from public.items where id = new.item_id;
  select date into end_date from public.occasions where id = new.occasion_id;
  end_date := coalesce(end_date, current_date + 30);

  if list is not null and list <> new.bought_by then
    insert into public.list_follows (follower_id, list_id, until)
    values (new.bought_by, list, end_date)
    on conflict (follower_id, list_id)
      do update set until = greatest(public.list_follows.until, excluded.until);
  end if;
  return new;
end;
$$;

create trigger follow_after_purchase
  after insert on public.purchases
  for each row execute function public.follow_after_purchase();

revoke execute on function
  public.item_group_ids(uuid),
  public.purchase_occasions(uuid, date),
  public.follow_list(uuid, date),
  public.follow_after_purchase()
from public, anon;

grant execute on function
  public.item_group_ids(uuid),
  public.purchase_occasions(uuid, date),
  public.follow_list(uuid, date)
to authenticated;
