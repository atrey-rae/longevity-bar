/**
 * Klient interního bridge Healing.app — kredit hostů (typ HOST) na Longevity Baru.
 *
 * Healing.app je zdroj pravdy: eviduje, kdo kredit má, kolik z něj utratil
 * a jaké objednávky čekají na výdej. Bar.app si sem chodí jen pro stav a
 * posílá dvě akce (objednat, vydat).
 *
 * Tři pravidla, na kterých tenhle modul stojí:
 *   1. SERVEROVÝ modul — nese sdílený secret a nesmí se dostat do klientského
 *      bundlu (stejná ruční pojistka jako v `lib/kviz-hosts.ts`).
 *   2. FAIL-CLOSED — chybí env, nesedí telefon, bridge neodpoví nebo vrátí
 *      nesmysl? Vracíme `eligible: false`, tedy „kredit tu není“. Sekce se
 *      nezobrazí. Nikdy nedomýšlíme částky ani objednávky.
 *   3. NIKDY NEHÁZÍ na cestě čtení stavu — výjimka ze server komponenty by
 *      shodila celý rozcestník kvůli doplňkové sekci.
 *
 * `fetchImpl` je injektovatelný kvůli `scripts/check-darek-kredit.ts` (stejný
 * vzor jako `sendSms` v `lib/phone-auth-server.ts`).
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/healing-credit.ts nese sdílený secret a nesmí se dostat do client bundlu.",
  );
}

import { getDict } from "./i18n";
import { DEFAULT_LANG, type Lang } from "./i18n/lang";

const CASOVY_LIMIT_MS = 6000;

/** Kolik různých položek smí jedna objednávka obsahovat a kolik kusů z jedné. */
export const MAX_POLOZEK_OBJEDNAVKY = 20;
export const MAX_KUSU_POLOZKY = 20;

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type BarCreditPolozka = {
  id: string;
  /** Název položky — v kontraktu bridge je zkráceně `n`. */
  n: string;
  price: number;
};

export type BarCreditRadek = {
  id: string;
  n: string;
  qty: number;
  /** Cena za kus, když ji bridge pošle; jinak `null` (nedopočítáváme ji). */
  price: number | null;
};

export type BarCreditObjednavka = {
  id: string;
  items: BarCreditRadek[];
  total: number;
  createdAt: string | null;
  /** `null` = objednávka čeká na výdej u baru (živá vstupenka). */
  issuedAt: string | null;
};

export type BarCreditStav = {
  eligible: boolean;
  credit: { total: number; spent: number; remaining: number } | null;
  catalog: BarCreditPolozka[];
  orders: BarCreditObjednavka[];
};

/** Jediný tvar „kredit tu pro tebe není“ — používá se při každém selhání. */
export const KREDIT_NEDOSTUPNY: BarCreditStav = {
  eligible: false,
  credit: null,
  catalog: [],
  orders: [],
};

export type VysledekKreditu =
  | { ok: true; stav: BarCreditStav }
  | { ok: false; zprava: string };

export type ObjednavkaPolozka = { id: string; qty: number };

/**
 * Hláška pro hosta — nikdy neobsahuje detail z bridge ani konfiguraci.
 * Bere se ze slovníku, aby anglicky mluvící host nedostal českou větu; české
 * znění je v `i18n/cs` doslova stejné jako dřív.
 */
function obecnaChyba(lang: Lang): string {
  return getDict(lang).chyby.kreditNedostupny;
}

/* -------------------------------------------------------------------------- */
/* Konfigurace                                                                 */
/* -------------------------------------------------------------------------- */

type Konfigurace = { base: string; secret: string };

/**
 * Env se čte až za běhu (build musí projít i bez konfigurace) a chybějící
 * hodnota není výjimka — jen „bridge není nakonfigurovaný“.
 */
function konfigurace(): Konfigurace | null {
  const base = process.env.HEALING_CREDIT_BRIDGE_URL?.trim();
  const secret = process.env.HEALING_BRIDGE_SECRET?.trim();
  if (!base || !secret) return null;
  if (!/^https?:\/\//i.test(base)) {
    console.warn("[kredit] HEALING_CREDIT_BRIDGE_URL není absolutní URL.");
    return null;
  }
  return { base: base.replace(/\/+$/, ""), secret };
}

/** Je bridge vůbec nakonfigurovaný? (Pro diagnostiku, ne pro autorizaci.) */
export function jeKreditBridgeNakonfigurovany(): boolean {
  return konfigurace() !== null;
}

/** Telefon musí být E.164 — do query stringu nesmí jít nic jiného. */
function platnyTelefon(phone: string): string | null {
  const hodnota = phone.trim();
  return /^\+[1-9]\d{7,14}$/.test(hodnota) ? hodnota : null;
}

/* -------------------------------------------------------------------------- */
/* Parsování odpovědi                                                          */
/* -------------------------------------------------------------------------- */

function cislo(hodnota: unknown): number | null {
  const n = typeof hodnota === "string" ? Number(hodnota) : hodnota;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function text(hodnota: unknown): string | null {
  return typeof hodnota === "string" && hodnota.trim() !== ""
    ? hodnota.trim()
    : null;
}

function pole(hodnota: unknown): unknown[] {
  return Array.isArray(hodnota) ? hodnota : [];
}

function zaznam(hodnota: unknown): Record<string, unknown> | null {
  return typeof hodnota === "object" && hodnota !== null && !Array.isArray(hodnota)
    ? (hodnota as Record<string, unknown>)
    : null;
}

function parsovatKatalog(hodnota: unknown): BarCreditPolozka[] {
  const polozky: BarCreditPolozka[] = [];
  for (const radek of pole(hodnota)) {
    const o = zaznam(radek);
    if (!o) continue;
    const id = text(o.id);
    const nazev = text(o.n) ?? text(o.name);
    const cena = cislo(o.price);
    // Položka bez ceny by v součtu tiše mizela — takovou raději nenabízíme.
    if (!id || !nazev || cena === null || cena < 0) continue;
    polozky.push({ id, n: nazev, price: cena });
  }
  return polozky;
}

function parsovatRadky(hodnota: unknown): BarCreditRadek[] {
  const radky: BarCreditRadek[] = [];
  for (const radek of pole(hodnota)) {
    const o = zaznam(radek);
    if (!o) continue;
    const id = text(o.id);
    const qty = cislo(o.qty) ?? cislo(o.quantity);
    if (!id || qty === null || qty <= 0) continue;
    radky.push({
      id,
      n: text(o.n) ?? text(o.name) ?? id,
      qty: Math.trunc(qty),
      price: cislo(o.price),
    });
  }
  return radky;
}

function parsovatObjednavky(hodnota: unknown): BarCreditObjednavka[] {
  const objednavky: BarCreditObjednavka[] = [];
  for (const radek of pole(hodnota)) {
    const o = zaznam(radek);
    if (!o) continue;
    const id = text(o.id);
    if (!id) continue;
    objednavky.push({
      id,
      items: parsovatRadky(o.items),
      total: cislo(o.total) ?? 0,
      createdAt: text(o.createdAt),
      issuedAt: text(o.issuedAt),
    });
  }
  return objednavky;
}

/**
 * Převede odpověď bridge na `BarCreditStav`.
 *
 * `eligible` je jediné pole, kterému věříme na slovo — a i to jen když je
 * doprovázené použitelným kreditem. Bez čísel by sekce ukazovala prázdno.
 */
export function parsovatStavKreditu(telo: unknown): BarCreditStav {
  const o = zaznam(telo);
  if (!o || o.eligible !== true) return KREDIT_NEDOSTUPNY;

  const kredit = zaznam(o.credit);
  const total = cislo(kredit?.total);
  const spent = cislo(kredit?.spent);
  const remaining = cislo(kredit?.remaining);
  if (total === null || spent === null || remaining === null) {
    console.warn("[kredit] bridge vrátil eligible bez použitelného kreditu.");
    return KREDIT_NEDOSTUPNY;
  }

  return {
    eligible: true,
    credit: { total, spent, remaining },
    catalog: parsovatKatalog(o.catalog),
    orders: parsovatObjednavky(o.orders),
  };
}

/* -------------------------------------------------------------------------- */
/* Volání bridge                                                               */
/* -------------------------------------------------------------------------- */

type Volani = {
  cesta: string;
  metoda: "GET" | "POST";
  telo?: unknown;
  fetchImpl: FetchLike;
};

async function zavolat(
  { cesta, metoda, telo, fetchImpl }: Volani,
  lang: Lang = DEFAULT_LANG,
): Promise<VysledekKreditu> {
  const config = konfigurace();
  if (!config) {
    console.warn("[kredit] HEALING_CREDIT_BRIDGE_URL/HEALING_BRIDGE_SECRET chybí.");
    return { ok: false, zprava: obecnaChyba(lang) };
  }

  try {
    const odpoved = await fetchImpl(`${config.base}${cesta}`, {
      method: metoda,
      headers: {
        // Secret jde výhradně na server Healing.app, nikdy do odpovědi klientovi.
        Authorization: `Bearer ${config.secret}`,
        ...(telo === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(telo === undefined ? {} : { body: JSON.stringify(telo) }),
      cache: "no-store",
      signal: AbortSignal.timeout(CASOVY_LIMIT_MS),
    });

    const data = await odpoved.json().catch(() => null);
    if (!odpoved.ok) {
      const duvod = text(zaznam(data)?.error) ?? `HTTP ${odpoved.status}`;
      console.warn(`[kredit] bridge odmítl ${metoda} ${cesta}:`, duvod);
      // Hláška z bridge je pro hosta (např. „nedostatek kreditu“), ale jen
      // když je krátká a čitelná — jinak jde obecná.
      return {
        ok: false,
        zprava:
          duvod.length <= 120 && !duvod.startsWith("HTTP")
            ? duvod
            : obecnaChyba(lang),
      };
    }

    return { ok: true, stav: parsovatStavKreditu(data) };
  } catch (e) {
    console.warn(`[kredit] bridge nedostupný (${metoda} ${cesta}):`, e);
    return { ok: false, zprava: obecnaChyba(lang) };
  }
}

/**
 * Stav kreditu hosta. NIKDY nehází a při jakémkoli problému vrací
 * `KREDIT_NEDOSTUPNY` — volající pak sekci prostě nezobrazí.
 */
export async function nacistStavKreditu(
  phone: string,
  fetchImpl: FetchLike = fetch,
): Promise<BarCreditStav> {
  const telefon = platnyTelefon(phone);
  if (!telefon) return KREDIT_NEDOSTUPNY;

  const vysledek = await zavolat({
    cesta: `/state?phone=${encodeURIComponent(telefon)}`,
    metoda: "GET",
    fetchImpl,
  });
  return vysledek.ok ? vysledek.stav : KREDIT_NEDOSTUPNY;
}

/** Ořízne a zkontroluje položky objednávky. `null` = nesmyslný vstup. */
export function normalizovatPolozky(hodnota: unknown): ObjednavkaPolozka[] | null {
  const radky = pole(hodnota);
  if (radky.length === 0 || radky.length > MAX_POLOZEK_OBJEDNAVKY) return null;

  const podleId = new Map<string, number>();
  for (const radek of radky) {
    const o = zaznam(radek);
    const id = o ? text(o.id) : null;
    const qty = o ? cislo(o.qty) : null;
    if (!id || qty === null || !Number.isInteger(qty)) return null;
    if (qty < 1 || qty > MAX_KUSU_POLOZKY) return null;
    if (podleId.has(id)) return null;
    podleId.set(id, qty);
  }
  return [...podleId].map(([id, qty]) => ({ id, qty }));
}

/** Založí objednávku z kreditu. Vrací nový stav, nebo hlášku pro hosta. */
export async function objednatZKreditu(
  phone: string,
  items: ObjednavkaPolozka[],
  fetchImpl: FetchLike = fetch,
  lang: Lang = DEFAULT_LANG,
): Promise<VysledekKreditu> {
  const telefon = platnyTelefon(phone);
  if (!telefon) return { ok: false, zprava: obecnaChyba(lang) };
  if (normalizovatPolozky(items) === null) {
    return { ok: false, zprava: getDict(lang).chyby.objednavkaNesmysl };
  }
  return zavolat(
    {
      cesta: "/order",
      metoda: "POST",
      telo: { phone: telefon, items },
      fetchImpl,
    },
    lang,
  );
}

/** Výdej objednávky u baru (obsluha, podržení 3 s). */
export async function vydatObjednavku(
  phone: string,
  orderId: string,
  fetchImpl: FetchLike = fetch,
  lang: Lang = DEFAULT_LANG,
): Promise<VysledekKreditu> {
  const telefon = platnyTelefon(phone);
  const id = text(orderId);
  if (!telefon || !id) return { ok: false, zprava: obecnaChyba(lang) };
  return zavolat(
    {
      cesta: "/issue",
      metoda: "POST",
      telo: { phone: telefon, orderId: id },
      fetchImpl,
    },
    lang,
  );
}
