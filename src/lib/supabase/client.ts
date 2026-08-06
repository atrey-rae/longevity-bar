"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { SUPABASE_COOKIE_OPTIONS } from "./cookies";
import { supabaseAnonKey, supabaseUrl } from "./env";

type BrowserKlient = ReturnType<typeof createBrowserClient<Database>>;

let cached: BrowserKlient | null = null;

/**
 * Prohlížečový klient (anon klíč, session v cookies).
 * Vytváří se lazy až při prvním použití — nikdy na úrovni modulu,
 * aby build/SSR neselhal bez env proměnných.
 *
 * Tímhle klientem vzniká session po ověření PINu (`verifyOtp`) i po návratu
 * z Googlu. Zápis cookies si tady řídí `@supabase/ssr` sám přes
 * `document.cookie`, takže jediná páka na jejich životnost je `cookieOptions`
 * — vlastní `setAll` by tu naopak rozbil sdílení session se serverem.
 */
export function getBrowserSupabase(): BrowserKlient {
  if (cached) return cached;
  cached = createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
  });
  return cached;
}
