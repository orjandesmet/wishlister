/// <reference types="node" />
// Netlify Scheduled Function: once a week, deletes uploaded item pictures (#95)
// that no item uses anymore: the picture or its item was removed, or the item
// form uploaded it and then failed to save. The database can't delete files from
// Storage itself, so it only lists them (orphaned_item_pictures()).
//
// Needs VITE_SUPABASE_URL and SUPABASE_SECRET_KEY.
import { createClient } from "@supabase/supabase-js";
import { missingEnv } from "../lib/respond.ts";

const BUCKET = "item-pictures";

export default async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(`Missing ${missingEnv("VITE_SUPABASE_URL", "SUPABASE_SECRET_KEY")}`);
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("orphaned_item_pictures");
  if (error) throw new Error(`Couldn't list unused pictures: ${error.message}`);

  const paths = data as string[];
  console.log(`Unused pictures found: ${paths.length}`);
  // At most 1000 a run (the database function's limit); whatever's left goes next week.
  for (let start = 0; start < paths.length; start += 100) {
    const batch = paths.slice(start, start + 100);
    const { error: removeError } = await admin.storage.from(BUCKET).remove(batch);
    if (removeError) {
      throw new Error(
        `Couldn't delete pictures (${start} of ${paths.length} done): ${removeError.message}`,
      );
    }
  }
  console.log(`Unused pictures deleted: ${paths.length}`);
};

export const config = { schedule: "@weekly" };
