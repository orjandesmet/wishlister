-- An optional description of an item, written in markdown (bold, italic, lists,
-- links). The app renders it itself, never as HTML, so nothing here needs
-- escaping. Capped so a card stays a card.
alter table public.items
  add column description text check (char_length(description) <= 1000);

-- Updates are granted per column (see 20261016120000_table_grants.sql). image_url
-- (20261020120000_item_image_url.sql) never got its grant; the item form saves it too.
grant update (description, image_url) on public.items to authenticated;
