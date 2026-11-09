/// <reference types="node" />
// Emails about anonymous questions on items (#100), right away: the list's owner
// (or a child's parents) about a new question, the one who asked about the answer.
//
// POST /.netlify/functions/notify-questions with the caller's access token as
// "Authorization: Bearer …". The app calls it after asking or answering; the
// database decides who to mail. Sending is idempotent, so calling it when there's
// nothing to send is fine. The evening digest (send-digests) also sends what's
// left, in case this call failed.
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { noticeHandler } from "../lib/notices.ts";
import { questionNotices } from "../lib/questionNotices.ts";

export default noticeHandler(questionNotices);
