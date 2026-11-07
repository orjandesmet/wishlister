/// <reference types="node" />
// Netlify Scheduled Function: touches the database once a day so the free
// Supabase project never counts as inactive (it pauses after 7 idle days).
import { missingEnv } from "../lib/respond.ts";

export default async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(`Missing ${missingEnv("VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY")}`);
  }

  const response = await fetch(`${url}/rest/v1/rpc/keepalive`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok)
    throw new Error(`Keep-alive failed: ${response.status} ${await response.text()}`);
  console.log(`Supabase keep-alive ok: ${await response.text()}`);
};

export const config = { schedule: "@daily" };
