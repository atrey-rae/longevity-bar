import { NextResponse } from "next/server";

import { isAuthorizedHealingBridge } from "@/lib/healing-bridge";
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
/**
 * Vedle bridge secretu bere i vlastní `REPORT_USERS_SECRET` — reporting tak
 * nepotřebuje znát sdílený secret SMS/kredit mostu (a jeho rotace se ho
 * nedotkne). Stejná pravidla: konstantní čas, fail-closed když chybí.
 */
function jeAutorizovanyReport(hlavicka: string | null): boolean {
  if (isAuthorizedHealingBridge(hlavicka)) return true;
  const vlastni = process.env.REPORT_USERS_SECRET;
  if (!vlastni || !hlavicka?.startsWith("Bearer ")) return false;
  const token = hlavicka.slice("Bearer ".length);
  if (token.length !== vlastni.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i += 1) {
    diff |= token.charCodeAt(i) ^ vlastni.charCodeAt(i);
  }
  return diff === 0;
}

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
