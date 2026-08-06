import { NextResponse, type NextRequest } from "next/server";

import { getT } from "@/lib/i18n/server";
import { selectRewardProduct } from "@/lib/loyalty-server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Výběr produktu k odměně. Veškerá validace (existence odměny, správná
 * kategorie, aktivní produkt) probíhá na serveru přes service-role klienta.
 */
export async function POST(request: NextRequest) {
  // Jazyk hlášek se bere z cookie `lang` requestu — stejný zdroj jako stránky.
  const { t } = await getT();
  const ZPRAVY: Record<string, string> = {
    ...t.chyby.odmena,
    error: t.chyby.vyberSelhal,
  };

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { status: "unauthorized", zprava: t.chyby.neprihlasen },
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
