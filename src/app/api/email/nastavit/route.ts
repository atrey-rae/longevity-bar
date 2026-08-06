import { NextResponse, type NextRequest } from "next/server";

import { sendActivationEmail } from "@/lib/email-verification-server";
import { getT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { t } = await getT();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: t.chyby.neprihlasen }, { status: 401 });
  let email = "";
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === "string" ? body.email : "";
  } catch {
    return NextResponse.json({ error: t.chyby.neplatnyPozadavek }, { status: 400 });
  }
  try {
    const result = await sendActivationEmail(user.id, email);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : t.emailOnboarding.chyba }, { status: error instanceof TypeError ? 400 : 503 });
  }
}
