-- Anonymous questions about an item (#100).
--
-- Anyone who sees an item on someone else's list can ask a question about it
-- ("which size?"). Nobody learns who asked: not the list's owner, not the other
-- members. The owner, or any parent of a child's list, answers; answers show who
-- gave them. The owner (and every parent) gets an email about a new question, and
-- only the one who asked gets an email about the answer
-- (netlify/functions/notify-questions.mts).
--
-- * Questions belong to the item, not a group: everyone who sees the item sees them.
-- * They stay when the item is edited or bought, but once it's bought nobody can
--   ask a new one. They go when the item is removed.
-- * One answer per question, which its editors can change. No threads.
--
-- Who asked is kept only to send them the answer, so the table has no grants: the
-- app reads and writes it through the functions below, which never return it.
--
-- Backwards compatible: a new table the deployed app doesn't use.

create table public.item_questions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  -- Never shown to anyone. Only for the answer's email.
  asked_by uuid references public.profiles (id) on delete set null,
  question text not null check (char_length(question) between 1 and 500),
  answer text check (char_length(answer) between 1 and 1000),
  answered_by uuid references public.profiles (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  -- When the emails went out (or are going out): see claim_question_notices().
  question_mailed_at timestamptz,
  answer_mailed_at timestamptz,
  constraint item_questions_answered check ((answer is null) = (answered_at is null))
);

create index item_questions_item_id_idx on public.item_questions (item_id, created_at);

-- No policies and no grants: only the functions below get in.
alter table public.item_questions enable row level security;

-- ---------------------------------------------------------------------------
-- Reading, asking, answering
-- ---------------------------------------------------------------------------

-- The questions on these items that you may see, oldest first. `mine` tells you
-- which ones you asked yourself; nobody else learns that.
create function public.get_item_questions(item_ids uuid[])
returns table (
  id uuid,
  item_id uuid,
  question text,
  answer text,
  answerer_name text,
  answered_at timestamptz,
  created_at timestamptz,
  mine boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    q.id,
    q.item_id,
    q.question,
    q.answer,
    ap.display_name,
    q.answered_at,
    q.created_at,
    q.asked_by is not distinct from public.my_profile_id() and q.asked_by is not null
  from public.item_questions q
  left join public.profiles ap on ap.id = q.answered_by
  where q.item_id = any (item_ids)
    and public.can_view_item(q.item_id)
  order by q.created_at, q.id;
$$;

-- Asks a question about an item on someone else's list. Not on your own (or your
-- child's) list, and not once the item is bought.
create function public.ask_question(target_item uuid, question text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  list uuid;
  removed timestamptz;
  asker uuid := public.my_profile_id();
  text_ text := trim(question);
  new_id uuid;
begin
  select i.profile_id, i.removed_at into list, removed
  from public.items i
  where i.id = target_item and public.can_view_item(i.id);
  if list is null or asker is null then
    raise exception 'Item not found' using errcode = 'no_data_found';
  end if;
  if public.can_edit_profile(list) then
    raise exception 'You can''t ask questions about your own list'
      using errcode = 'insufficient_privilege';
  end if;
  if removed is not null or exists (select 1 from public.purchases where item_id = target_item) then
    raise exception 'This item is already bought' using errcode = 'check_violation';
  end if;
  if text_ = '' then
    raise exception 'The question is empty' using errcode = 'check_violation';
  end if;

  insert into public.item_questions (item_id, asked_by, question)
  values (target_item, asker, text_)
  returning id into new_id;
  return new_id;
end;
$$;

-- Answers a question, or changes the answer, on your own or your child's list. An
-- empty answer takes it back.
create function public.answer_question(target_question uuid, answer text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  list uuid;
  text_ text := nullif(trim(answer), '');
begin
  select i.profile_id into list
  from public.item_questions q
  join public.items i on i.id = q.item_id
  where q.id = target_question;
  if list is null or not public.can_edit_profile(list) then
    raise exception 'Question not found' using errcode = 'no_data_found';
  end if;

  update public.item_questions q
  set answer = text_,
      answered_by = case when text_ is null then null else public.my_profile_id() end,
      answered_at = case when text_ is null then null else now() end
  where q.id = target_question;
end;
$$;

-- ---------------------------------------------------------------------------
-- Removing an item removes its questions
-- ---------------------------------------------------------------------------

-- Deleting cascades. A bought item that is removed stays for its buyer
-- (20261025120000_removed_bought_items.sql), but its questions go all the same.
create function public.delete_removed_item_questions()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.item_questions where item_id = new.id;
  return new;
end;
$$;

create trigger delete_removed_item_questions
  after update of removed_at on public.items
  for each row
  when (old.removed_at is null and new.removed_at is not null)
  execute function public.delete_removed_item_questions();

-- ---------------------------------------------------------------------------
-- The emails
-- ---------------------------------------------------------------------------

-- New questions and answers nobody was mailed about yet, marked as mailed, so two
-- calls at the same time don't both send. Hand them back with
-- release_question_notices() when sending fails.
--
-- A question goes to the list's owner, if they sign in, and to every parent of a
-- child's list. An answer goes to the one who asked. Changing an answer later
-- sends nothing.
create function public.claim_question_notices()
returns table (
  kind text,
  question_id uuid,
  item_id uuid,
  item_name text,
  list_id uuid,
  list_name text,
  question text,
  answer text,
  answerer_name text,
  -- A question about the recipient's own list, not their child's.
  own_list boolean,
  email text,
  locale text
)
language sql security definer set search_path = ''
as $$
  with pending as (
    select
      q.id,
      q.question_mailed_at is null as new_question,
      q.answered_at is not null and q.answer_mailed_at is null as new_answer
    from public.item_questions q
    where q.question_mailed_at is null
      or (q.answered_at is not null and q.answer_mailed_at is null)
    for update skip locked
  ),
  claimed as (
    update public.item_questions q
    set question_mailed_at = case when p.new_question then now() else q.question_mailed_at end,
        answer_mailed_at = case when p.new_answer then now() else q.answer_mailed_at end
    from pending p
    where q.id = p.id
    returning q.id, q.item_id, q.question, q.answer, q.answered_by, q.asked_by,
      p.new_question, p.new_answer
  ),
  recipients as (
    -- New questions: the owner and the parents.
    select 'question' as kind, c.id, c.item_id, c.question, null::text as answer,
      null::uuid as answered_by, true as own_list, lp.account_id
    from claimed c
    join public.items i on i.id = c.item_id
    join public.profiles lp on lp.id = i.profile_id
    where c.new_question and lp.account_id is not null
    union
    select 'question', c.id, c.item_id, c.question, null, null, false, mp.account_id
    from claimed c
    join public.items i on i.id = c.item_id
    join public.profile_managers pm on pm.profile_id = i.profile_id
    join public.profiles mp on mp.id = pm.manager_profile_id
    where c.new_question and mp.account_id is not null
    union
    -- New answers: the one who asked.
    select 'answer', c.id, c.item_id, c.question, c.answer, c.answered_by, false, ap.account_id
    from claimed c
    join public.profiles ap on ap.id = c.asked_by
    where c.new_answer and ap.account_id is not null
  )
  select
    r.kind,
    r.id,
    r.item_id,
    i.name,
    i.profile_id,
    lp.display_name,
    r.question,
    r.answer,
    bp.display_name,
    r.own_list,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'locale', 'en')
  from recipients r
  join public.items i on i.id = r.item_id
  join public.profiles lp on lp.id = i.profile_id
  left join public.profiles bp on bp.id = r.answered_by
  join auth.users u on u.id = r.account_id
  where u.email is not null
  order by r.kind, r.id;
$$;

create function public.release_question_notices(question_ids uuid[], answer_ids uuid[])
returns void
language sql security definer set search_path = ''
as $$
  update public.item_questions
  set question_mailed_at = case when id = any (question_ids) then null else question_mailed_at end,
      answer_mailed_at = case when id = any (answer_ids) then null else answer_mailed_at end
  where id = any (question_ids) or id = any (answer_ids);
$$;

revoke execute on function
  public.get_item_questions(uuid[]),
  public.ask_question(uuid, text),
  public.answer_question(uuid, text),
  public.delete_removed_item_questions(),
  public.claim_question_notices(),
  public.release_question_notices(uuid[], uuid[])
from public, anon, authenticated;

grant execute on function
  public.get_item_questions(uuid[]),
  public.ask_question(uuid, text),
  public.answer_question(uuid, text)
to authenticated;

grant execute on function
  public.claim_question_notices(),
  public.release_question_notices(uuid[], uuid[])
to service_role;
