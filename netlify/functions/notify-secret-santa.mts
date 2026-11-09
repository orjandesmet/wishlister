/// <reference types="node" />
// Emails who someone drew in a Secret Santa (#102), right away: the givers who
// haven't heard yet. The app calls it after a manager removed someone from a draw,
// which gives the person who drew them a new person (start-secret-santa mails the
// first draw itself).
//
// POST /.netlify/functions/notify-secret-santa with the caller's access token as
// "Authorization: Bearer …". The database decides who is mailed. Sending is
// idempotent, so calling it when there's nothing to send is fine. The evening digest
// (send-digests) also sends what's left, in case this call failed.
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { noticeHandler } from "../lib/notices.ts";
import { secretSantaNotices } from "../lib/secret-santa/secretSantaNotices.ts";

export default noticeHandler(secretSantaNotices);
