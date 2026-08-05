/**
 * Kontrola interního API pro healing.app — autorizace, validace a agregace.
 *
 * Auth (fail closed):
 *   - chybí/prázdný `HEALING_BRIDGE_SECRET` na serveru odmítne i správně
 *     vypadající hlavičku,
 *   - chybějící hlavička, špatný prefix, jiný token nebo jiná délka odmítne,
 *   - správná hlavička se správně nastaveným secretem projde.
 * Validace `POST /quiz-variant` (`parseQuizVariantUpdate`):
 *   - rozbitý tvar těla, chybějící `bavic`/`actor`, neznámá varianta → 400,
 *   - neznámý bavič → 404,
 *   - platné tělo projde a `actor` se zkrátí na strop.
 * Agregace `GET` (`buildHealingDashboard`):
 *   - odpověď obsahuje jen povolené klíče — žádné osobní údaje,
 *   - kupóny a produkty per bavič se sčítají správně,
 *   - bavič bez řádku v `quiz_hosts` spadá na `DEFAULT_QUIZ_VARIANT`,
 *   - `loyalty.redeemedTotal` počítá jen `state === "redeemed"`,
 *   - odměna bez `product_id` nebo se smazaným produktem se do `byProduct`
 *     nezapočítá, ale do `redeemedTotal` ano.
 * Kritické vs. degradovatelné zdroje (`collectHealingDashboardInput`):
 *   - selhání `quiz_leads`, `rewards` nebo `products` vyhodí
 *     `HealingSourceError` (route ji převede na 500) — nikdy 200 s nulami,
 *   - selhání `quiz_hosts` dashboard nezastaví (migrace 004 nemusela
 *     proběhnout a zákaznický kvíz musí zůstat dostupný),
 *   - kritický zdroj bez řádků a bez chyby je taky selhání,
 *   - degradovat se smí jen `quiz_hosts`.
 *
 * Spuštění: `npx tsx scripts/check-healing-bridge.ts`
 */
import { isAuthorizedHealingBridge } from "../src/lib/healing-bridge";
import {
  buildHealingDashboard,
  collectHealingDashboardInput,
  HEALING_DASHBOARD_SOURCES,
  HealingSourceError,
  parseQuizVariantUpdate,
  type HealingDashboardResponses,
  type HealingDashboardTable,
} from "../src/lib/healing-dashboard";
import { BAVICI } from "../src/lib/kviz";

const chyby: string[] = [];
let kontrol = 0;

function overit(popis: string, podminka: boolean): void {
  kontrol += 1;
  if (!podminka) chyby.push(popis);
}

/* --- Auth: fail closed ------------------------------------------------------ */
const PUVODNI_SECRET = process.env.HEALING_BRIDGE_SECRET;

/** Na dobu volání `fn` nastaví `HEALING_BRIDGE_SECRET`; pak hodnotu vrátí zpět. */
function sSecretem<T>(hodnota: string | undefined, fn: () => T): T {
  if (hodnota === undefined) delete process.env.HEALING_BRIDGE_SECRET;
  else process.env.HEALING_BRIDGE_SECRET = hodnota;
  try {
    return fn();
  } finally {
    if (PUVODNI_SECRET === undefined) delete process.env.HEALING_BRIDGE_SECRET;
    else process.env.HEALING_BRIDGE_SECRET = PUVODNI_SECRET;
  }
}

overit(
  "bez secretu na serveru odmítne i správně vypadající hlavičku",
  sSecretem(undefined, () => isAuthorizedHealingBridge("Bearer tajny-klic")) === false,
);
overit(
  "prázdný (jen mezery) secret na serveru odmítne",
  sSecretem("   ", () => isAuthorizedHealingBridge("Bearer   ")) === false,
);
overit(
  "chybějící hlavička odmítne",
  sSecretem("tajny-klic", () => isAuthorizedHealingBridge(null)) === false,
);
overit(
  'hlavička bez "Bearer " prefixu odmítne',
  sSecretem("tajny-klic", () => isAuthorizedHealingBridge("tajny-klic")) === false,
);
overit(
  "token jiné délky odmítne",
  sSecretem("tajny-klic", () => isAuthorizedHealingBridge("Bearer tajny-klic-delsi")) ===
    false,
);
overit(
  "token stejné délky, ale jiný obsah odmítne",
  sSecretem("tajny-klic", () => isAuthorizedHealingBridge("Bearer tajny-kliC")) === false,
);
overit(
  "správný token se správně nastaveným secretem projde",
  sSecretem("tajny-klic", () => isAuthorizedHealingBridge("Bearer tajny-klic")) === true,
);

/* --- Validace POST /quiz-variant -------------------------------------------- */
overit("null tělo => 400", parseQuizVariantUpdate(null).ok === false);
overit("pole => 400", parseQuizVariantUpdate([]).ok === false);
overit(
  "chybí bavic => 400",
  (() => {
    const r = parseQuizVariantUpdate({ variant: "profil", actor: "Atrey" });
    return r.ok === false && r.status === 400;
  })(),
);
overit(
  "chybí actor => 400",
  (() => {
    const r = parseQuizVariantUpdate({ bavic: "A1", variant: "profil" });
    return r.ok === false && r.status === 400;
  })(),
);
overit(
  "neznámá varianta => 400",
  (() => {
    const r = parseQuizVariantUpdate({ bavic: "A1", variant: "diagnoza", actor: "Atrey" });
    return r.ok === false && r.status === 400;
  })(),
);
overit(
  "neznámý bavič => 404",
  (() => {
    const r = parseQuizVariantUpdate({ bavic: "Z9", variant: "profil", actor: "Atrey" });
    return r.ok === false && r.status === 404;
  })(),
);
for (const kod of ["G7", "H8", "I9"]) {
  overit(
    `nový bavič ${kod} smí přepnout variantu`,
    parseQuizVariantUpdate({ bavic: kod, variant: "profil", actor: "Atrey" }).ok === true,
  );
}
// Samostatné vstupy nejsou baviči: v dashboardu healing.app se nenabízejí,
// takže je bridge nesmí ani přijmout. Variantu `TYM`/`VIT` mění jen SQL.
for (const kod of ["WEB", "TYM", "VIT"]) {
  overit(
    `sdílený vstup ${kod} bridge odmítne jako neznámého baviče`,
    (() => {
      const r = parseQuizVariantUpdate({ bavic: kod, variant: "profil", actor: "Atrey" });
      return r.ok === false && r.status === 404;
    })(),
  );
}
overit(
  "platné tělo projde a actor se zkrátí na 200 znaků",
  (() => {
    const r = parseQuizVariantUpdate({
      bavic: BAVICI[0].kod,
      variant: "profil",
      actor: "x".repeat(500),
    });
    return r.ok === true && r.data.actor.length === 200;
  })(),
);

/* --- Agregace GET ------------------------------------------------------------ */
const vstup = {
  hosts: [{ code: "A1", variant: "profil" as const }],
  leads: [
    { bavic: "A1", product_slug: "NTR250", product_name: "Cocofir Young Coconut BIO" },
    { bavic: "A1", product_slug: "NTR250", product_name: "Cocofir Young Coconut BIO" },
    { bavic: "B2", product_slug: "VODA1", product_name: "Thajská raw kokosová voda BIO" },
  ],
  rewards: [
    { state: "redeemed" as const, product_id: "p1" },
    { state: "redeemed" as const, product_id: "p1" },
    { state: "ready" as const, product_id: "p2" },
    { state: "redeemed" as const, product_id: null },
  ],
  products: [{ id: "p1", name: "Cocofir Young Coconut BIO" }],
};

const vysledek = buildHealingDashboard(vstup);

overit("všichni baviči z BAVICI jsou v odpovědi", vysledek.hosts.length === BAVICI.length);
overit(
  "noví baviči G7–I9 mají v dashboardu vlastní řádek",
  ["G7", "H8", "I9"].every((kod) => vysledek.hosts.some((h) => h.code === kod)),
);
overit(
  "samostatné vstupy WEB, TYM a VIT se do dashboardu nepočítají jako baviči",
  !vysledek.hosts.some((h) => ["WEB", "TYM", "VIT"].includes(h.code)),
);
overit(
  "nový bavič bez řádku v quiz_hosts spadá na microbiom",
  vysledek.hosts.find((h) => h.code === "G7")?.variant === "microbiom",
);

const a1 = vysledek.hosts.find((h) => h.code === "A1");
overit("A1 má nastavenou variantu profil", a1?.variant === "profil");
overit("A1 má 2 kupóny", a1?.coupons === 2);
overit(
  "A1 má jeden produkt se sečteným počtem 2",
  a1?.products.length === 1 && a1.products[0].count === 2,
);

const b2 = vysledek.hosts.find((h) => h.code === "B2");
overit("B2 bez řádku v quiz_hosts spadá na microbiom", b2?.variant === "microbiom");

const c3 = vysledek.hosts.find((h) => h.code === "C3");
overit("bavič bez leadů má 0 kupónů", c3?.coupons === 0);

overit(
  "redeemedTotal počítá jen redeemed řádky (i bez product_id)",
  vysledek.loyalty.redeemedTotal === 3,
);
overit(
  "byProduct ignoruje odměnu se smazaným/neznámým produktem",
  vysledek.loyalty.byProduct.length === 1 && vysledek.loyalty.byProduct[0].count === 2,
);

/* --- Kritické vs. degradovatelné zdroje ------------------------------------- */

/** Zdravé odpovědi Supabase pro všechny čtyři zdroje dashboardu. */
function odpovediOk(): HealingDashboardResponses {
  return {
    quiz_hosts: { data: [...vstup.hosts], error: null },
    quiz_leads: { data: [...vstup.leads], error: null },
    rewards: { data: [...vstup.rewards], error: null },
    products: { data: [...vstup.products], error: null },
  };
}

/**
 * Odpovědi, ve kterých jeden zdroj nevrátil řádky — buď s chybou, nebo
 * `data: null` bez chyby (to PostgREST u `select` nedělá, ale tichá nula
 * z takové odpovědi je přesně ten scénář, který nesmí projít jako úspěch).
 */
function bezRadku(
  tabulka: HealingDashboardTable,
  error: { message: string } | null,
): HealingDashboardResponses {
  const o = odpovediOk();
  const selhani = { data: null, error };
  return {
    quiz_hosts: tabulka === "quiz_hosts" ? selhani : o.quiz_hosts,
    quiz_leads: tabulka === "quiz_leads" ? selhani : o.quiz_leads,
    rewards: tabulka === "rewards" ? selhani : o.rewards,
    products: tabulka === "products" ? selhani : o.products,
  };
}

/** Vrátí chybu, kterou volání hodilo — nebo `null`, když neháže. */
function chybaZ(fn: () => unknown): unknown {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
}

const sberOk = collectHealingDashboardInput(odpovediOk());
overit("zdravé odpovědi nehlásí žádný degradovaný zdroj", sberOk.degraded.length === 0);
overit(
  "zdravé odpovědi projdou beze změny počtu řádků",
  sberOk.input.hosts.length === vstup.hosts.length &&
    sberOk.input.leads.length === vstup.leads.length &&
    sberOk.input.rewards.length === vstup.rewards.length &&
    sberOk.input.products.length === vstup.products.length,
);

// Kritické zdroje pravdy: chyba nesmí skončit jako úspěšný prázdný dashboard.
for (const tabulka of ["quiz_leads", "rewards", "products"] as const) {
  const chyba = chybaZ(() =>
    collectHealingDashboardInput(bezRadku(tabulka, { message: "connection reset" })),
  );
  overit(
    `chyba ${tabulka} vyhodí HealingSourceError (route vrátí 500, ne 200 s nulami)`,
    chyba instanceof HealingSourceError,
  );
  overit(
    `HealingSourceError u ${tabulka} pojmenuje tabulku a nese detail jen pro log`,
    chyba instanceof HealingSourceError &&
      chyba.table === tabulka &&
      chyba.detail === "connection reset",
  );
}

overit(
  "kritický zdroj bez řádků a bez chyby taky selže (žádné tiché nuly)",
  chybaZ(() => collectHealingDashboardInput(bezRadku("quiz_leads", null))) instanceof
    HealingSourceError,
);

// `quiz_hosts` je jediná tolerovaná: bez migrace 004 musí kvíz i dashboard jet.
const sberBezHostu = collectHealingDashboardInput(
  bezRadku("quiz_hosts", { message: 'relation "quiz_hosts" does not exist' }),
);
overit(
  "chyba quiz_hosts sběr nezastaví, jen vyprázdní seznam variant",
  sberBezHostu.input.hosts.length === 0,
);
overit(
  "chyba quiz_hosts se ohlásí jako degradovaný zdroj s hláškou pro serverový log",
  sberBezHostu.degraded.length === 1 &&
    sberBezHostu.degraded[0].table === "quiz_hosts" &&
    sberBezHostu.degraded[0].message === 'relation "quiz_hosts" does not exist',
);
overit(
  "quiz_hosts bez řádků a bez chyby degraduje taky",
  (() => {
    const s = collectHealingDashboardInput(bezRadku("quiz_hosts", null));
    return s.input.hosts.length === 0 && s.degraded.length === 1;
  })(),
);
overit(
  "bez quiz_hosts jsou všichni baviči na microbiom, ale počty zůstávají správné",
  (() => {
    const d = buildHealingDashboard(sberBezHostu.input);
    return (
      d.hosts.length === BAVICI.length &&
      d.hosts.every((h) => h.variant === "microbiom") &&
      d.hosts.find((h) => h.code === "A1")?.coupons === 2 &&
      d.loyalty.redeemedTotal === 3
    );
  })(),
);

overit(
  "degradovat se smí jen quiz_hosts — ostatní zdroje jsou kritické",
  Object.entries(HEALING_DASHBOARD_SOURCES)
    .filter(([, druh]) => druh === "degradable")
    .map(([tabulka]) => tabulka)
    .join(",") === "quiz_hosts",
);

/* --- Bez osobních údajů ----------------------------------------------------- */
const POVOLENE_KLICE_HOST = new Set(["code", "slug", "name", "variant", "coupons", "products"]);
const POVOLENE_KLICE_PRODUKT = new Set(["slug", "name", "count"]);
const POVOLENE_KLICE_LOYALTY_PRODUKT = new Set(["id", "name", "count"]);

for (const host of vysledek.hosts) {
  overit(
    `host ${host.code} nemá cizí klíče`,
    Object.keys(host).every((k) => POVOLENE_KLICE_HOST.has(k)),
  );
  for (const p of host.products) {
    overit(
      `produkt ${p.slug} u ${host.code} nemá cizí klíče`,
      Object.keys(p).every((k) => POVOLENE_KLICE_PRODUKT.has(k)),
    );
  }
}
for (const p of vysledek.loyalty.byProduct) {
  overit(
    `loyalty produkt ${p.id} nemá cizí klíče`,
    Object.keys(p).every((k) => POVOLENE_KLICE_LOYALTY_PRODUKT.has(k)),
  );
}

if (chyby.length > 0) {
  console.error(`✗ check-healing-bridge: ${chyby.length} chyb z ${kontrol} kontrol`);
  for (const c of chyby) console.error(`  · ${c}`);
  process.exit(1);
}

console.log(
  `✓ check-healing-bridge: ${kontrol}/${kontrol} kontrol OK ` +
    `(auth fail-closed, validace POST /quiz-variant, agregace GET beze PII)`,
);
