import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 *
 * Only the publishable key ever reaches the browser; row-level security is what
 * protects the data, not the secrecy of this key. Catalog tables are read-only
 * to everyone, and deck tables are scoped to the signed-in owner.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured -- set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
  }

  client ??= createBrowserClient(url, key);
  return client;
}

/** True when the app has enough config to talk to Supabase at all. */
export const supabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
