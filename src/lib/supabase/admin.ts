import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

type AdminKlient = ReturnType<typeof createClient<Database>>;

let cached: AdminKlient | null = null;

/**
 * SERVICE-ROLE klient — obchází RLS.
 *
 * !!! Nikdy neimportovat do client komponenty. Používá se výhradně
 * v route handlerech a server actions, kde se vynucují pravidla hry
 * (cooldown, denní limit, platnost tokenu dne, výdej odměny).
 *
 * Vytváří se lazy, aby build prošel i bez klíčů.
 */
export function createAdminClient(): AdminKlient {
  if (cached) return cached;
  cached = createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}
