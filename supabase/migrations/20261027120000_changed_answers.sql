-- A changed answer is emailed too (#100).
--
-- Until now only the first answer to a question was emailed to the one who asked;
-- when the owner changed it later, they never heard. Now every change that is saved
-- after an email went out sends a new one ("changed" in claim_question_notices()).
-- Taking an answer back sends nothing; answering again afterwards counts as a change.
--
-- Backwards compatible: one column with a default, and the same function signatures.

alter table public.item_questions
  -- An answer to this question was emailed before: the next email says it changed.
  add column answer_changed boolean not null default false;

create or replace function public.answer_question(target_question uuid, answer text)
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

  -- Saving the same answer again changes nothing, and sends nothing.
  update public.item_questions q
  set answer = text_,
      answered_by = case when text_ is null then null else public.my_profile_id() end,
      answered_at = case when text_ is null then null else now() end,
      -- A new answer after an email went out: mail again, as a change.
      answer_changed = q.answer_changed or (text_ is not null and q.answer_mailed_at is not null),
      answer_mailed_at = case when text_ is not null then null else q.answer_mailed_at end
  where q.id = target_question
    and q.answer is distinct from text_;
end;
$$;

-- Same as in 20261026160000_item_questions.sql, except that an answer that was
-- emailed before comes back as kind 'changed' instead of 'answer'.
create or replace function public.claim_question_notices()
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
      q.answer_changed, p.new_question, p.new_answer
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
    -- New or changed answers: the one who asked.
    select case when c.answer_changed then 'changed' else 'answer' end, c.id, c.item_id, c.question, c.answer, c.answered_by, false, ap.account_id
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
