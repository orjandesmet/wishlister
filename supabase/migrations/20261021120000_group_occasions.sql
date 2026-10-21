-- Occasions: the dates a group buys presents for, like "Christmas 2026" on 25 Dec.
-- A group can have several. Managers add, change and remove them; every member
-- sees them.
--
-- Later work builds on these: purchases will say which occasion they're for, so
-- bought items can be cleaned up afterwards (#7), and following a list will end
-- at the next occasion by default (#27).

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  date date not null,
  created_at timestamptz not null default now()
);

create index occasions_group_id_date_idx on public.occasions (group_id, date);

alter table public.occasions enable row level security;

create policy "Read occasions of your groups"
  on public.occasions for select to authenticated
  using (group_id in (select public.my_group_ids()));

create policy "Managers add occasions"
  on public.occasions for insert to authenticated
  with check (public.is_group_manager(group_id));

create policy "Managers change occasions"
  on public.occasions for update to authenticated
  using (public.is_group_manager(group_id))
  with check (public.is_group_manager(group_id));

create policy "Managers remove occasions"
  on public.occasions for delete to authenticated
  using (public.is_group_manager(group_id));

-- An occasion can't move to another group, so only its name and date can change.
grant select, delete on public.occasions to authenticated;
grant insert (group_id, name, date) on public.occasions to authenticated;
grant update (name, date) on public.occasions to authenticated;

-- The first occasion on or after `from_date` in a group I share with this
-- profile, where their list is shown (so not where they're only a guardian).
-- No rows when there's none. The app passes its own "today", because the
-- database's current_date is in UTC.
create function public.next_shared_occasion(target_profile uuid, from_date date default current_date)
returns table (id uuid, group_id uuid, name text, date date)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.group_id, o.name, o.date
  from public.occasions o
  join public.group_members gm on gm.group_id = o.group_id
  where gm.profile_id = target_profile
    and gm.role <> 'guardian'
    and o.group_id in (select public.my_group_ids())
    and o.date >= from_date
  order by o.date, o.name
  limit 1;
$$;

revoke execute on function public.next_shared_occasion(uuid, date) from public, anon;
grant execute on function public.next_shared_occasion(uuid, date) to authenticated;
