/// <reference types="node" />
// Looks up the name, picture and price of a page someone pasted into quick add.
//
// POST /.netlify/functions/page-info with { url } and the user's access token as
// "Authorization: Bearer …". Answers { title, image, price }, any of which can be null.
// Browsers can't read other sites' pages (CORS), so the app asks this function.
// Shops that block it are looked up through Microlink; set MICROLINK_API_KEY in
// Netlify to use a Microlink plan instead of the free 50 links a day.
import { createClient } from "@supabase/supabase-js";
import { isFetchableUrl, lookUpPage } from "../lib/pageInfo.ts";

export default async (request: Request) => {
  if (request.method !== "POST") return message(405, "Method not allowed");

  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return message(500, "Supabase isn't configured");

  // Signed-in users only, so this isn't an open proxy for anyone on the internet.
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return message(401, "Not signed in");
  const supabase = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) return message(401, "Not signed in");

  const { url: pageUrl } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!pageUrl || !isFetchableUrl(pageUrl)) return message(400, "A public http(s) url is required");

  return Response.json(await lookUpPage(pageUrl, process.env.MICROLINK_API_KEY));
};

function message(status: number, text: string) {
  return Response.json({ message: text }, { status });
}
