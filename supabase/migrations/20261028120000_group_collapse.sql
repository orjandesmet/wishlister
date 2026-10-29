-- Collapse members on the groups page (#124): whether every group card starts collapsed
-- ('always'), or each one the way you left it ('remember', kept in the browser's localStorage).
-- A new column with a default keeps older app versions working.

alter table public.profiles
  add column group_collapse text not null default 'remember'
    check (group_collapse in ('always', 'remember'));

grant update (group_collapse) on public.profiles to authenticated;
