-- The Secret Santa reminder a week before the occasion (#139) was dropped before it
-- shipped. Removes what 20261030130000_secret_santa_nudge_and_reminder.sql added for
-- it: the reminded_at column and the claim/release functions.
--
-- Backwards compatible: no version of the app ever used them.

drop function if exists public.claim_secret_santa_reminders(uuid[]);
drop function if exists public.release_secret_santa_reminders(uuid[], uuid[]);

alter table public.secret_santa_pairs drop column if exists reminded_at;
