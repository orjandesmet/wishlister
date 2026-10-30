-- Cleaning up bought items after an occasion (#7).
--
-- After an occasion's date, a list's editors (the owner, or the managing parents
-- of a child) are asked: "N items on your list were bought for <occasion>.
-- Remove them?" Nothing changes without their yes.
--
-- * Remove archives those items (items.archived_at): nobody sees them any more,
--   and nobody hears about it (archiving isn't deleting, so no "removed" line
--   in the digest). Undo brings them back.
-- * An item with "keep on my list" (items.keep_on_list) stays: only its bought
--   mark goes, put aside in cleared_purchases so undo can bring it back.
-- * Keep leaves everything as it is and doesn't ask again for that occasion.
--
-- No spoilers: the count only exists from the day after the occasion. Before
-- that, editors see nothing, same as before.
--
-- Backwards compatible: new columns with defaults, and archived items simply
-- disappear for the deployed app too.

alter table public.items
  add column archived_at timestamptz,
  add column keep_on_list boolean not null default false;

-- Updates are granted per column (see 20261016120000_table_grants.sql).
-- archived_at only changes through the functions below.
grant update (keep_on_list) on public.items to authenticated;

-- ---------------------------------------------------------------------------
-- Archived items are gone for everyone
-- ---------------------------------------------------------------------------

-- Same as in 20261019120000_guardian_role.sql, minus archived items. Purchases,
-- questions and the rest follow, since they check this too.
create or replace function public.can_view_item(target_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    where i.id = target_item
      and i.archived_at is null
      and (
        public.can_edit_profile(i.profile_id)
        or exists (
          select 1
          from public.group_members gm
          where gm.profile_id = i.profile_id
            and gm.role <> 'guardian'
            and gm.group_id in (select public.my_group_ids())
            and (
              i.visible_in_all_groups
              or exists (
                select 1 from public.item_groups ig
                where ig.item_id = i.id and ig.group_id = gm.group_id
              )
            )
        )
      )
  );
$$;

drop policy "Read items you can see" on public.items;
drop policy "Add items to your own or your child's list" on public.items;
drop policy "Edit items on your own or your child's list" on public.items;
drop policy "Delete items from your own or your child's list" on public.items;

create policy "Read items you can see"
  on public.items for select to authenticated
  using (
    case when public.can_edit_profile(profile_id)
      then removed_at is null and archived_at is null
      else public.can_view_item(id)
    end
  );

create policy "Add items to your own or your child's list"
  on public.items for insert to authenticated
  with check (public.can_edit_profile(profile_id) and removed_at is null and archived_at is null);

create policy "Edit items on your own or your child's list"
  on public.items for update to authenticated
  using (public.can_edit_profile(profile_id) and removed_at is null and archived_at is null)
  with check (public.can_edit_profile(profile_id));

create policy "Delete items from your own or your child's list"
  on public.items for delete to authenticated
  using (public.can_edit_profile(profile_id) and removed_at is null and archived_at is null);

-- ---------------------------------------------------------------------------
-- What the cleanup needs to remember
-- ---------------------------------------------------------------------------

-- Bought marks taken off "keep on my list" items, for undo.
create table public.cleared_purchases (
  item_id uuid primary key references public.items (id) on delete cascade,
  bought_by uuid not null references public.profiles (id) on delete cascade,
  occasion_id uuid references public.occasions (id) on delete set null,
  bought_at timestamptz not null,
  cleared_at timestamptz not null
);

-- Occasions an editor chose Keep for: not asked again.
create table public.kept_after_occasions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  occasion_id uuid not null references public.occasions (id) on delete cascade,
  kept_at timestamptz not null default now(),
  primary key (profile_id, occasion_id)
);

-- Only the functions below use them: no policies, no grants.
alter table public.cleared_purchases enable row level security;
alter table public.kept_after_occasions enable row level security;

-- ---------------------------------------------------------------------------
-- The prompt
-- ---------------------------------------------------------------------------

-- The day an occasion has to be before to count as passed. The app passes its own
-- "today", because the database's current_date is in UTC, but never more than a
-- day ahead: no peeking at future occasions.
create function public.cleanup_day(on_date date)
returns date
language sql stable set search_path = ''
as $$
  select least(on_date, current_date + 1);
$$;

-- Passed occasions with items bought for them on this list, and how many.
-- Only for the list's editors; empty for anyone else.
create function public.pending_cleanups(target_profile uuid, on_date date default current_date)
returns table (occasion_id uuid, occasion_name text, occasion_date date, item_count integer)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.name, o.date, count(*)::integer
  from public.items i
  join public.purchases pu on pu.item_id = i.id
  join public.occasions o on o.id = pu.occasion_id
  where public.can_edit_profile(target_profile)
    and i.profile_id = target_profile
    and i.archived_at is null
    and i.removed_at is null
    and o.date < public.cleanup_day(on_date)
    and not exists (
      select 1 from public.kept_after_occasions k
      where k.profile_id = target_profile and k.occasion_id = o.id
    )
  group by o.id, o.name, o.date
  order by o.date, o.name;
$$;

-- Remove: archive the items bought for these (passed) occasions, or only clear
-- their bought mark when they're kept on the list. Items the editors already
-- removed (kept only for their buyer, see 20261025120000_removed_bought_items.sql)
-- are archived too. Returns the moment it happened, to undo it with.
create function public.clean_up_after_occasions(
  target_profile uuid,
  occasion_ids uuid[],
  on_date date default current_date
)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  stamp timestamptz := now();
  kept uuid[];
  archived uuid[];
begin
  if not public.can_edit_profile(target_profile) then
    raise exception 'You can only clean up your own list or your child''s';
  end if;

  select
    coalesce(array_agg(i.id) filter (where i.keep_on_list and i.removed_at is null), '{}'),
    coalesce(array_agg(i.id) filter (where not (i.keep_on_list and i.removed_at is null)), '{}')
  into kept, archived
  from public.items i
  join public.purchases pu on pu.item_id = i.id
  join public.occasions o on o.id = pu.occasion_id
  where i.profile_id = target_profile
    and i.archived_at is null
    and o.id = any (occasion_ids)
    and o.date < public.cleanup_day(on_date);

  insert into public.cleared_purchases (item_id, bought_by, occasion_id, bought_at, cleared_at)
  select pu.item_id, pu.bought_by, pu.occasion_id, pu.bought_at, stamp
  from public.purchases pu
  where pu.item_id = any (kept)
  on conflict (item_id) do update set
    bought_by = excluded.bought_by,
    occasion_id = excluded.occasion_id,
    bought_at = excluded.bought_at,
    cleared_at = excluded.cleared_at;

  delete from public.purchases where item_id = any (kept);

  update public.items set archived_at = stamp where id = any (archived);

  return stamp;
end;
$$;

-- Undo a Remove: the archived items come back, and so do the cleared bought marks
-- (unless someone bought the item again in the meantime, or it became a "please
-- don't buy").
create function public.undo_clean_up(target_profile uuid, cleaned_at timestamptz)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_edit_profile(target_profile) then
    raise exception 'You can only clean up your own list or your child''s';
  end if;

  update public.items
  set archived_at = null
  where profile_id = target_profile and archived_at = cleaned_at;

  insert into public.purchases (item_id, bought_by, occasion_id, bought_at)
  select cp.item_id, cp.bought_by, cp.occasion_id, cp.bought_at
  from public.cleared_purchases cp
  join public.items i on i.id = cp.item_id
  where i.profile_id = target_profile
    and cp.cleared_at = cleaned_at
    and not i.not_wanted
  on conflict (item_id) do nothing;

  delete from public.cleared_purchases cp
  using public.items i
  where i.id = cp.item_id and i.profile_id = target_profile and cp.cleared_at = cleaned_at;
end;
$$;

-- Keep: leave the items as they are and don't ask again for these occasions.
create function public.keep_after_occasions(target_profile uuid, occasion_ids uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_edit_profile(target_profile) then
    raise exception 'You can only clean up your own list or your child''s';
  end if;

  insert into public.kept_after_occasions (profile_id, occasion_id)
  select target_profile, o.id
  from public.occasions o
  where o.id = any (occasion_ids)
  on conflict do nothing;
end;
$$;

revoke execute on function
  public.cleanup_day(date),
  public.pending_cleanups(uuid, date),
  public.clean_up_after_occasions(uuid, uuid[], date),
  public.undo_clean_up(uuid, timestamptz),
  public.keep_after_occasions(uuid, uuid[])
from public, anon;

grant execute on function
  public.cleanup_day(date),
  public.pending_cleanups(uuid, date),
  public.clean_up_after_occasions(uuid, uuid[], date),
  public.undo_clean_up(uuid, timestamptz),
  public.keep_after_occasions(uuid, uuid[])
to authenticated;
