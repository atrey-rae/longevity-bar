import { NextResponse } from "next/server";

import { jeAutorizovanyReport } from "@/lib/report-auth";
import { sestavitReportUzivatelu } from "@/lib/report-users";

// `node:crypto` v `lib/healing-bridge.ts` potřebuje Node runtime, ne Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Interní report všech přihlášených zákazníků — zrcadlení do Google Sheetu.
 *
 * Server-to-server, autorizace sdíleným secretem Healing.app přes
 * `isAuthorizedHealingBridge` (hlavička `Authorization: Bearer …`, porovnání
 * v konstantním čase, fail-closed když secret na serveru chybí). Odpověď
 * obsahuje osobní údaje, takže se nesmí nikde cachovat.
 *
 * Bez stránkování (stovky řádků max), seřazeno podle data registrace.
 *
 * Tělo úspěšné odpovědi je HOLÉ POLE řádků — přesně to čte konzument
 * `scripts/sync_bar_users_report.py` (zrcadlení do Google Sheetu). Obalit ho
 * do objektu by ten skript rozbil.
 */
export async function GET(request: Request) {
  if (!jeAutorizovanyReport(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const users = await sestavitReportUzivatelu();
    return NextResponse.json(users, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    // Detail (včetně názvu tabulky) jen do logu; klientovi krátká hláška —
    // secret, stack ani schéma databáze nikdy ven.
    console.error("[report] přehled uživatelů se nepodařilo sestavit:", e);
    return NextResponse.json(
      { error: "report selhal" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
