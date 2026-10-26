-- Seasonal themes (#82): the app dresses up for Sinterklaas, Christmas, New Year, Easter,
-- Halloween and 1 March by itself. This is the one setting: whether you want that.
-- On by default; a new column with a default keeps older app versions working.

alter table public.profiles
  add column seasonal_themes boolean not null default true;

grant update (seasonal_themes) on public.profiles to authenticated;
