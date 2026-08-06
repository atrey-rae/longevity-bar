/**
 * Autorizace interních reportů (`/api/internal/report/*`).
 *
 * Jediná implementace pro všechny reporty — kdyby si každá route držela svou
 * kopii, rozešly by se při první opravě a jeden endpoint by zůstal slabší.
 *
 * Vedle sdíleného secretu Healing.app bere i vlastní `REPORT_USERS_SECRET`:
 * reporting tak nemusí znát secret SMS/kredit mostu a jeho rotace se ho
 * nedotkne. Obojí je fail-closed — když secret na serveru chybí, neprojde nic.
 *
 * Serverový modul, nikdy do klientského bundlu.
 */

import { isAuthorizedHealingBridge } from "@/lib/healing-bridge";

if (typeof window !== "undefined") {
  throw new Error("lib/report-auth.ts je serverový modul — nesmí do klienta.");
}

export function jeAutorizovanyReport(hlavicka: string | null): boolean {
  if (isAuthorizedHealingBridge(hlavicka)) return true;
  const vlastni = process.env.REPORT_USERS_SECRET;
  if (!vlastni || !hlavicka?.startsWith("Bearer ")) return false;
  const token = hlavicka.slice("Bearer ".length);
  // Délku porovnáváme napřed (jinak by se z ní stal jediný rozdíl v čase);
  // samotný obsah pak vždy celý, bez předčasného návratu.
  if (token.length !== vlastni.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i += 1) {
    diff |= token.charCodeAt(i) ^ vlastni.charCodeAt(i);
  }
  return diff === 0;
}
