-- Two Secret Santa emails (#138, #139).
--
-- * Nudge (#138): while a draw runs, the giver can ask the person they drew to add
--   some ideas, when that person's list has fewer than 3 items the giver could buy.
--   The email doesn't say who sent it. Once every 3 days per pair.
-- * Reminder (#139): a week before the occasion, everyone who takes part finds a
--   reminder in their evening digest, bought or not. Only in a digest: on a day
--   without one it waits for the next, until the occasion. A draw started less than a
--   week before the occasion gets none: its first email is recent enough.
--
-- Both go out from Netlify functions (nudge-secret-santa, send-digests) with
-- the secret key, through the claim/release functions below, like the draw emails in
-- 20261027140000_secret_santa.sql.
--
-- Backwards compatible: two new columns nobody else reads (authenticated only has
-- select on three named columns of secret_santa_pairs) and new functions.

alter table public.secret_santa_pairs
  -- When the giver last nudged the person they drew (#138).
  add column last_nudged_at timestamptz,
  -- When the reminder a week before the occasion went out (or is going out) (#139).
  add column reminded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Nudge (#138)
-- ---------------------------------------------------------------------------

-- How many items on a list a giver in the group could buy: shown to the group, not
-- "Please don't buy", not bought, not removed. Not reachable from the app.
create function public.secret_santa_buyable_items(target_group uuid, target_profile uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
  from public.items i
  where i.profile_id = target_profile
    and i.removed_at is null
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

-- For the Nudge button on the list of the person you drew: when you last nudged them
-- and how many items you could buy. Nothing when you didn't draw them in a draw whose
-- occasion is still to come. The app passes its own "today", because the database's
-- current_date is in UTC.
create function public.my_secret_santa_nudge(target_profile uuid, from_date date default current_date)
returns table (secret_santa_id uuid, last_nudged_at timestamptz, buyable_items integer)
language sql stable security definer set search_path = ''
as $$
  select
    pr.secret_santa_id,
    pr.last_nudged_at,
    public.secret_santa_buyable_items(s.group_id, pr.recipient_profile_id)
  from public.secret_santa_pairs pr
  join public.secret_santas s on s.id = pr.secret_santa_id
  join public.occasions o on o.id = s.occasion_id
  where pr.giver_profile_id = public.my_profile_id()
    and pr.recipient_profile_id = target_profile
    and o.date > from_date
  order by o.date
  limit 1;
$$;

-- Marks a nudge from `giver` to `recipient` as sent and hands back what the email
-- needs. Refuses (errcode check_violation, hint "too_soon" or "enough_items") within 3
-- days of the last nudge, or when the list has 3 or more items to buy; no_data_found
-- when there's no running draw with this pair. When sending fails, hand
-- `previous_nudged_at` back with release_secret_santa_nudge().
create function public.claim_secret_santa_nudge(giver uuid, recipient uuid)
returns table (
  secret_santa_id uuid,
  previous_nudged_at timestamptz,
  recipient_profile_id uuid,
  occasion_name text,
  occasion_date date,
  email text,
  locale text
)
language plpgsql security definer set search_path = ''
as $$
declare
  pair record;
begin
  select pr.secret_santa_id, pr.last_nudged_at, s.group_id, o.name, o.date
  into pair
  from public.secret_santa_pairs pr
  join public.secret_santas s on s.id = pr.secret_santa_id
  join public.occasions o on o.id = s.occasion_id
  where pr.giver_profile_id = giver
    and pr.recipient_profile_id = recipient
    and o.date >= current_date
  order by o.date
  limit 1
  for update of pr;
  if pair.secret_santa_id is null then
    raise exception 'No running Secret Santa with this person' using errcode = 'no_data_found';
  end if;
  if pair.last_nudged_at > now() - interval '3 days' then
    raise exception 'You nudged them less than 3 days ago'
      using errcode = 'check_violation', hint = 'too_soon';
  end if;
  if public.secret_santa_buyable_items(pair.group_id, recipient) >= 3 then
    raise exception 'Their list has enough ideas'
      using errcode = 'check_violation', hint = 'enough_items';
  end if;

  update public.secret_santa_pairs pr
  set last_nudged_at = now()
  where pr.secret_santa_id = pair.secret_santa_id and pr.giver_profile_id = giver;

  return query
    select pair.secret_santa_id, pair.last_nudged_at, recipient, pair.name, pair.date,
      u.email::text, coalesce(u.raw_user_meta_data ->> 'locale', 'en')
    from public.profiles rp
    join auth.users u on u.id = rp.account_id
    where rp.id = recipient;
end;
$$;

-- A nudge that wasn't sent: the pair's last nudge goes back to what it was.
create function public.release_secret_santa_nudge(
  target_secret_santa uuid,
  giver uuid,
  previous_nudged_at timestamptz
)
returns void
language sql security definer set search_path = ''
as $$
  update public.secret_santa_pairs pr
  set last_nudged_at = previous_nudged_at
  where pr.secret_santa_id = target_secret_santa and pr.giver_profile_id = giver;
$$;

-- ---------------------------------------------------------------------------
-- Reminder a week before (#139)
-- ---------------------------------------------------------------------------

-- The pairs of `givers` (those who get a digest this evening) whose occasion is 1 to
-- 7 days away and that weren't reminded yet, marked as reminded, so two runs at the
-- same time don't both send. Hand them back with release_secret_santa_reminders()
-- when sending fails. Draws made in the last week before their occasion are skipped.
create function public.claim_secret_santa_reminders(givers uuid[])
returns table (
  secret_santa_id uuid,
  giver_profile_id uuid,
  recipient_profile_id uuid,
  recipient_name text,
  occasion_name text,
  occasion_date date,
  days_left integer,
  email text,
  locale text
)
language sql security definer set search_path = ''
as $$
  with pending as (
    select pr.secret_santa_id, pr.giver_profile_id
    from public.secret_santa_pairs pr
    join public.secret_santas s on s.id = pr.secret_santa_id
    join public.occasions o on o.id = s.occasion_id
    where pr.reminded_at is null
      and o.date > current_date
      and o.date <= current_date + 7
      and s.created_at::date < o.date - 7
      and pr.giver_profile_id = any (givers)
    for update of pr skip locked
  ),
  claimed as (
    update public.secret_santa_pairs pr
    set reminded_at = now()
    from pending p
    where pr.secret_santa_id = p.secret_santa_id and pr.giver_profile_id = p.giver_profile_id
    returning pr.secret_santa_id, pr.giver_profile_id, pr.recipient_profile_id
  )
  select
    c.secret_santa_id,
    c.giver_profile_id,
    c.recipient_profile_id,
    rp.display_name,
    o.name,
    o.date,
    o.date - current_date,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'locale', 'en')
  from claimed c
  join public.secret_santas s on s.id = c.secret_santa_id
  join public.occasions o on o.id = s.occasion_id
  join public.profiles rp on rp.id = c.recipient_profile_id
  join public.profiles gp on gp.id = c.giver_profile_id
  join auth.users u on u.id = gp.account_id
  where u.email is not null
  order by c.secret_santa_id, c.giver_profile_id;
$$;

-- Reminders that were claimed but not sent, so that they are claimed again.
-- `draw_ids[i]` goes with `giver_ids[i]`.
create function public.release_secret_santa_reminders(draw_ids uuid[], giver_ids uuid[])
returns void
language sql security definer set search_path = ''
as $$
  update public.secret_santa_pairs pr
  set reminded_at = null
  from unnest(draw_ids, giver_ids) as r (draw_id, giver_id)
  where pr.secret_santa_id = r.draw_id and pr.giver_profile_id = r.giver_id;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

revoke execute on function
  public.secret_santa_buyable_items(uuid, uuid),
  public.my_secret_santa_nudge(uuid, date),
  public.claim_secret_santa_nudge(uuid, uuid),
  public.release_secret_santa_nudge(uuid, uuid, timestamptz),
  public.claim_secret_santa_reminders(uuid[]),
  public.release_secret_santa_reminders(uuid[], uuid[])
from public, anon, authenticated;

grant execute on function public.my_secret_santa_nudge(uuid, date) to authenticated;

grant execute on function
  public.secret_santa_buyable_items(uuid, uuid),
  public.claim_secret_santa_nudge(uuid, uuid),
  public.release_secret_santa_nudge(uuid, uuid, timestamptz),
  public.claim_secret_santa_reminders(uuid[]),
  public.release_secret_santa_reminders(uuid[], uuid[])
to service_role;
