/// <reference types="node" />
// Emails buyers right away when the list's owner removed something they bought
// (#89), so they can still cancel their order.
//
// POST /.netlify/functions/notify-removed with the caller's access token as
// "Authorization: Bearer …". The app calls it after every removal: the owner
// can't know whether anything was bought, and the database decides who to mail.
// Sending is idempotent, so calling it when there's nothing to send is fine. The
// evening digest (send-digests) also sends what's left, in case this call failed.
//
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// RESEND_API_KEY and MAIL_FROM.
import { noticeHandler } from "../lib/notices.ts";
import { removalNotices } from "../lib/removalNotices.ts";

export default noticeHandler(removalNotices);
