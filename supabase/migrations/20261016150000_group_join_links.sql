-- Invite links: a manager shares a link with a secret code, and anyone signed in
-- who opens it joins the group, whatever email address they signed up with.
--
-- The codes live in their own table with no grants, so only the functions below
-- can read them: members can't see a group's code, only managers get it.

create table public.group_join_codes (
  group_id uuid primary key references public.groups (id) on delete cascade,
  code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

alter table public.group_join_codes enable row level security;

-- The group's code, made on first use. Managers only.
create function public.group_join_code(target_group uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  join_code text;
begin
  if not public.is_group_manager(target_group) then
    raise exception 'Only group managers can share the invite link';
  end if;

  insert into public.group_join_codes (group_id) values (target_group)
  on conflict (group_id) do nothing;

  select code into join_code from public.group_join_codes where group_id = target_group;
  return join_code;
end;
$$;

-- A new code, so links shared earlier stop working. Managers only.
create function public.reset_group_join_code(target_group uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  join_code text;
begin
  if not public.is_group_manager(target_group) then
    raise exception 'Only group managers can reset the invite link';
  end if;

  insert into public.group_join_codes (group_id) values (target_group)
  on conflict (group_id) do update
    set code = excluded.code, created_at = excluded.created_at
  returning code into join_code;
  return join_code;
end;
$$;

-- What the join page shows before you accept: the group's name, and whether
-- you're in it already. No rows when the code is wrong or was reset.
create function public.group_for_join_code(join_code text)
returns table (group_id uuid, group_name text, is_member boolean)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.id in (select public.my_group_ids())
  from public.group_join_codes c
  join public.groups g on g.id = c.group_id
  where c.code = join_code;
$$;

-- Join the group behind a code. Returns the group's id.
create function public.join_group_by_code(join_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  target_group uuid;
  me uuid := public.my_profile_id();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  select group_id into target_group from public.group_join_codes where code = join_code;
  if target_group is null then
    raise exception 'This invite link doesn''t work anymore. Ask for a new one.';
  end if;

  insert into public.group_members (group_id, profile_id)
  values (target_group, me)
  on conflict do nothing;
  return target_group;
end;
$$;

revoke execute on function
  public.group_join_code(uuid),
  public.reset_group_join_code(uuid),
  public.group_for_join_code(text),
  public.join_group_by_code(text)
from public, anon;

grant execute on function
  public.group_join_code(uuid),
  public.reset_group_join_code(uuid),
  public.group_for_join_code(text),
  public.join_group_by_code(text)
to authenticated;
