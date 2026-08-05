import { shodujeSeTajemstvi } from "./kontakt";

/**
 * Autorizace interního API (`/api/interni/*`), které volá týmová appka
 * Healing (healing.peaceandcoco.com).
 *
 * Sdílené tajemství v hlavičce `Authorization: Bearer <HEALING_API_TOKEN>`.
 * Žádná session, žádná cookie — volá to server, ne prohlížeč.
 *
 * Fail-closed: bez nastaveného tokenu endpoint nefunguje vůbec. Prázdná
 * proměnná by jinak znamenala veřejný zápis do politiky kvízu.
 */

export type Autorizace =
  | { ok: true }
  | { ok: false; status: 401 | 503; zprava: string };

export function overitInterniToken(request: Request): Autorizace {
  const ocekavany = process.env.HEALING_API_TOKEN;
  if (!ocekavany || ocekavany.trim() === "") {
    console.error("[interni-api] chybí HEALING_API_TOKEN — endpoint je zavřený");
    return {
      ok: false,
      status: 503,
      zprava: "Interní API není nakonfigurované.",
    };
  }

  const hlavicka = request.headers.get("authorization") ?? "";
  const [schema, token] = hlavicka.split(" ");
  if (schema?.toLowerCase() !== "bearer" || !token) {
    return { ok: false, status: 401, zprava: "Chybí bearer token." };
  }

  // Konstantní čas — ať se token nedá uhodnout po znacích.
  if (!shodujeSeTajemstvi(token, ocekavany.trim())) {
    return { ok: false, status: 401, zprava: "Neplatný token." };
  }

  return { ok: true };
}
