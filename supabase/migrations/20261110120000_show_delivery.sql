-- Whether item cards show the "Delivered" tick next to what you bought. Off by default; people
-- who want it switch it on under "What I bought" on the settings page.
-- Saved on the profile so every device follows it. A new column with a default keeps older app
-- versions working.

alter table public.profiles
  add column show_delivery boolean not null default false;

grant update (show_delivery) on public.profiles to authenticated;
