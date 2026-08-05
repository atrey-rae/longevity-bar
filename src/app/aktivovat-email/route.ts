import { NextResponse, type NextRequest } from "next/server";

import { activateEmail } from "@/lib/email-verification-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await activateEmail(token).catch(() => false);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
  return NextResponse.redirect(`${base}/odmeny?email=${ok ? "overen" : "chyba"}`);
}
