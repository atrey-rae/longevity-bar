import type { CookieOptions } from "@supabase/ssr";

/**
 * Životnost přihlašovacích cookies — jedno místo pro celou appku.
 *
 * Atrey 6. 8.: nikdo nesmí vypadnout uprostřed festivalu. 30 dní pokryje
 * přípravu, celý festival i doprodej. Kdo přijde jednou za týden, musí
 * pořád najít svoji kartu, ne přihlašovací formulář.
 */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dní

/**
 * Cookie options, se kterými se do prohlížeče zapisuje Supabase session.
 *
 * Dělá dvě věci, na kterých stojí dlouhé přihlášení:
 *
 * 1. `maxAge` nikdy nechybí. Cookie bez `Max-Age`/`Expires` je *session*
 *    cookie — zavřením prohlížeče (na mobilu i jen odswipnutím z přepínače
 *    aplikací) zmizí a člověk se ocitne na přihlášení. Proto doplňujeme
 *    spodní hranici 30 dní.
 * 2. Zároveň nezkracuje. `@supabase/ssr` dnes zapisuje 400 dní (limit
 *    prohlížečů podle rfc6265bis) a bylo by proti zadání to srazit dolů —
 *    bereme proto vždycky to delší z obou.
 *
 * Výjimka je mazání: `maxAge <= 0` posílá `@supabase/ssr` při odhlášení
 * a při přepisu starých chunků. To se prodlužovat NESMÍ, jinak by odhlášení
 * cookie nechalo naživu.
 */
export function dlouhodobaCookie(options: CookieOptions = {}): CookieOptions {
  const maxAge = options.maxAge;
  const zadany = typeof maxAge === "number" && Number.isFinite(maxAge) ? maxAge : null;
  if (zadany !== null && zadany <= 0) return { path: "/", ...options };
  return {
    path: "/",
    ...options,
    maxAge: Math.max(zadany ?? 0, SESSION_COOKIE_MAX_AGE_SECONDS),
  };
}

/**
 * `cookieOptions` pro `createServerClient`/`createBrowserClient`.
 *
 * V `@supabase/ssr` 0.5.2 si knihovna `maxAge` u zápisu stejně přepíše svou
 * vlastní konstantou (400 dní), takže tohle je dnes hlavně deklarace záměru
 * a pojistka pro novější verze, které hodnotu respektují. Reálnou jistotu
 * dává `dlouhodobaCookie()` v `setAll`.
 *
 * `name` se sem záměrně nedává — v `@supabase/ssr` přepisuje `storageKey`
 * a rozešlo by to už vydané session.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax",
} as const;
