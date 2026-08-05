import { NextResponse } from "next/server";

import { isAuthorizedHealingBridge } from "@/lib/healing-bridge";
import {
  buildHealingDashboard,
  collectHealingDashboardInput,
} from "@/lib/healing-dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuizPolicy } from "@/lib/quiz-access";

// `node:crypto` v `lib/healing-bridge.ts` potřebuje Node runtime, ne Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Provozní statistiky pro healing.app (kupóny per bavič, vydané věrnostní
 * odměny per produkt). Jen agregované počty — žádné osobní údaje.
 *
 * Které selhání se smí přejít a které musí skončit 500, rozhoduje
 * `HEALING_DASHBOARD_SOURCES` v `lib/healing-dashboard.ts` — tady se jen
 * loguje. Nikdy nevracet 200 s nulami z chyby: podle těch čísel se rozhoduje
 * na baru.
 */
export async function GET(request: Request) {
  if (!isAuthorizedHealingBridge(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    // U leadů se čtou jen tyhle tři sloupce — kontakt do statistik nepatří.
    const [hostsRes, leadsRes, rewardsRes, productsRes, quizPolicy] = await Promise.all([
      admin.from("quiz_hosts").select("code, variant"),
      admin.from("quiz_leads").select("bavic, product_slug, product_name"),
      admin.from("rewards").select("state, product_id"),
      admin.from("products").select("id, name"),
      getQuizPolicy(),
    ]);

    const { input, degraded } = collectHealingDashboardInput({
      quiz_hosts: hostsRes,
      quiz_leads: leadsRes,
      rewards: rewardsRes,
      products: productsRes,
    });

    for (const zdroj of degraded) {
      console.warn(
        `[healing-bridge] ${zdroj.table} se nenačetla, dashboard jede dál:`,
        zdroj.message,
      );
    }

    const data = buildHealingDashboard(input);

    // `generatedAt` první — pořadí klíčů drží kontrakt dohodnutý s healing.app.
    return NextResponse.json({ generatedAt: new Date().toISOString(), ...data, quizPolicy });
  } catch (e) {
    // Detail (včetně názvu tabulky u `HealingSourceError`) jen do logu;
    // klientovi krátká hláška — secret, stack ani schéma DB nikdy ven.
    console.error("[healing-bridge] dashboard se nepodařilo sestavit:", e);
    return NextResponse.json({ error: "dashboard selhal" }, { status: 500 });
  }
}
