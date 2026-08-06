import { NextResponse, type NextRequest } from "next/server";

import { normalizeLang } from "@/lib/i18n/lang";
import { getT } from "@/lib/i18n/server";
import { requestPhoneCode } from "@/lib/phone-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { lang: langRequestu, t } = await getT();
  let phone = "";
  // Jazyk SMS bere formulář z rozhraní, ve kterém host právě je. Cookie/hlavička
  // requestu je jen záloha, kdyby pole chybělo (starší klient v cache).
  let lang = langRequestu;
  try {
    const body = (await request.json()) as { phone?: unknown; lang?: unknown };
    phone = typeof body.phone === "string" ? body.phone : "";
    lang = normalizeLang(body.lang) ?? langRequestu;
  } catch {
    return NextResponse.json({ error: t.chyby.neplatnyPozadavek }, { status: 400 });
  }
  try {
    const xff = request.headers.get("x-forwarded-for");
    const ip = request.headers.get("x-vercel-forwarded-for")
      ?? (process.env.TRUST_CF_HEADERS === "1" ? request.headers.get("cf-connecting-ip") : null)
      ?? xff?.split(",").map((value) => value.trim()).filter(Boolean).at(-1)
      ?? "unknown";
    const result = await requestPhoneCode(phone, ip, lang);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof TypeError ? t.chyby.zadejPlatnyTelefon : t.chyby.kodNeodeslan;
    return NextResponse.json({ error: message }, { status: error instanceof TypeError ? 400 : 503 });
  }
}
