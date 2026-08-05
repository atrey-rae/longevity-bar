import { NextResponse, type NextRequest } from "next/server";

import { requestPhoneCode } from "@/lib/phone-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let phone = "";
  try {
    const body = (await request.json()) as { phone?: unknown };
    phone = typeof body.phone === "string" ? body.phone : "";
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }
  try {
    const xff = request.headers.get("x-forwarded-for");
    const ip = request.headers.get("x-vercel-forwarded-for")
      ?? (process.env.TRUST_CF_HEADERS === "1" ? request.headers.get("cf-connecting-ip") : null)
      ?? xff?.split(",").map((value) => value.trim()).filter(Boolean).at(-1)
      ?? "unknown";
    const result = await requestPhoneCode(phone, ip);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof TypeError ? "Zadej platné telefonní číslo." : "Kód se teď nepodařilo odeslat. Zkus to za chvíli.";
    return NextResponse.json({ error: message }, { status: error instanceof TypeError ? 400 : 503 });
  }
}
