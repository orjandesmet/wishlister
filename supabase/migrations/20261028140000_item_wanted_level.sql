-- How much the owner wants an item (#117): 1 "I want this" (every item, the
-- existing ones too), 2 "I really want this", 3 "I really, really, REALLY want
-- this". Others can sort on it ("Most wanted first").
--
-- Backwards compatible: a new column with a default, so the deployed app keeps
-- adding items without knowing about it.
alter table public.items
  add column wanted_level smallint not null default 1 check (wanted_level between 1 and 3);

-- Updates are granted per column (see 20261016120000_table_grants.sql).
grant update (wanted_level) on public.items to authenticated;
