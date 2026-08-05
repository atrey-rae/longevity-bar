/**
 * Autorizace interního API, které volá healing.app (sdílený secret).
 *
 * Secret se čte až za běhu (stejně jako v `lib/supabase/env.ts`), aby build
 * prošel i bez konfigurace. Na rozdíl od `required()` se ale NEHÁZÍ výjimka —
 * chybějící secret znamená, že se každý request odmítne (fail closed).
 *
 * Vyžaduje Node runtime (`node:crypto`) — route handlery proto mají
 * `export const runtime = "nodejs"`.
 */

import { timingSafeEqual } from "node:crypto";

const PREFIX = "Bearer ";

/**
 * Souhlasí hlavička `Authorization` se sdíleným secretem?
 *
 * Fail closed: bez `HEALING_BRIDGE_SECRET` na serveru neprojde nikdo — ani
 * prázdný token, ani prázdná hlavička (žádná shoda „prázdné = prázdné“).
 */
export function isAuthorizedHealingBridge(
  authorizationHeader: string | null,
): boolean {
  const secret = process.env.HEALING_BRIDGE_SECRET;
  if (!secret || secret.trim() === "") return false;
  if (!authorizationHeader || !authorizationHeader.startsWith(PREFIX)) {
    return false;
  }

  const token = Buffer.from(authorizationHeader.slice(PREFIX.length));
  const ocekavany = Buffer.from(secret);
  // `timingSafeEqual` hází při rozdílné délce — délku proto řešíme dopředu.
  if (token.length !== ocekavany.length) return false;
  return timingSafeEqual(token, ocekavany);
}
