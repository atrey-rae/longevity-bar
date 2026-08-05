import { NextResponse, type NextRequest } from "next/server";

import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import { normalizovatPolozky, objednatZKreditu } from "@/lib/healing-credit";
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
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { status: "unauthorized", zprava: "Nejsi přihlášený." },
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
      { status: "chyba", zprava: "Objednávka nedává smysl. Zkus výběr znovu." },
      { status: 400 },
    );
  }

  // Znovu přes session: potřebujeme telefon a zároveň ověřit, že host kredit
  // vůbec má. Bez toho by šlo posílat objednávky za kohokoli s telefonem.
  const { telefon, stav } = await barCreditProUzivatele(user.id);
  if (!telefon || !stav.eligible) {
    return NextResponse.json(
      { status: "chyba", zprava: "Kredit na Longevity Baru pro tebe nemáme." },
      { status: 403 },
    );
  }

  const vysledek = await objednatZKreditu(telefon, polozky);
  if (!vysledek.ok) {
    return NextResponse.json(
      { status: "chyba", zprava: vysledek.zprava },
      { status: 400 },
    );
  }
  return NextResponse.json({ status: "ok" });
}
