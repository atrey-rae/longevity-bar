import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/types";
import { SUPABASE_COOKIE_OPTIONS, dlouhodobaCookie } from "./cookies";
import { supabaseAnonKey, supabaseUrl } from "./env";

type ServerKlient = ReturnType<typeof createServerClient<Database>>;

/**
 * Serverový klient s identitou přihlášeného uživatele (anon klíč + cookies).
 * Používá se JEN pro čtení dat pod RLS a pro zjištění přihlášeného uživatele.
 * Veškeré zápisy herní logiky jdou přes `createAdminClient()`.
 */
export async function createServerSupabase(): Promise<ServerKlient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, dlouhodobaCookie(options));
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
