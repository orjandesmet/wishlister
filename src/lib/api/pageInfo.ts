import { supabase } from "../supabase.ts";

/** An amount in a currency, as an ISO 4217 code ("EUR"). */
export type Price = { amount: number; currency: string };

export type PageInfo = { title: string | null; image: string | null; price: Price | null };

const NOTHING: PageInfo = { title: null, image: null, price: null };

/**
 * The name, picture and price of a linked page, read by the page-info Netlify
 * function (browsers can't read other sites' pages). Never throws and gives up
 * after a few seconds: a page that can't be read just gives nulls.
 */
export async function getPageInfo(url: string): Promise<PageInfo> {
  try {
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/.netlify/functions/page-info", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(9500),
    });
    if (!response.ok) return NOTHING;
    const info = (await response.json()) as Partial<PageInfo>;
    return { title: info.title || null, image: info.image || null, price: info.price ?? null };
  } catch {
    return NOTHING;
  }
}
