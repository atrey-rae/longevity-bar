import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Serverový klient s identitou přihlášeného uživatele (anon klíč + cookies).
 * Používá se JEN pro čtení dat pod RLS a pro zjištění přihlášeného uživatele.
 * Veškeré zápisy herní logiky jdou přes `createAdminClient()`.
 */
export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Volání ze server komponenty — cookies nelze zapisovat.
          // Obnovu session zajišťuje middleware, takže to nevadí.
        }
      },
    },
  });
}

/** Přihlášený uživatel (ověřeno u Supabase Auth), nebo null. */
export async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
