-- purchases.bought_by and group_invites.invited_by point at profiles instead of
-- auth accounts, like profile_managers. Only the signed-in person's own profile
-- can be the buyer.

-- purchases.bought_by: account → profile
alter table public.purchases
  drop constraint purchases_bought_by_fkey,
  alter column bought_by drop default;

update public.purchases pu
set bought_by = p.id
from public.profiles p
where p.account_id = pu.bought_by;

alter table public.purchases
  alter column bought_by set default public.my_profile_id(),
  add constraint purchases_bought_by_fkey
    foreign key (bought_by) references public.profiles (id) on delete cascade;

drop policy "Mark items you can see as bought" on public.purchases;
drop policy "Undo your own purchase" on public.purchases;

create policy "Mark items you can see as bought"
  on public.purchases for insert to authenticated
  with check (bought_by = public.my_profile_id() and public.can_see_purchase(item_id));

create policy "Undo your own purchase"
  on public.purchases for delete to authenticated
  using (bought_by = public.my_profile_id());

-- group_invites.invited_by: account → profile
alter table public.group_invites drop constraint group_invites_invited_by_fkey;

update public.group_invites gi
set invited_by = p.id
from public.profiles p
where p.account_id = gi.invited_by;

alter table public.group_invites
  add constraint group_invites_invited_by_fkey
    foreign key (invited_by) references public.profiles (id) on delete set null;

-- invite_to_group now records the inviter's profile.
create or replace function public.invite_to_group(target_group uuid, invitee_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  normalized text := lower(trim(invitee_email));
  invitee_profile uuid;
begin
  if not public.is_group_manager(target_group) then
    raise exception 'Only group managers can invite people';
  end if;
  if normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That does not look like an email address';
  end if;

  select p.id into invitee_profile
  from public.profiles p
  join auth.users u on u.id = p.account_id
  where lower(u.email) = normalized;

  if invitee_profile is null then
    insert into public.group_invites (group_id, email, invited_by)
    values (target_group, normalized, public.my_profile_id())
    on conflict do nothing;
    return case when found then 'invited' else 'already_invited' end;
  end if;

  insert into public.group_members (group_id, profile_id)
  values (target_group, invitee_profile)
  on conflict do nothing;
  return case when found then 'added' else 'already_member' end;
end;
$$;
