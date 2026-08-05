import { NextResponse, type NextRequest } from "next/server";

import { bezpecnyNext } from "@/lib/navigation";
import { verifyPhoneCode } from "@/lib/phone-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { challengeId?: unknown; phone?: unknown; code?: unknown; next?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }
  if (typeof body.challengeId !== "string" || typeof body.phone !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "Kód nesedí nebo vypršel." }, { status: 400 });
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
        { error: result.reason === "attempts" ? "Příliš mnoho pokusů. Nech si poslat nový kód." : "Kód nesedí nebo vypršel." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { tokenHash: result.tokenHash, next: result.next },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Ověření se nepodařilo. Zkus to znovu." }, { status: 503 });
  }
}
