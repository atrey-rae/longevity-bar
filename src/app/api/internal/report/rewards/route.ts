import { NextResponse } from "next/server";

import { jeAutorizovanyReport } from "@/lib/report-auth";
import { sestavitReportOdmen } from "@/lib/report-rewards";

// `node:crypto` v `lib/healing-bridge.ts` potřebuje Node runtime, ne Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Interní report VYDANÝCH věrnostních odměn — evidence a zrcadlení do Sheetu.
 *
 * Stejný kontrakt jako `/api/internal/report/users`: server-to-server,
 * autorizace přes `jeAutorizovanyReport` (bridge secret NEBO
 * `REPORT_USERS_SECRET`, porovnání v konstantním čase, fail-closed), odpověď
 * s osobními údaji se nikde necachuje a 401 přijde dřív než jakékoli čtení dat.
 *
 * Tělo úspěšné odpovědi je HOLÉ POLE řádků — konzumenti reportů (Sheet sync)
 * iterují přímo přes `json.load(...)`, obalení do objektu by je rozbilo.
 */
export async function GET(request: Request) {
  if (!jeAutorizovanyReport(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rewards = await sestavitReportOdmen();
    return NextResponse.json(rewards, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    // Detail (včetně názvu tabulky) jen do logu; klientovi krátká hláška —
    // secret, stack ani schéma databáze nikdy ven.
    console.error("[report] přehled odměn se nepodařilo sestavit:", e);
    return NextResponse.json(
      { error: "report selhal" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
