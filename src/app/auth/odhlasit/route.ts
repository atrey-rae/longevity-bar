import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Odhlášení (POST z formuláře v patičce karty). */
export async function POST(request: NextRequest) {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  ).replace(/\/+$/, "");

  try {
    const supabase = await createServerSupabase();
    // `scope: "local"` odhlásí JEN tohle zařízení. Výchozí "global" zneplatní
    // refresh tokeny všech zařízení uživatele — na sdíleném telefonu u stánku
    // by jedno odhlášení vyhodilo člověka i z jeho vlastního mobilu.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // i tak přesměrujeme na přihlášení
  }

  return NextResponse.redirect(`${base}/prihlaseni`, { status: 303 });
}
