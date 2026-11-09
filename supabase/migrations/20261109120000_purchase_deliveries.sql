-- "Delivered" ticks on your own purchases (#161), for the overview of everything
-- you bought on the settings page.
--
-- A table of its own instead of a column on purchases: other group members can read
-- purchases (that's how they see "Someone bought this"), but whether the parcel came
-- is only the buyer's business. Here every row is visible to its buyer alone.
--
-- A row belongs to a purchase, so undoing "I bought this" (or the item being deleted
-- for good) removes the tick too.

create table public.purchase_deliveries (
  item_id uuid primary key references public.purchases (item_id) on delete cascade,
  delivered_at timestamptz not null default now()
);

alter table public.purchase_deliveries enable row level security;

-- Is this purchase mine? Security definer so it doesn't depend on who else may read
-- purchases.
create function public.is_my_purchase(target_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.purchases p
    where p.item_id = target_item and p.bought_by = public.my_profile_id()
  );
$$;

create policy "Read the delivered ticks on your purchases"
  on public.purchase_deliveries for select to authenticated
  using (public.is_my_purchase(item_id));

create policy "Tick your purchases as delivered"
  on public.purchase_deliveries for insert to authenticated
  with check (public.is_my_purchase(item_id));

create policy "Untick your purchases"
  on public.purchase_deliveries for delete to authenticated
  using (public.is_my_purchase(item_id));

grant select, delete on public.purchase_deliveries to authenticated;
grant insert (item_id) on public.purchase_deliveries to authenticated;

-- The helper is for the policies above.
revoke execute on function public.is_my_purchase(uuid) from public, anon;
grant execute on function public.is_my_purchase(uuid) to authenticated;
