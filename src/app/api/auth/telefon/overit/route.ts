import { NextResponse, type NextRequest } from "next/server";

import { getT } from "@/lib/i18n/server";
import { bezpecnyNext } from "@/lib/navigation";
import { verifyPhoneCode } from "@/lib/phone-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { t } = await getT();
  let body: { challengeId?: unknown; phone?: unknown; code?: unknown; next?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: t.chyby.neplatnyPozadavek }, { status: 400 });
  }
  if (typeof body.challengeId !== "string" || typeof body.phone !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: t.chyby.kodNesedi }, { status: 400 });
  }
  try {
    const result = await verifyPhoneCode({
      challengeId: body.challengeId,
      rawPhone: body.phone,
      code: body.code,
      next: bezpecnyNext(typeof body.next === "string" ? body.next : "/"),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason === "attempts" ? t.chyby.prilisMnohoPokusu : t.chyby.kodNesedi },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { tokenHash: result.tokenHash, next: result.next },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: t.chyby.overeniSelhalo }, { status: 503 });
  }
}
