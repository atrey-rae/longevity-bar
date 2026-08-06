import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_COOKIE_OPTIONS, dlouhodobaCookie } from "@/lib/supabase/cookies";

/**
 * Obnova Supabase session při každém requestu (pattern @supabase/ssr).
 * Bez toho by se access token neobnovoval a uživatel by po hodině vypadl.
 *
 * Middleware je JEDINÉ místo, kde se refresh token dá bezpečně otočit a rovnou
 * zapsat zpátky do cookies — v server komponentě zápis cookies vyhodí výjimku
 * a `server.ts` ji polyká. Proto musí `matcher` níž pokrývat úplně všechny
 * stránky, po kterých se člověk pohybuje (/darek, /kredit, /kviz/*, /odmeny).
 * Kdyby některá vypadla, uživatel by na ní o refresh přišel a po návratu
 * za týden by ho appka odhlásila.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Bez konfigurace jen propustíme request dál (build / první spuštění).
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, dlouhodobaCookie(options));
        }
      },
    },
  });

  // Nutné volání — obnoví token a zapíše nové cookies.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Všechno kromě statických souborů a ikon — tedy i /darek, /kredit,
     * /kviz/*, /odmeny, /vyber, /sortiment/*, /scan/*. Nic z toho odsud
     * nevyřazuj: každá vynechaná cesta je místo, kde se session neobnoví.
     * Hlídá to `scripts/check-bar-auth.ts`.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
