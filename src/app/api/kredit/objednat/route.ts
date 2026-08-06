import { NextResponse, type NextRequest } from "next/server";

import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import { normalizovatPolozky, objednatZKreditu } from "@/lib/healing-credit";
import { getT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Objednávka z kreditu hosta.
 *
 * Telefon se bere VÝHRADNĚ ze session (nikdy z těla requestu) — jinak by si
 * kdokoli mohl objednat na cizí kredit. Položky se normalizují tady, ať se do
 * Healing.app nedostane nesmyslné množství.
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
  const polozky = normalizovatPolozky(
    (telo as { items?: unknown } | null)?.items,
  );
  if (!polozky) {
    return NextResponse.json(
      { status: "chyba", zprava: t.chyby.objednavkaNesmysl },
      { status: 400 },
    );
  }

  // Znovu přes session: potřebujeme telefon a zároveň ověřit, že host kredit
  // vůbec má. Bez toho by šlo posílat objednávky za kohokoli s telefonem.
  const { telefon, stav } = await barCreditProUzivatele(user.id);
  if (!telefon || !stav.eligible) {
    return NextResponse.json(
      { status: "chyba", zprava: t.chyby.kreditNemas },
      { status: 403 },
    );
  }

  const vysledek = await objednatZKreditu(telefon, polozky, fetch, lang);
  if (!vysledek.ok) {
    return NextResponse.json(
      { status: "chyba", zprava: vysledek.zprava },
      { status: 400 },
    );
  }
  return NextResponse.json({ status: "ok" });
}
