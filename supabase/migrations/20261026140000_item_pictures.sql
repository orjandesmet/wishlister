-- Your own pictures for an item (#95): up to 5 per item, uploaded from the phone
-- or a link to a picture elsewhere. They come before the linked page's picture
-- (items.image_url), which stays as it is.
--
-- Uploads go to the public Storage bucket "item-pictures", under the folder of
-- the list they belong to: <profile id>/<random id>.webp. Public, so pictures
-- load and cache like any other; the random name is only known to those who can
-- read the item_pictures row, which row-level security limits to the people who
-- can see the item.
--
-- Files are never deleted here: a database can't remove them from Storage. The
-- daily Netlify function clean-pictures deletes the uploads no row points to
-- anymore (see orphaned_item_pictures()).
--
-- Backwards compatible: a new table and bucket the deployed app doesn't use.

create table public.item_pictures (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  -- An upload in the item-pictures bucket, or a picture somewhere else.
  path text,
  url text check (url ~ '^https?://'),
  -- Lowest first; the first picture is the item's thumbnail.
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint item_pictures_path_or_url check ((path is null) <> (url is null))
);

create index item_pictures_item_id_idx on public.item_pictures (item_id, position);

alter table public.item_pictures enable row level security;

create policy "Read pictures of items you can see"
  on public.item_pictures for select to authenticated
  using (public.can_view_item(item_id));

-- Only into the list's own folder, so a file can't be taken from another list.
create policy "Add pictures to items on your own or your child's list"
  on public.item_pictures for insert to authenticated
  with check (exists (
    select 1 from public.items i
    where i.id = item_id
      and public.can_edit_profile(i.profile_id)
      and (path is null or split_part(path, '/', 1) = i.profile_id::text)
  ));

create policy "Remove pictures from items on your own or your child's list"
  on public.item_pictures for delete to authenticated
  using (exists (
    select 1 from public.items i
    where i.id = item_id and public.can_edit_profile(i.profile_id)
  ));

grant select, insert, delete on public.item_pictures to authenticated;

-- At most 5 per item. Locks the item, so two saves at once can't both add the fifth.
-- Runs as the one adding: someone who can't edit the item finds nothing to lock or
-- count, and the insert policy turns them away.
create function public.limit_item_pictures()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  perform 1 from public.items where id = new.item_id for update;
  if (select count(*) from public.item_pictures where item_id = new.item_id) >= 5 then
    raise exception 'An item can have at most 5 pictures' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger limit_item_pictures
  before insert on public.item_pictures
  for each row execute function public.limit_item_pictures();

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- The app shrinks pictures before uploading (about 100-200 KB), so 2 MB is plenty.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-pictures', 'item-pictures', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Can I edit the list whose folder this is? False for anything that isn't a profile id.
create function public.can_edit_picture_folder(object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_profile(split_part(object_name, '/', 1)::uuid)
    else false
  end;
$$;

-- Public URLs need no read policy. Removing a file does: Storage reads it first.
create policy "Item pictures: list editors read"
  on storage.objects for select to authenticated
  using (bucket_id = 'item-pictures' and public.can_edit_picture_folder(name));

create policy "Item pictures: list editors upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-pictures' and public.can_edit_picture_folder(name));

create policy "Item pictures: list editors delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-pictures' and public.can_edit_picture_folder(name));

-- Uploads no item_pictures row points to: the item or picture was deleted, or the
-- item form uploaded it and then failed to save. A day old at least, so a save
-- that's still busy keeps its files. For the clean-pictures function only.
create function public.orphaned_item_pictures()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'item-pictures'
    and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.item_pictures p where p.path = o.name)
  order by o.created_at
  limit 1000;
$$;

revoke execute on function public.orphaned_item_pictures() from public, anon, authenticated;
grant execute on function public.orphaned_item_pictures() to service_role;
