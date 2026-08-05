/**
 * Spojka mezi přihlášeným uživatelem Bar.app a kreditem v Healing.app.
 *
 * Drží dohromady dvě věci, které jinak potřebuje každá stránka i route zvlášť:
 * telefon ze session (E.164) a stav kreditu z bridge. Oddělené od
 * `lib/healing-credit.ts` proto, aby ten zůstal bez závislosti na Supabase
 * a šel testovat s podstrčeným `fetch`.
 *
 * Serverový modul (service-role klient v `phone-auth-server`).
 */

import {
  KREDIT_NEDOSTUPNY,
  nacistStavKreditu,
  type BarCreditStav,
} from "./healing-credit";
import { getSessionPhoneE164 } from "./phone-auth-server";

export type KreditProUzivatele = {
  /** `null` = telefon neznáme; kredit se v takovém případě nenabízí. */
  telefon: string | null;
  stav: BarCreditStav;
};

/**
 * Stav kreditu pro přihlášeného uživatele. Fail-closed a nikdy nehází —
 * rozcestník i stránka kreditu se na tom smí bez obav zavěsit.
 */
export async function barCreditProUzivatele(
  userId: string,
): Promise<KreditProUzivatele> {
  const telefon = await getSessionPhoneE164(userId);
  if (!telefon) return { telefon: null, stav: KREDIT_NEDOSTUPNY };
  return { telefon, stav: await nacistStavKreditu(telefon) };
}
