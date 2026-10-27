-- Local development data, loaded by `supabase db reset` after the migrations.
-- Never runs against production.
--
-- Sign in as any of these with the one-time code from Mailpit (http://127.0.0.1:54324):
--   alice@example.com  manager of "Family", parent of Sam
--   bob@example.com    member of "Family", bought Alice's headphones
--   carol@example.com  member of "Family" and manager of "Friends", in a running Secret Santa with Bob
-- or, with VITE_DEMO=true, with the demo buttons (password `wishlister-demo`, same as
-- demoPassword in src/lib/demo.ts). The demo site uses this seed too, via supabase/demo/reset.sql.

-- Accounts. The on_auth_account_created trigger gives each one a profile.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('wishlister-demo', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', name, 'locale', locale),
  now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'alice@example.com', 'Alice', 'en'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'bob@example.com', 'Bob', 'en'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'carol@example.com', 'Carol', 'nl')
) as u (id, email, name, locale);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users;

-- Sam is Alice's child: a profile without an account.
insert into public.profiles (id, display_name)
values ('b0000000-0000-0000-0000-000000000001', 'Sam');

insert into public.profile_managers (profile_id, manager_profile_id)
select 'b0000000-0000-0000-0000-000000000001', id
from public.profiles where account_id = 'a0000000-0000-0000-0000-000000000001';

insert into public.groups (id, name) values
  ('c0000000-0000-0000-0000-000000000001', 'Family'),
  ('c0000000-0000-0000-0000-000000000002', 'Friends');

insert into public.group_members (group_id, profile_id, role)
select g, p.id, r
from (values
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'manager'),
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'member'),
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'member'),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'manager'),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'member')
) as m (g, account, r)
join public.profiles p on p.account_id = m.account;

insert into public.group_members (group_id, profile_id)
values ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001');

-- Christmas this year, or next year once it has passed.
insert into public.occasions (id, group_id, name, date)
select 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
  'Christmas ' || extract(year from christmas), christmas
from (
  select case
    when make_date(extract(year from current_date)::int, 12, 25) >= current_date
      then make_date(extract(year from current_date)::int, 12, 25)
    else make_date(extract(year from current_date)::int + 1, 12, 25)
  end as christmas
) as c;

insert into public.items (id, profile_id, name, url, category)
select i.id, p.id, i.name, i.url, i.category
from (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Noise-cancelling headphones', null, 'Tech'),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'A good cookbook', null, 'Books'),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'Running socks', null, 'Sports'),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'Board game', 'https://example.com/board-game', 'Games')
) as i (id, account, name, url, category)
join public.profiles p on p.account_id = i.account;

insert into public.items (id, profile_id, name, category) values
  ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'LEGO set', 'Toys'),
  ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Picture book', 'Books');

-- Bob's socks only show in Friends, not in Family.
update public.items set visible_in_all_groups = false where id = 'e0000000-0000-0000-0000-000000000003';
insert into public.item_groups (item_id, group_id)
values ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002');

-- Bob bought Alice's headphones for Christmas (which also makes him follow her list).
insert into public.purchases (item_id, bought_by, occasion_id)
select 'e0000000-0000-0000-0000-000000000001', id, 'd0000000-0000-0000-0000-000000000001'
from public.profiles where account_id = 'a0000000-0000-0000-0000-000000000002';

-- Secret Santa (#102). Last Christmas, Alice drew Bob, Bob drew Carol and Carol drew Alice, so
-- Alice (manager of "Family") can start one for this Christmas and sees nobody draw the same
-- person again. "Friends" has one running: Carol and Bob drew each other, so each sees a ribbon on
-- the other's list and follows it.
insert into public.occasions (id, group_id, name, date)
values
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
    'Christmas ' || (extract(year from current_date)::int - 1),
    make_date(extract(year from current_date)::int - 1, 12, 25)),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002',
    'Secret Santa night', current_date + 30);

insert into public.secret_santas (id, group_id, occasion_id, created_by, created_at)
select draw.id, draw.group_id, draw.occasion_id, p.id, draw.created_at
from (values
  ('f0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid,
    now() - interval '1 year'),
  ('f0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid,
    'd0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid,
    now())
) as draw (id, group_id, occasion_id, account, created_at)
join public.profiles p on p.account_id = draw.account;

-- Past draws are mailed already; the running one is too (the seed sends no emails).
insert into public.secret_santa_pairs (secret_santa_id, giver_profile_id, recipient_profile_id, mailed_at)
select pair.draw, giver.id, recipient.id, now()
from (values
  ('f0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('f0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid),
  ('f0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('f0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('f0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid)
) as pair (draw, giver_account, recipient_account)
join public.profiles giver on giver.account_id = pair.giver_account
join public.profiles recipient on recipient.account_id = pair.recipient_account;

-- Everyone follows the person they drew in the running draw until its occasion.
insert into public.list_follows (follower_id, list_id, until)
select pr.giver_profile_id, pr.recipient_profile_id, o.date
from public.secret_santa_pairs pr
join public.secret_santas s on s.id = pr.secret_santa_id
join public.occasions o on o.id = s.occasion_id
where s.id = 'f0000000-0000-0000-0000-000000000002'
on conflict (follower_id, list_id) do nothing;
