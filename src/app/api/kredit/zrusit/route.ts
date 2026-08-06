import { NextResponse, type NextRequest } from "next/server";

import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import { zrusitObjednavku } from "@/lib/healing-credit";
import { getT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zrušení objednávky z kreditu, kterou obsluha ještě nevydala.
 *
 * Stejný kontrakt jako `/api/kredit/vydat`, jen opačným směrem: telefon jde
 * VÝHRADNĚ ze session (nikdy z těla requestu) a že objednávka patří tomuhle
 * hostovi a je pořád nevydaná, se ověří proti jeho stavu z bridge. Cizí ani už
 * vydané `orderId` se tak na Healing.app vůbec nedostane.
 *
 * Poslední slovo má stejně most — mezi načtením stavu a zrušením mohla obsluha
 * objednávku vydat; proto se jeho odmítnutí překládá na tutéž hlášku.
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
      { status: "chyba", zprava: t.chyby.neplatnyPozadavek },
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
    (objednavka) =>
      objednavka.id === orderId.trim() && objednavka.issuedAt === null,
  );
  if (!cekajici) {
    return NextResponse.json(
      { status: "chyba", zprava: t.kredit.chybaZruseni },
      { status: 409 },
    );
  }

  const vysledek = await zrusitObjednavku(telefon, cekajici.id, fetch, lang);
  if (!vysledek.ok) {
    return NextResponse.json(
      { status: "chyba", zprava: vysledek.zprava },
      { status: 400 },
    );
  }
  return NextResponse.json({ status: "ok" });
}
