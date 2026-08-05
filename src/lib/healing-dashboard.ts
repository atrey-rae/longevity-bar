/**
 * Agregace dat pro interní API, které čte healing.app.
 *
 * Čistý modul bez I/O: dostane už načtené řádky ze Supabase a vrátí přesný
 * JSON kontrakt dohodnutý s healing.app. Data se spojují v aplikaci (žádné
 * SQL `group by`, žádné view) — stejně jako v `app/admin/page.tsx`, objem dat
 * je na festivalu malý.
 *
 * Dvě pravidla, která tady drží celý kontrakt:
 *   1. V odpovědi NESMÍ být žádné osobní údaje — jen počty a názvy produktů
 *      (hlídá `scripts/check-healing-dashboard-aggregation.ts`).
 *   2. `generatedAt` si stampuje až route handler, tady se nečtou hodiny —
 *      agregace musí být deterministicky testovatelná.
 */

import {
  BAVICI,
  DEFAULT_QUIZ_VARIANT,
  QUIZ_VARIANTS,
  type QuizVariant,
} from "./kviz";
import type { Product, QuizHost, QuizLead, Reward } from "./types";

/* -------------------------------------------------------------------------- */
/* Kontrakt odpovědi                                                           */
/* -------------------------------------------------------------------------- */

/** Rozpad vybraných produktů u jednoho baviče. */
export type HealingHostProduct = {
  slug: string;
  name: string;
  count: number;
};

export type HealingHostStats = {
  /** Kód baviče z kupónu (A1–F6). */
  code: string;
  slug: string;
  name: string;
  variant: QuizVariant;
  /** Počet vydaných kupónů (obě varianty kvízu se počítají). */
  coupons: number;
  products: HealingHostProduct[];
};

export type HealingLoyaltyProduct = {
  id: string;
  name: string;
  count: number;
};

export type HealingLoyaltyStats = {
  redeemedTotal: number;
  byProduct: HealingLoyaltyProduct[];
};

/** Vše kromě `generatedAt` — to doplní route handler. */
export type HealingDashboardData = {
  hosts: HealingHostStats[];
  loyalty: HealingLoyaltyStats;
};

export type HealingDashboardPayload = { generatedAt: string } & HealingDashboardData;

export type HealingDashboardInput = {
  hosts: Pick<QuizHost, "code" | "variant">[];
  leads: Pick<QuizLead, "bavic" | "product_slug" | "product_name">[];
  rewards: Pick<Reward, "state" | "product_id">[];
  products: Pick<Product, "id" | "name">[];
};

/* -------------------------------------------------------------------------- */
/* Zdroje dat: kritické vs. degradovatelné                                     */
/* -------------------------------------------------------------------------- */

/** Z odpovědi Supabase čteme jen řádky a hlášku chyby — nic dalšího. */
export type HealingSourceResponse<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/** Odpovědi na všechny čtyři dotazy, které `GET` dashboardu potřebuje. */
export type HealingDashboardResponses = {
  quiz_hosts: HealingSourceResponse<HealingDashboardInput["hosts"][number]>;
  quiz_leads: HealingSourceResponse<HealingDashboardInput["leads"][number]>;
  rewards: HealingSourceResponse<HealingDashboardInput["rewards"][number]>;
  products: HealingSourceResponse<HealingDashboardInput["products"][number]>;
};

export type HealingDashboardTable = keyof HealingDashboardResponses;

/**
 * `critical` = zdroj pravdy pro provozní KPI. Když se nenačte, musí request
 * spadnout na 500 — prázdný dashboard by se tvářil jako „na baru je klid“.
 * `degradable` = doplněk, bez kterého dashboard dává smysl dál.
 */
export type HealingSourceKind = "critical" | "degradable";

/**
 * Kritičnost je vlastnost zdroje, ne volajícího — proto je tady jako data a ne
 * jako `if` u každého dotazu v route handleru.
 *
 * `quiz_hosts` je jediná tolerovaná tabulka: nese jen volbu varianty kvízu,
 * může chybět, dokud neproběhne migrace 004, a zákaznický kvíz na ní nesmí
 * stát (bez ní se jede `DEFAULT_QUIZ_VARIANT`). Počty kupónů, odměn a názvy
 * produktů naopak žádný fallback nemají — nula z chyby je nerozeznatelná od
 * skutečné nuly, a podle takového čísla by se rozhodovalo na baru.
 */
export const HEALING_DASHBOARD_SOURCES: Record<
  HealingDashboardTable,
  HealingSourceKind
> = {
  quiz_hosts: "degradable",
  quiz_leads: "critical",
  rewards: "critical",
  products: "critical",
};

/**
 * Kritický zdroj se nenačetl.
 *
 * `table` a `detail` jsou jen pro serverový log — klientovi route posílá
 * krátkou hlášku bez názvu tabulky a bez detailu z databáze.
 */
export class HealingSourceError extends Error {
  readonly table: HealingDashboardTable;
  readonly detail: string;

  constructor(table: HealingDashboardTable, detail: string) {
    super(`kritický zdroj ${table} se nenačetl: ${detail}`);
    this.name = "HealingSourceError";
    this.table = table;
    this.detail = detail;
  }
}

/** Zdroj, který selhal, ale dashboard jde dál — route to zaloguje. */
export type HealingDegradedSource = {
  table: HealingDashboardTable;
  message: string;
};

export type HealingDashboardCollectResult = {
  input: HealingDashboardInput;
  degraded: HealingDegradedSource[];
};

/** Když `data` chybí bez chyby, hláška do logu musí být pořád konkrétní. */
const BEZ_RADKU = "dotaz nevrátil žádné řádky";

function radkyZdroje<T>(
  tabulka: HealingDashboardTable,
  odpoved: HealingSourceResponse<T>,
  degradovane: HealingDegradedSource[],
): T[] {
  // `data: null` bez chyby PostgREST u `select` nevrací; kdyby přece, je to
  // taky selhání — prázdno se nesmí nikdy dovodit, jen skutečně přečíst.
  const hlaska = odpoved.error?.message ?? (odpoved.data === null ? BEZ_RADKU : null);
  if (hlaska === null) return odpoved.data ?? [];

  if (HEALING_DASHBOARD_SOURCES[tabulka] === "critical") {
    throw new HealingSourceError(tabulka, hlaska);
  }
  degradovane.push({ table: tabulka, message: hlaska });
  return [];
}

/**
 * Přebere odpovědi čtyř dotazů a složí vstup pro `buildHealingDashboard`.
 *
 * Hází `HealingSourceError`, jakmile selže kritický zdroj — tím se z chyby
 * stane 500 místo úspěšné odpovědi s nulami. Degradované zdroje vrací
 * v `degraded`, ať je route zaloguje (modul zůstává bez I/O, aby se dal
 * testovat v `scripts/check-healing-bridge.ts`).
 */
export function collectHealingDashboardInput(
  responses: HealingDashboardResponses,
): HealingDashboardCollectResult {
  const degraded: HealingDegradedSource[] = [];
  return {
    input: {
      hosts: radkyZdroje("quiz_hosts", responses.quiz_hosts, degraded),
      leads: radkyZdroje("quiz_leads", responses.quiz_leads, degraded),
      rewards: radkyZdroje("rewards", responses.rewards, degraded),
      products: radkyZdroje("products", responses.products, degraded),
    },
    degraded,
  };
}

/* -------------------------------------------------------------------------- */
/* Agregace                                                                    */
/* -------------------------------------------------------------------------- */

/** Nejvíc vybíraný první; při stejném počtu rozhoduje klíč, ať je pořadí stabilní. */
function podlePoctu<T extends { count: number }>(
  klic: (polozka: T) => string,
): (a: T, b: T) => number {
  return (a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const ka = klic(a);
    const kb = klic(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  };
}

/** Neznámá varianta (nespuštěná migrace, ruční zásah v DB) → `microbiom`. */
function normalizovatVariantu(hodnota: unknown): QuizVariant | null {
  return QUIZ_VARIANTS.find((v) => v === hodnota) ?? null;
}

/**
 * Sestaví statistiky pro healing.app.
 *
 * Baviči se vždy berou z `BAVICI` (všech 6, v jejich pořadí) — `quiz_hosts`
 * jen doplňuje variantu. Chybějící řádek proto nic nerozbije, i když migrace
 * 004 ještě neproběhla.
 */
export function buildHealingDashboard(
  input: HealingDashboardInput,
): HealingDashboardData {
  const variantaBavice = new Map<string, QuizVariant>();
  for (const radek of input.hosts) {
    const varianta = normalizovatVariantu(radek.variant);
    if (varianta) variantaBavice.set(radek.code, varianta);
  }

  const hosts: HealingHostStats[] = BAVICI.map((bavic) => {
    const leady = input.leads.filter((lead) => lead.bavic === bavic.kod);

    const produkty = new Map<string, HealingHostProduct>();
    for (const lead of leady) {
      const stavajici = produkty.get(lead.product_slug);
      if (stavajici) {
        stavajici.count += 1;
        continue;
      }
      // Název je denormalizovaný už při zápisu leadu — katalog netřeba.
      produkty.set(lead.product_slug, {
        slug: lead.product_slug,
        name: lead.product_name,
        count: 1,
      });
    }

    return {
      code: bavic.kod,
      slug: bavic.slug,
      name: bavic.jmeno,
      variant: variantaBavice.get(bavic.kod) ?? DEFAULT_QUIZ_VARIANT,
      coupons: leady.length,
      products: [...produkty.values()].sort(podlePoctu((p) => p.slug)),
    };
  });

  const vydane = input.rewards.filter((r) => r.state === "redeemed");
  const nazvyProduktu = new Map(input.products.map((p) => [p.id, p.name]));

  const podleProduktu = new Map<string, HealingLoyaltyProduct>();
  for (const odmena of vydane) {
    // Bez produktu se výdej nedá přiřadit; smazaný produkt neumíme pojmenovat.
    if (!odmena.product_id) continue;
    const nazev = nazvyProduktu.get(odmena.product_id);
    if (nazev === undefined) continue;

    const stavajici = podleProduktu.get(odmena.product_id);
    if (stavajici) {
      stavajici.count += 1;
      continue;
    }
    podleProduktu.set(odmena.product_id, {
      id: odmena.product_id,
      name: nazev,
      count: 1,
    });
  }

  return {
    hosts,
    loyalty: {
      redeemedTotal: vydane.length,
      byProduct: [...podleProduktu.values()].sort(podlePoctu((p) => p.id)),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Validace POST /quiz-variant                                                 */
/* -------------------------------------------------------------------------- */

export type QuizVariantUpdateInput = {
  bavic: string;
  variant: QuizVariant;
  /** Kdo změnu udělal — jen popiska do auditu, oprávnění řeší healing.app. */
  actor: string;
};

export type QuizVariantUpdateResult =
  | { ok: true; data: QuizVariantUpdateInput }
  | { ok: false; status: number; error: string };

/** Delší `actor` neodmítáme, jen ho zkrátíme — je to jen popiska. */
const ACTOR_MAX = 200;

/**
 * Zvaliduje tělo požadavku na změnu varianty kvízu.
 *
 * Rozlišuje 400 (rozbitý tvar požadavku) od 404 (neznámý bavič). Kód baviče
 * se porovnává case-sensitive, protože v `quiz_leads.bavic` i
 * `quiz_hosts.code` je velkými (`A1`, ne `a1`).
 */
export function parseQuizVariantUpdate(body: unknown): QuizVariantUpdateResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, status: 400, error: "čekáme JSON objekt" };
  }

  const telo = body as Record<string, unknown>;
  const bavic = typeof telo.bavic === "string" ? telo.bavic.trim() : "";
  const actor = typeof telo.actor === "string" ? telo.actor.trim() : "";

  if (bavic === "") {
    return { ok: false, status: 400, error: "chybí kód baviče (bavic)" };
  }
  if (actor === "") {
    return { ok: false, status: 400, error: "chybí actor" };
  }

  const variant = normalizovatVariantu(telo.variant);
  if (!variant) {
    return {
      ok: false,
      status: 400,
      error: `neznámá varianta kvízu, čekáme ${QUIZ_VARIANTS.join(" | ")}`,
    };
  }

  if (!BAVICI.some((b) => b.kod === bavic)) {
    return { ok: false, status: 404, error: "neznámý bavič" };
  }

  return {
    ok: true,
    data: { bavic, variant, actor: actor.slice(0, ACTOR_MAX) },
  };
}
