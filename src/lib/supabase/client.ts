"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { supabaseAnonKey, supabaseUrl } from "./env";

type BrowserKlient = ReturnType<typeof createBrowserClient<Database>>;

let cached: BrowserKlient | null = null;

/**
 * Prohlížečový klient (anon klíč, session v cookies).
 * Vytváří se lazy až při prvním použití — nikdy na úrovni modulu,
 * aby build/SSR neselhal bez env proměnných.
 */
export function getBrowserSupabase(): BrowserKlient {
  if (cached) return cached;
  cached = createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
  return cached;
}
