import { NextResponse, type NextRequest } from "next/server";

import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import { vydatObjednavku } from "@/lib/healing-credit";
import { getT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Výdej objednávky z kreditu u baru (obsluha podrží 3 s na telefonu hosta).
 *
 * Telefon jde ze session, `orderId` z těla. Že objednávka patří tomuhle
 * hostovi, si navíc ověříme proti jeho stavu — bridge tak nikdy nedostane
 * cizí `orderId` z ručně poslaného requestu.
 */
export async function POST(request: NextRequest) {
  const { lang, t } = await getT();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { status: "unauthorized", zprava: t.chyby.neprihlasen },
      { status: 401 },
    );
  }

  let telo: unknown;
  try {
    telo = await request.json();
  } catch {
    telo = null;
  }
  const orderId = (telo as { orderId?: unknown } | null)?.orderId;
  if (typeof orderId !== "string" || orderId.trim() === "") {
    return NextResponse.json(
      { status: "chyba", zprava: t.chyby.chybiObjednavka },
      { status: 400 },
    );
  }

  const { telefon, stav } = await barCreditProUzivatele(user.id);
  if (!telefon || !stav.eligible) {
    return NextResponse.json(
      { status: "chyba", zprava: t.chyby.kreditNemas },
      { status: 403 },
    );
  }

  const cekajici = stav.orders.find(
    (objednavka) => objednavka.id === orderId.trim() && objednavka.issuedAt === null,
  );
  if (!cekajici) {
    return NextResponse.json(
      { status: "chyba", zprava: t.chyby.objednavkaVydana },
      { status: 409 },
    );
  }

  const vysledek = await vydatObjednavku(telefon, cekajici.id, fetch, lang);
  if (!vysledek.ok) {
    return NextResponse.json(
      { status: "chyba", zprava: vysledek.zprava },
      { status: 400 },
    );
  }
  return NextResponse.json({ status: "ok" });
}
