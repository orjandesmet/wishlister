-- Themes (#82): a manager can give an occasion a theme, like "christmas". From two
-- weeks before its date until the day after, the app shows that theme to the
-- group's members (unless they keep their own). Null means no theme.
--
-- The list matches `themes` in src/lib/theme.ts, minus "default". Adding a nullable
-- column keeps older app versions working.

alter table public.occasions
  add column theme text
  check (theme in ('christmas', 'sinterklaas', 'birthday'));

grant insert (theme) on public.occasions to authenticated;
grant update (theme) on public.occasions to authenticated;
