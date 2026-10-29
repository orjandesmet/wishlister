-- Compact item cards: smaller cards on every list, the full card one tap away. Saved on the
-- profile so every device follows it. A new column with a default keeps older app versions working.

alter table public.profiles
  add column compact_cards boolean not null default false;

grant update (compact_cards) on public.profiles to authenticated;
