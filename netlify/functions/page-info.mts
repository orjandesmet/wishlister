/// <reference types="node" />
// Looks up the name, picture and price of a page linked from quick add or the item form.
//
// POST /.netlify/functions/page-info with { url } and the user's access token as
// "Authorization: Bearer …". Answers { title, image, price }, any of which can be null,
// plus isImage: true when the link is a picture itself.
// Browsers can't read other sites' pages (CORS), so the app asks this function.
// Shops that block it are looked up through Microlink; set MICROLINK_API_KEY in
// Netlify to use a Microlink plan instead of the free 50 links a day.
// bol.com blocks both, so its product links go through ReefAPI when
// REEFAPI_API_KEY is set (2 credits per product).
import { isFetchableUrl, lookUpPage } from "../lib/pageInfo.ts";
import { envValue, message, requireEnv } from "../lib/respond.ts";
import { signedInCaller } from "../lib/supabase.ts";

export default async (request: Request) => {
  if (request.method !== "POST") return message(405, "Method not allowed");

  const read = requireEnv("VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY");
  if ("missing" in read) {
    return message(500, "Supabase isn't configured", `missing ${read.missing}`);
  }
  const url = read.env.VITE_SUPABASE_URL;
  const publishableKey = read.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Signed-in users only, so this isn't an open proxy for anyone on the internet.
  const signedIn = await signedInCaller(request, { url, publishableKey });
  if ("response" in signedIn) return signedIn.response;

  const { url: pageUrl } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!pageUrl || !isFetchableUrl(pageUrl)) {
    return message(
      400,
      "A public http(s) url is required",
      `got ${JSON.stringify(pageUrl ?? null)}`,
    );
  }

  return Response.json(
    await lookUpPage(pageUrl, {
      microlink: envValue("MICROLINK_API_KEY"),
      reefapi: envValue("REEFAPI_API_KEY"),
    }),
  );
};
