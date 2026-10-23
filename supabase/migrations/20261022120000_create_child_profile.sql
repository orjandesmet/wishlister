-- A parent adds a child from their own settings, without putting them in a group yet.
create function public.create_child_profile(child_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  child uuid;
begin
  if public.my_profile_id() is null then
    raise exception 'You need to be signed in';
  end if;
  insert into public.profiles (display_name) values (trim(child_name)) returning id into child;
  insert into public.profile_managers (profile_id, manager_profile_id)
  values (child, public.my_profile_id());
  return child;
end;
$$;

revoke execute on function public.create_child_profile(text) from public, anon;
grant execute on function public.create_child_profile(text) to authenticated;
