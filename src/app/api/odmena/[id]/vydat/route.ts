import { NextResponse, type NextRequest } from "next/server";

import { redeemReward } from "@/lib/loyalty-server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ZPRAVY: Record<string, string> = {
  email_unverified: "Nejdřív potvrď svůj e-mail. Poslali jsme ti nový ověřovací e-mail, pokud od posledního uběhlo alespoň 10 minut.",
  already_redeemed: "Tahle odměna už byla vydaná.",
  not_selected: "Nejdřív je potřeba vybrat konkrétní produkt.",
  not_found: "Odměnu se nepodařilo najít.",
  bad_pin: "Nesprávný PIN obsluhy.",
  error: "Výdej se nepodařil, zkus to prosím znovu.",
};

/**
 * Výdej odměny u pokladny (po 3s podržení tlačítka na telefonu zákazníka).
 * Odměnu znehodnotí server — druhý pokus vrátí `already_redeemed`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { status: "unauthorized", zprava: "Nejsi přihlášený." },
      { status: 401 },
    );
  }

  let pin: string | undefined;
  try {
    const body = (await request.json()) as { pin?: unknown };
    pin = typeof body.pin === "string" ? body.pin : undefined;
  } catch {
    pin = undefined;
  }

  const vysledek = await redeemReward(user.id, id, pin);

  if (vysledek.status === "ok") {
    return NextResponse.json({ status: "ok" });
  }

  const kod =
    vysledek.status === "not_found"
      ? 404
      : vysledek.status === "bad_pin" || vysledek.status === "email_unverified"
        ? 403
        : vysledek.status === "error"
          ? 500
          : 409;

  return NextResponse.json(
    { status: vysledek.status, zprava: ZPRAVY[vysledek.status] ?? ZPRAVY.error },
    { status: kod },
  );
}
