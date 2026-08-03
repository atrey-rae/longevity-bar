import { NextResponse, type NextRequest } from "next/server";

import { bezpecnyNext } from "@/lib/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Návrat z Google OAuth — výměna `code` za session (PKCE).
 * Cookies zapisuje serverový klient přes cookies() v route handleru.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = bezpecnyNext(searchParams.get("next"));

  // V produkci preferuj nakonfigurovanou doménu (kvůli proxy hlavičkám).
  const base = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/+$/, "");

  if (searchParams.get("error")) {
    return NextResponse.redirect(`${base}/prihlaseni?chyba=oauth`);
  }

  if (code) {
    try {
      const supabase = await createServerSupabase();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${base}${next}`);
      }
    } catch {
      // spadne do redirectu s chybou níže
    }
  }

  return NextResponse.redirect(`${base}/prihlaseni?chyba=oauth`);
}
