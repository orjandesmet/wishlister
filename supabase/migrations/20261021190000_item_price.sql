-- The price of an item, read from the linked page when a link is pasted into
-- quick add, and editable in the item form. Both or neither: an amount without
-- its currency can't be shown or converted. The app converts to the viewer's
-- currency when it shows the price; the stored price is the one on the page.
alter table public.items
  add column price numeric(12, 2) check (price > 0),
  add column price_currency text check (price_currency ~ '^[A-Z]{3}$'),
  add constraint items_price_with_currency check ((price is null) = (price_currency is null));

-- Updates are granted per column (see 20261016120000_table_grants.sql).
grant update (price, price_currency) on public.items to authenticated;
