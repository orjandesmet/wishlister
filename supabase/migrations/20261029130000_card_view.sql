-- How item cards show on every list: 'full', or 'compact' (smaller cards, the full card one tap
-- away). Text rather than a boolean, so another view (a table) can join later. Saved on the
-- profile so every device follows it. A new column with a default keeps older app versions working.

alter table public.profiles
  add column card_view text not null default 'full'
    check (card_view in ('full', 'compact'));

grant update (card_view) on public.profiles to authenticated;

-- An earlier draft of this change used a boolean; nothing reads it.
alter table public.profiles drop column if exists compact_cards;
