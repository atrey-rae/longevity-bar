/**
 * Jazyk v serverových komponentách.
 *
 * ZÁMĚRNĚ mimo `src/middleware.ts` — middleware vlastní obnovu Supabase session
 * a nesmí se kvůli jazyku sahat. Cookie `lang` (explicitní volba hosta) má
 * přednost, jinak se jazyk auto-detekuje z `Accept-Language`, tj. podle
 * nastavení mobilu: `cs`/`sk` → čeština, cokoli jiného → angličtina.
 *
 * Pozor: čtení cookies i hlaviček dělá ze stránky dynamický render. Rozcestník,
 * kvíz, odměny, kredit i dárek už `force-dynamic` mají; katalogy a pravidla se
 * tímhle přidávají — je to vědomá cena za jazyk bez remapu URL.
 */

import { cookies, headers } from "next/headers";

import { getDict } from "./index";
import { LANG_COOKIE, resolveLang, type Lang } from "./lang";
import type { Dict } from "./types";

/** Jazyk aktuálního requestu. */
export async function getLang(): Promise<Lang> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return resolveLang(
    cookieStore.get(LANG_COOKIE)?.value,
    headerList.get("accept-language"),
  );
}

/** Slovník aktuálního requestu i s jazykem — jedno volání místo dvou. */
export async function getT(): Promise<{ lang: Lang; t: Dict }> {
  const lang = await getLang();
  return { lang, t: getDict(lang) };
}
