import { NextResponse } from "next/server";

import { isAuthorizedHealingBridge } from "@/lib/healing-bridge";
import { parseQuizVariantUpdate } from "@/lib/healing-dashboard";
import { createAdminClient } from "@/lib/supabase/admin";

// `node:crypto` v `lib/healing-bridge.ts` potřebuje Node runtime, ne Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Nastaví variantu kvízu pro jednoho baviče — volá healing.app, když bavič
 * nebo Atrey přepne kvíz na obrazovce healing.app.
 *
 * Validace (tvar těla, známá varianta, známý bavič) je v
 * `lib/healing-dashboard.ts` — testovaná v `scripts/check-healing-bridge.ts`.
 */
export async function POST(request: Request) {
  if (!isAuthorizedHealingBridge(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let telo: unknown;
  try {
    telo = await request.json();
  } catch {
    return NextResponse.json({ error: "čekáme JSON objekt" }, { status: 400 });
  }

  const vysledek = parseQuizVariantUpdate(telo);
  if (!vysledek.ok) {
    return NextResponse.json({ error: vysledek.error }, { status: vysledek.status });
  }
  const { bavic, variant, actor } = vysledek.data;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("quiz_hosts")
      .upsert(
        {
          code: bavic,
          variant,
          updated_by: actor,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "code" },
      )
      .select("code, variant, updated_at, updated_by")
      .single();

    if (error) {
      console.error("[healing-bridge] zápis quiz_hosts selhal:", error.message);
      return NextResponse.json({ error: "zápis se nepodařil" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, host: data });
  } catch (e) {
    console.error("[healing-bridge] quiz_hosts nedostupná:", e);
    return NextResponse.json({ error: "zápis se nepodařil" }, { status: 500 });
  }
}
