-- The picture of a linked page (its og:image), found when a link is pasted into
-- quick add. Stored for later: the app doesn't show item pictures yet.
alter table public.items add column image_url text;
