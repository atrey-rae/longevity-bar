import { NextResponse, type NextRequest } from "next/server";

import { selectRewardProduct } from "@/lib/loyalty-server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ZPRAVY: Record<string, string> = {
  email_unverified: "Nejdřív potvrď svůj e-mail. Poslali jsme ti nový ověřovací e-mail, pokud od posledního uběhlo alespoň 10 minut.",
  no_reward: "Zatím nemáš nárok na odměnu.",
  bad_product: "Tenhle produkt teď nejde vybrat — nejspíš je vyprodaný.",
  error: "Výběr se nepodařil, zkus to prosím znovu.",
};

/**
 * Výběr produktu k odměně. Veškerá validace (existence odměny, správná
 * kategorie, aktivní produkt) probíhá na serveru přes service-role klienta.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { status: "unauthorized", zprava: "Nejsi přihlášený." },
      { status: 401 },
    );
  }

  let productId = "";
  try {
    const body = (await request.json()) as { productId?: unknown };
    productId = typeof body.productId === "string" ? body.productId : "";
  } catch {
    productId = "";
  }

  if (!productId) {
    return NextResponse.json(
      { status: "bad_product", zprava: ZPRAVY.bad_product },
      { status: 400 },
    );
  }

  const vysledek = await selectRewardProduct(user.id, productId);

  if (vysledek.status === "ok" || vysledek.status === "already_selected") {
    return NextResponse.json({
      status: vysledek.status,
      rewardId: vysledek.rewardId,
    });
  }

  return NextResponse.json(
    {
      status: vysledek.status,
      zprava: ZPRAVY[vysledek.status] ?? ZPRAVY.error,
    },
    { status: vysledek.status === "error" ? 500 : vysledek.status === "email_unverified" ? 403 : 409 },
  );
}
