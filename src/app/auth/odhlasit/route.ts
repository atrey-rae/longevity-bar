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
    await supabase.auth.signOut();
  } catch {
    // i tak přesměrujeme na přihlášení
  }

  return NextResponse.redirect(`${base}/prihlaseni`, { status: 303 });
}
