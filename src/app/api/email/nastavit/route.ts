import { NextResponse, type NextRequest } from "next/server";

import { sendActivationEmail } from "@/lib/email-verification-server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nejsi přihlášený." }, { status: 401 });
  let email = "";
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === "string" ? body.email : "";
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }
  try {
    const result = await sendActivationEmail(user.id, email);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "E-mail se nepodařilo odeslat." }, { status: error instanceof TypeError ? 400 : 503 });
  }
}
