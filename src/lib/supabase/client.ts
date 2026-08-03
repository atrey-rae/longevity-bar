"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";
import { supabaseAnonKey, supabaseUrl } from "./env";

let cached: SupabaseClient<Database> | null = null;

/**
 * Prohlížečový klient (anon klíč, session v cookies).
 * Vytváří se lazy až při prvním použití — nikdy na úrovni modulu,
 * aby build/SSR neselhal bez env proměnných.
 */
export function getBrowserSupabase(): SupabaseClient<Database> {
  if (cached) return cached;
  cached = createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
  return cached;
}
