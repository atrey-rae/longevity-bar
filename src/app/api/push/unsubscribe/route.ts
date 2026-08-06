import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Vypnutí oznámení pro jedno zařízení.
 *
 * Autorizace se schválně NEŘEŠÍ přihlášením: `endpoint` je náhodná adresa,
 * kterou zná jen dané zařízení a naše databáze, a jediné, co s ní jde udělat,
 * je přestat si posílat vlastní oznámení. Kdybychom vyžadovali session,
 * nepřihlášený host by oznámení nikdy nevypnul — a to je horší.
 *
 * Odpověď je vždy `ok`, i když řádek neexistoval: z odpovědi nemá jít poznat,
 * jestli u nás daný endpoint odběr měl.
 */
export async function POST(request: NextRequest) {
  let telo: unknown;
  try {
    telo = await request.json();
  } catch {
    telo = null;
  }
  const endpoint = (telo as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    return NextResponse.json({ status: "ok" }, { headers: NO_STORE });
  }

  try {
    const admin = createAdminClient();
    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  } catch (e) {
    // Ani tady se nic neprozrazuje — host prostě dostane `ok`.
    console.warn("[push] odběr se nepodařilo smazat:", e);
  }
  return NextResponse.json({ status: "ok" }, { headers: NO_STORE });
}
