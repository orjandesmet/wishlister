-- Secret Santa draws for a group occasion (#102).
--
-- A group manager picks the members who take part in an occasion's draw and,
-- if they like, who must not draw whom. Everyone who takes part gets an email with
-- the one person they draw, follows that person's list until the occasion, and sees
-- a ribbon on it. Nobody sees anyone else's pair, the manager included (they take
-- part too).
--
-- * One draw per occasion, and one running draw per group: the next one can only start once
--   the occasion of the running one has passed.
-- * Only members with an account and their own list in the group take part: no
--   managed children and no guardians.
-- * The draw itself runs in a Netlify function (netlify/lib/secretSanta.ts), which
--   hands the result to create_secret_santa(). That function can only be called with
--   the secret key, so no client ever gets the full result.
-- * Only the manager can remove someone from a draw. Whoever drew them gets the
--   person they drew, even when that breaks an exclusion or the loop rule: something
--   may already have been bought. There's no redraw.
-- * Nobody can leave a group while they take part in a draw whose occasion hasn't
--   passed. The manager removes them from the draw first.
-- * The group's last 2 draws are the history of the next one
--   (secret_santa_history()).
--
-- Exclusions are kept only to remove someone cleanly, so the table has no grants.
--
-- Backwards compatible: new tables and functions the deployed app doesn't use. Only
-- remove_from_group() changes, with the same signature, and it only refuses more.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.secret_santas (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  occasion_id uuid not null unique references public.occasions (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index secret_santas_group_id_idx on public.secret_santas (group_id, created_at desc);

alter table public.secret_santas enable row level security;

create policy "Read the draws of your groups"
  on public.secret_santas for select to authenticated
  using (group_id in (select public.my_group_ids()));

grant select on public.secret_santas to authenticated;

create table public.secret_santa_pairs (
  secret_santa_id uuid not null references public.secret_santas (id) on delete cascade,
  giver_profile_id uuid not null references public.profiles (id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  -- When the email went out (or is going out): see claim_secret_santa_notices().
  mailed_at timestamptz,
  primary key (secret_santa_id, giver_profile_id),
  unique (secret_santa_id, recipient_profile_id),
  constraint secret_santa_pairs_not_yourself check (giver_profile_id <> recipient_profile_id)
);

create index secret_santa_pairs_giver_idx on public.secret_santa_pairs (giver_profile_id);

alter table public.secret_santa_pairs enable row level security;

-- Your own pair and nobody else's. Managers get no exception.
create policy "Read your own Secret Santa pair"
  on public.secret_santa_pairs for select to authenticated
  using (giver_profile_id = public.my_profile_id());

grant select (secret_santa_id, giver_profile_id, recipient_profile_id)
  on public.secret_santa_pairs to authenticated;

create table public.secret_santa_exclusions (
  secret_santa_id uuid not null references public.secret_santas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  excluded_profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (secret_santa_id, profile_id, excluded_profile_id),
  constraint secret_santa_exclusions_not_yourself check (profile_id <> excluded_profile_id)
);

-- No policies and no grants: only the functions below get in.
alter table public.secret_santa_exclusions enable row level security;

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------

-- Members that can take part in a draw: an account and their own list in the group.
-- Managers only.
create function public.secret_santa_candidates(target_group uuid)
returns table (profile_id uuid, display_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_group_manager(target_group) then
    raise exception 'Only managers can start a Secret Santa' using errcode = 'insufficient_privilege';
  end if;
  return query
    select p.id, p.display_name
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = target_group
      and gm.role <> 'guardian'
      and p.account_id is not null
    order by p.display_name, p.id;
end;
$$;

-- The draws of a group, with whether you take part and who you drew. Never anyone
-- else's pair.
create function public.get_secret_santas(target_group uuid)
returns table (
  id uuid,
  occasion_id uuid,
  taking_part boolean,
  recipient_profile_id uuid,
  recipient_name text
)
language sql stable security definer set search_path = ''
as $$
  select
    s.id,
    s.occasion_id,
    mine.giver_profile_id is not null,
    mine.recipient_profile_id,
    rp.display_name
  from public.secret_santas s
  left join public.secret_santa_pairs mine
    on mine.secret_santa_id = s.id and mine.giver_profile_id = public.my_profile_id()
  left join public.profiles rp on rp.id = mine.recipient_profile_id
  where s.group_id = target_group
    and s.group_id in (select public.my_group_ids())
  order by s.created_at, s.id;
$$;

-- The people you drew in draws that haven't ended, for the ribbon on their lists.
-- The app passes its own "today", because the database's current_date is in UTC.
create function public.my_secret_santa_recipients(from_date date default current_date)
returns table (
  recipient_profile_id uuid,
  occasion_id uuid,
  occasion_name text,
  occasion_date date
)
language sql stable security definer set search_path = ''
as $$
  select pr.recipient_profile_id, o.id, o.name, o.date
  from public.secret_santa_pairs pr
  join public.secret_santas s on s.id = pr.secret_santa_id
  join public.occasions o on o.id = s.occasion_id
  where pr.giver_profile_id = public.my_profile_id()
    and o.date >= from_date
  order by o.date, o.name, pr.recipient_profile_id;
$$;

-- Who takes part in a draw, for the manager to remove someone. Not who drew whom.
create function public.secret_santa_participants(target_secret_santa uuid)
returns table (profile_id uuid, display_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.secret_santas s
    where s.id = target_secret_santa and public.is_group_manager(s.group_id)
  ) then
    raise exception 'Secret Santa not found' using errcode = 'no_data_found';
  end if;
  return query
    select p.id, p.display_name
    from public.secret_santa_pairs pr
    join public.profiles p on p.id = pr.giver_profile_id
    where pr.secret_santa_id = target_secret_santa
    order by p.display_name, p.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Making a draw (only with the secret key, from netlify/functions/start-secret-santa.mts)
-- ---------------------------------------------------------------------------

-- The group's last 2 draws as (rank, giver, recipient): 1 is the latest. Not
-- reachable from the app.
create function public.secret_santa_history(target_group uuid)
returns table (draw_rank integer, giver_profile_id uuid, recipient_profile_id uuid)
language sql stable security definer set search_path = ''
as $$
  with recent as (
    select s.id, row_number() over (order by s.created_at desc, s.id desc)::integer as draw_rank
    from public.secret_santas s
    where s.group_id = target_group
  )
  select r.draw_rank, pr.giver_profile_id, pr.recipient_profile_id
  from recent r
  join public.secret_santa_pairs pr on pr.secret_santa_id = r.id
  where r.draw_rank <= 2;
$$;

-- Stores a draw: the participants, the manager's exclusions and the pairs, and has
-- everyone follow the person they drew until the occasion. `exclusions` is a list of
-- {"profile_id", "excluded_profile_id"}, `pairs` of {"giver", "recipient"}.
create function public.create_secret_santa(
  manager uuid,
  target_occasion uuid,
  participants uuid[],
  exclusions jsonb,
  pairs jsonb
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  occasion public.occasions;
  new_id uuid;
  wanted integer := coalesce(cardinality(participants), 0);
begin
  select * into occasion from public.occasions where id = target_occasion;
  if occasion.id is null then
    raise exception 'Occasion not found' using errcode = 'no_data_found';
  end if;
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = occasion.group_id and gm.profile_id = manager and gm.role = 'manager'
  ) then
    raise exception 'Only managers can start a Secret Santa' using errcode = 'insufficient_privilege';
  end if;
  -- A day of slack: the app's "today" can be a day behind the database's.
  if occasion.date < current_date - 1 then
    raise exception 'This occasion has passed' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.secret_santas where occasion_id = target_occasion) then
    raise exception 'There is already a Secret Santa for this occasion'
      using errcode = 'unique_violation';
  end if;
  if exists (
    select 1
    from public.secret_santas s
    join public.occasions o on o.id = s.occasion_id
    where s.group_id = occasion.group_id and o.date >= current_date - 1
  ) then
    raise exception 'There is already a Secret Santa running in this group'
      using errcode = 'unique_violation';
  end if;

  if wanted < 2 or wanted <> (select count(distinct x) from unnest(participants) x) then
    raise exception 'A Secret Santa needs at least 2 different participants'
      using errcode = 'check_violation';
  end if;
  if (
    select count(*)
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = occasion.group_id
      and gm.role <> 'guardian'
      and p.account_id is not null
      and gm.profile_id = any (participants)
  ) <> wanted then
    raise exception 'Only members with their own list can take part'
      using errcode = 'check_violation';
  end if;

  -- Everyone gives once and receives once, and nobody draws themselves.
  if (select count(*) from jsonb_to_recordset(pairs) as x(giver uuid, recipient uuid)) <> wanted
    or exists (
      select 1 from jsonb_to_recordset(pairs) as x(giver uuid, recipient uuid)
      where x.giver = x.recipient
        or not (x.giver = any (participants))
        or not (x.recipient = any (participants))
    )
    or (select count(distinct x.giver) from jsonb_to_recordset(pairs) as x(giver uuid, recipient uuid)) <> wanted
    or (select count(distinct x.recipient) from jsonb_to_recordset(pairs) as x(giver uuid, recipient uuid)) <> wanted
  then
    raise exception 'The draw isn''t valid' using errcode = 'check_violation';
  end if;

  insert into public.secret_santas (group_id, occasion_id, created_by)
  values (occasion.group_id, target_occasion, manager)
  returning id into new_id;

  insert into public.secret_santa_pairs (secret_santa_id, giver_profile_id, recipient_profile_id)
  select new_id, x.giver, x.recipient
  from jsonb_to_recordset(pairs) as x(giver uuid, recipient uuid);

  insert into public.secret_santa_exclusions (secret_santa_id, profile_id, excluded_profile_id)
  select distinct new_id, x.profile_id, x.excluded_profile_id
  from jsonb_to_recordset(exclusions) as x(profile_id uuid, excluded_profile_id uuid)
  where x.profile_id = any (participants)
    and x.excluded_profile_id = any (participants)
    and x.profile_id <> x.excluded_profile_id;

  -- Follow the list you drew until the occasion. An existing follow only gets longer.
  insert into public.list_follows (follower_id, list_id, until)
  select x.giver, x.recipient, occasion.date
  from jsonb_to_recordset(pairs) as x(giver uuid, recipient uuid)
  on conflict (follower_id, list_id)
    do update set until = greatest(public.list_follows.until, excluded.until);

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Removing someone from a draw
-- ---------------------------------------------------------------------------

-- Managers only. If A drew B and B drew C, A gets C: they follow C's list and get a
-- new email. This ignores the exclusions, the history and the loop rule. B's pair and
-- exclusions go. With only 2 participants left, nobody is left to draw, so the
-- whole draw goes ('draw_deleted').
create function public.remove_from_secret_santa(target_secret_santa uuid, target_profile uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  draw public.secret_santas;
  occasion_date date;
  giver uuid;
  next_recipient uuid;
begin
  select * into draw from public.secret_santas where id = target_secret_santa;
  if draw.id is null or not public.is_group_manager(draw.group_id) then
    raise exception 'Secret Santa not found' using errcode = 'no_data_found';
  end if;

  select pr.recipient_profile_id into next_recipient
  from public.secret_santa_pairs pr
  where pr.secret_santa_id = draw.id and pr.giver_profile_id = target_profile;
  select pr.giver_profile_id into giver
  from public.secret_santa_pairs pr
  where pr.secret_santa_id = draw.id and pr.recipient_profile_id = target_profile;
  if next_recipient is null or giver is null then
    raise exception 'This person doesn''t take part' using errcode = 'no_data_found';
  end if;

  if giver = next_recipient then
    delete from public.secret_santas where id = draw.id;
    return 'draw_deleted';
  end if;

  select o.date into occasion_date from public.occasions o where o.id = draw.occasion_id;

  delete from public.secret_santa_pairs
  where secret_santa_id = draw.id and giver_profile_id = target_profile;
  delete from public.secret_santa_exclusions
  where secret_santa_id = draw.id
    and (profile_id = target_profile or excluded_profile_id = target_profile);

  update public.secret_santa_pairs
  set recipient_profile_id = next_recipient, mailed_at = null
  where secret_santa_id = draw.id and giver_profile_id = giver;

  insert into public.list_follows (follower_id, list_id, until)
  values (giver, next_recipient, occasion_date)
  on conflict (follower_id, list_id)
    do update set until = greatest(public.list_follows.until, excluded.until);

  return 'removed';
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaving a group
-- ---------------------------------------------------------------------------

-- Same as in 20261016140000_last_manager.sql, except that nobody leaves a group
-- (or is removed from it) while taking part in a draw whose occasion hasn't passed.
create or replace function public.remove_from_group(target_group uuid, target_profile uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if not (
    public.is_group_manager(target_group)
    or target_profile = public.my_profile_id()
    or public.is_parent_of(target_profile)
  ) then
    raise exception 'You can''t remove this person from the group';
  end if;

  -- A day of slack: the app's "today" can be a day behind the database's.
  if exists (
    select 1
    from public.secret_santa_pairs pr
    join public.secret_santas s on s.id = pr.secret_santa_id
    join public.occasions o on o.id = s.occasion_id
    where s.group_id = target_group
      and pr.giver_profile_id = target_profile
      and o.date >= current_date - 1
  ) then
    raise exception 'This person takes part in a Secret Santa that hasn''t ended: a manager has to remove them from it first'
      using errcode = 'check_violation';
  end if;

  -- The last manager may only go when no one else with an account stays behind.
  if exists (
    select 1 from public.group_members
    where group_id = target_group and profile_id = target_profile and role = 'manager'
  ) and not exists (
    select 1 from public.group_members
    where group_id = target_group and profile_id <> target_profile and role = 'manager'
  ) and exists (
    select 1
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = target_group and gm.profile_id <> target_profile and p.account_id is not null
  ) then
    raise exception 'Make someone else a manager first';
  end if;

  delete from public.group_members
  where group_id = target_group and profile_id = target_profile;

  -- Children in the group none of whose parents are still in it.
  delete from public.group_members gm
  using public.profiles child
  where gm.group_id = target_group
    and child.id = gm.profile_id
    and child.account_id is null
    and not exists (
      select 1
      from public.profile_managers pm
      join public.group_members parent_gm
        on parent_gm.profile_id = pm.manager_profile_id and parent_gm.group_id = target_group
      where pm.profile_id = child.id
    );

  if not exists (
    select 1
    from public.group_members gm
    join public.profiles p on p.id = gm.profile_id
    where gm.group_id = target_group and p.account_id is not null
  ) then
    delete from public.groups where id = target_group;
    return 'group_deleted';
  end if;
  return 'removed';
end;
$$;

-- ---------------------------------------------------------------------------
-- The emails
-- ---------------------------------------------------------------------------

-- Pairs nobody was mailed about yet, marked as mailed, so two calls at the same time
-- don't both send. Hand them back with release_secret_santa_notices() when sending
-- fails. Draws whose occasion has passed are skipped. A pair that changes because
-- someone was removed is mailed again.
create function public.claim_secret_santa_notices()
returns table (
  secret_santa_id uuid,
  giver_profile_id uuid,
  recipient_profile_id uuid,
  recipient_name text,
  occasion_name text,
  occasion_date date,
  group_name text,
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
    where pr.mailed_at is null and o.date >= current_date - 1
    for update of pr skip locked
  ),
  claimed as (
    update public.secret_santa_pairs pr
    set mailed_at = now()
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
    g.name,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'locale', 'en')
  from claimed c
  join public.secret_santas s on s.id = c.secret_santa_id
  join public.occasions o on o.id = s.occasion_id
  join public.groups g on g.id = s.group_id
  join public.profiles rp on rp.id = c.recipient_profile_id
  join public.profiles gp on gp.id = c.giver_profile_id
  join auth.users u on u.id = gp.account_id
  where u.email is not null
  order by c.secret_santa_id, c.giver_profile_id;
$$;

-- Pairs that were claimed but not mailed (no email address, or sending failed), so
-- that they are claimed again. `draw_ids[i]` goes with `giver_ids[i]`.
create function public.release_secret_santa_notices(draw_ids uuid[], giver_ids uuid[])
returns void
language sql security definer set search_path = ''
as $$
  update public.secret_santa_pairs pr
  set mailed_at = null
  from unnest(draw_ids, giver_ids) as r (draw_id, giver_id)
  where pr.secret_santa_id = r.draw_id and pr.giver_profile_id = r.giver_id;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

revoke execute on function
  public.secret_santa_candidates(uuid),
  public.get_secret_santas(uuid),
  public.my_secret_santa_recipients(date),
  public.secret_santa_participants(uuid),
  public.secret_santa_history(uuid),
  public.create_secret_santa(uuid, uuid, uuid[], jsonb, jsonb),
  public.remove_from_secret_santa(uuid, uuid),
  public.claim_secret_santa_notices(),
  public.release_secret_santa_notices(uuid[], uuid[])
from public, anon, authenticated;

grant execute on function
  public.secret_santa_candidates(uuid),
  public.get_secret_santas(uuid),
  public.my_secret_santa_recipients(date),
  public.secret_santa_participants(uuid),
  public.remove_from_secret_santa(uuid, uuid)
to authenticated;

grant execute on function
  public.secret_santa_history(uuid),
  public.create_secret_santa(uuid, uuid, uuid[], jsonb, jsonb),
  public.claim_secret_santa_notices(),
  public.release_secret_santa_notices(uuid[], uuid[])
to service_role;
