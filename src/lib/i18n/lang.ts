/**
 * Jazyk Bar.app — čeština a angličtina.
 *
 * ZÁMĚRNĚ bez jakýchkoli importů (React, Next, ani vlastní moduly), aby ho
 * mohly načíst kontrolní skripty v `scripts/` přímo přes `tsx`. Stejné pravidlo
 * jako u `lib/kviz.ts` a `lib/referral.ts`.
 *
 * Rozhodnutí o jazyce se NEDĚLÁ v middleware (`src/middleware.ts` vlastní
 * paralelní auth práce a obnovuje Supabase session) — server komponenty si
 * jazyk přečtou z cookie `lang` a při jejím chybění z hlavičky `Accept-Language`.
 */

export const LANGS = ["cs", "en"] as const;

export type Lang = (typeof LANGS)[number];

/** Bez cookie i bez čitelné hlavičky jedeme česky — festival je v Česku. */
export const DEFAULT_LANG: Lang = "cs";

/** Název cookie, kterou nastavuje přepínač v hlavičce. */
export const LANG_COOKIE = "lang";

/** Rok — návštěvník festivalu si volbu nastavuje jednou. */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Jazyky, které mapujeme na češtinu. Slovenština je češtině dost blízko na to,
 * aby byl český text lepší volbou než anglický; všechno ostatní jde do EN.
 */
const CESKE_JAZYKY = new Set(["cs", "cz", "sk"]);

/** `"cs"`/`"en"` z libovolné hodnoty, jinak `null`. */
export function normalizeLang(value: unknown): Lang | null {
  if (typeof value !== "string") return null;
  const kod = value.trim().toLowerCase();
  return (LANGS as readonly string[]).includes(kod) ? (kod as Lang) : null;
}

type Preference = { tag: string; q: number };

/**
 * Nejlepší jazyk z hlavičky `Accept-Language` — auto-detekce podle jazyka
 * mobilu. `cs`/`sk` (a jejich regionální varianty jako `cs-CZ`) → čeština,
 * cokoli jiného → angličtina.
 *
 * Chybějící nebo nesrozumitelná hlavička vrací `DEFAULT_LANG`; hlavička se
 * nikdy nesmí stát důvodem chyby.
 */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (typeof header !== "string" || header.trim().length === 0) {
    return DEFAULT_LANG;
  }

  const preference: Preference[] = [];
  // Strop délky: hlavička je vstup od klienta, nemá smysl parsovat kilobajty.
  for (const cast of header.slice(0, 512).split(",")) {
    const [tagCast, ...parametry] = cast.split(";");
    const tag = tagCast.trim().toLowerCase();
    if (!tag) continue;
    const qParametr = parametry
      .map((p) => p.trim().toLowerCase())
      .find((p) => p.startsWith("q="));
    const q = qParametr ? Number.parseFloat(qParametr.slice(2)) : 1;
    preference.push({ tag, q: Number.isFinite(q) ? q : 0 });
  }

  // Stabilní řazení podle kvality (sestupně); `sort` v JS je od ES2019 stabilní,
  // takže při shodné q rozhoduje pořadí v hlavičce.
  preference.sort((a, b) => b.q - a.q);

  for (const { tag, q } of preference) {
    if (q <= 0) continue;
    if (tag === "*") return DEFAULT_LANG;
    const zaklad = tag.split("-")[0];
    if (CESKE_JAZYKY.has(zaklad)) return "cs";
    if (zaklad.length >= 2) return "en";
  }

  return DEFAULT_LANG;
}

/**
 * Výsledný jazyk requestu. Cookie (explicitní volba hosta) má vždy přednost
 * před auto-detekcí z prohlížeče.
 */
export function resolveLang(
  cookieHodnota: unknown,
  acceptLanguage: string | null | undefined,
): Lang {
  return normalizeLang(cookieHodnota) ?? langFromAcceptLanguage(acceptLanguage);
}

/** Druhý jazyk — přepínač je binární, ať se nemusí nikde psát podmínka. */
export function opacnyJazyk(lang: Lang): Lang {
  return lang === "cs" ? "en" : "cs";
}

/** Popisek jazyka v přepínači. Vždy v cílovém jazyce, nikdy přeložený. */
export const LANG_LABEL: Record<Lang, string> = {
  cs: "CZ",
  en: "EN",
};

/** `lang` atribut `<html>` — Next chce plný BCP 47 tag. */
export const HTML_LANG: Record<Lang, string> = {
  cs: "cs",
  en: "en",
};
