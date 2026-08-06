/**
 * Kontrola dvou nových sekcí rozcestníku a cesty z kvízu do appky.
 *
 *   A) výherní obrazovka obou kvízů nabízí pokračování do appky,
 *   B) „Dárek přátelům“ — schválené texty beze změny + statické QR PNG,
 *   C) kredit hostů přes bridge Healing.app — fail-closed klient, telefon
 *      výhradně ze session a žádný secret v klientském bundlu.
 *
 * Bridge se testuje s podstrčeným `fetch` (žádná síť), stejně jako SMS
 * v `lib/phone-auth-server.ts`.
 *
 * Spuštění: `npx tsx scripts/check-darek-kredit.ts`
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DAREK_KVIZ_ODKAZ_TEXT,
  DAREK_KVIZ_URL,
  DAREK_NADPIS,
  DAREK_PODTEXT,
  DAREK_QR_SOUBOR,
} from "../src/lib/darek";
import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";
import {
  KREDIT_NEDOSTUPNY,
  KREDIT_NENI,
  nacistStavKreditu,
  normalizovatPolozky,
  objednatZKreditu,
  parsovatStavKreditu,
  vydatObjednavku,
  type FetchLike,
} from "../src/lib/healing-credit";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (cesta: string) => readFileSync(join(root, cesta), "utf8");

const darek = read("src/app/darek/page.tsx");
const kredit = read("src/app/kredit/page.tsx");
const homepage = read("src/app/page.tsx");
const kvizFlow = read("src/components/KvizFlow.tsx");
const kvizProfil = read("src/components/KvizFlowProfil.tsx");
const routeObjednat = read("src/app/api/kredit/objednat/route.ts");
const routeVydat = read("src/app/api/kredit/vydat/route.ts");
const bridge = read("src/lib/healing-credit.ts");

/* ========================================================================== */
/* A) Z kvízu rovnou do appky                                                 */
/* ========================================================================== */

// CTA i tlačítko nákupu jsou od 6. 8. 2026 ve slovníku. Schválené české znění
// se hlídá tam, v komponentách se hlídá zapojení a pořadí obou akcí.
const CTA = "Pokračovat do Longevity Bar appky →";
assert.equal(cs.kviz.pokracovatDoAppky, CTA, "schválené CTA se nesmí měnit");
assert.equal(cs.kviz.nakoupit, "Nakoupit na wildandcoco.com");
assert.ok(
  en.kviz.pokracovatDoAppky.trim().length > 0 && en.kviz.nakoupit.trim().length > 0,
  "obě akce musí existovat i anglicky",
);

for (const [jmeno, zdroj] of [
  ["KvizFlow", kvizFlow],
  ["KvizFlowProfil", kvizProfil],
] as const) {
  assert.match(
    zdroj,
    /<Link href="\/" className="tlacitko-vedlejsi[^"]*">\s*\{t\.kviz\.pokracovatDoAppky\}/,
    `${jmeno}: CTA musí vést na rozcestník a být sekundární tlačítko`,
  );
  assert.ok(
    zdroj.indexOf("{t.kviz.nakoupit}") >= 0 &&
      zdroj.indexOf("{t.kviz.nakoupit}") < zdroj.indexOf("{t.kviz.pokracovatDoAppky}"),
    `${jmeno}: nákup zůstává hlavní akcí, appka je až pod ním`,
  );
  assert.match(zdroj, /^import Link from "next\/link";$/m, `${jmeno}: chybí import Link`);
}

// Cesta z kvízu do appky dává smysl jen tehdy, když se session cestou obnoví:
// middleware musí pokrývat i rozcestník a ten musí uživatele skutečně přečíst.
const middleware = read("src/middleware.ts");
assert.match(middleware, /await supabase\.auth\.getUser\(\)/, "middleware musí obnovit session");
assert.match(
  middleware,
  /matcher: \[\s*\/\*[\s\S]*?\*\/\s*"\/\(\(\?!_next\/static/,
  "matcher musí pokrývat i „/“ (vyjmenované jsou jen statické soubory)",
);
assert.match(homepage, /getSessionUser\(\)/, "rozcestník musí znát přihlášeného hosta");

/* ========================================================================== */
/* B) Dárek přátelům                                                          */
/* ========================================================================== */

assert.equal(
  DAREK_NADPIS,
  "Daruj kamarádům slevu 21 % na vybraný produkt, až do konce roku!",
  "schválený nadpis se nesmí měnit",
);
assert.equal(
  DAREK_PODTEXT,
  "Ať si jejich mikrobiom výská radostí. Ať si načtou tento QR kód a vyplní kvíz :-)",
  "schválený podtext se nesmí měnit",
);
assert.equal(DAREK_KVIZ_URL, "https://bar.peaceandcoco.com/kviz/web");
assert.equal(DAREK_KVIZ_ODKAZ_TEXT, "bar.peaceandcoco.com/kviz/web");
assert.ok(
  DAREK_KVIZ_URL.endsWith(DAREK_KVIZ_ODKAZ_TEXT),
  "zobrazený odkaz musí odpovídat cíli QR kódu",
);

// Adresa QR a soubor jsou pořád konstanty; texty přešly do slovníku, který je
// z těch konstant PŘEBÍRÁ (hlídá `check-i18n.ts`). Ověří se tedy obojí.
for (const konstanta of ["DAREK_QR_SOUBOR", "DAREK_KVIZ_URL"]) {
  assert.ok(
    darek.includes(konstanta),
    `/darek musí brát ${konstanta} z lib/darek.ts, ne opsanou hodnotu`,
  );
}
assert.equal(cs.darek.nadpis, DAREK_NADPIS, "slovník musí přebírat schválený nadpis");
assert.equal(cs.darek.podtext, DAREK_PODTEXT, "slovník musí přebírat schválený podtext");
for (const klic of ["t.darek.nadpis", "t.darek.podtext"]) {
  assert.ok(darek.includes(klic), `/darek musí vykreslit ${klic}`);
}
assert.ok(
  en.darek.nadpis.trim().length > 0 && en.darek.podtext.trim().length > 0,
  "dárek musí mít i anglické znění",
);
// Přihlášení se na `/darek` ČTE (kvůli osobnímu QR), ale nikdy nevyžaduje —
// žádný `redirect()` a statické PNG musí zůstat variantou pro nepřihlášené.
assert.doesNotMatch(darek, /redirect\(/, "/darek musí být viditelný i nepřihlášeným");
assert.match(
  darek,
  /: DAREK_QR_SOUBOR/,
  "/darek musí nepřihlášenému pořád nabídnout statické QR",
);
assert.match(
  darek,
  /\{!user && \(/,
  "/darek musí mít větev pro nepřihlášeného hosta",
);

// QR PNG: existuje, je to opravdu PNG a má zadaných 480 px (IHDR).
const qrCesta = join(root, "public", DAREK_QR_SOUBOR);
assert.ok(existsSync(qrCesta), `chybí ${DAREK_QR_SOUBOR} — vygeneruj ho přes qrcode CLI`);
const qr = readFileSync(qrCesta);
assert.deepEqual(
  [...qr.subarray(0, 8)],
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "QR musí být PNG",
);
assert.equal(qr.readUInt32BE(16), 480, "QR má mít šířku 480 px");
assert.equal(qr.readUInt32BE(20), 480, "QR má mít výšku 480 px");
assert.ok(qr.length > 500, "QR PNG vypadá prázdně");

assert.match(homepage, /href: "\/darek"/, "rozcestník musí mít kartu Dárek přátelům");

/* ========================================================================== */
/* C1) Bridge kreditu — fail-closed                                           */
/* ========================================================================== */

const BASE = "https://healing.example/api/internal/bar-credit";
const SECRET = "tajny-klic";
const TELEFON = "+420601123456";

type Zaznam = { url: string; init: RequestInit | undefined };

/** Falešný `fetch` — zaznamená volání a vrátí připravenou odpověď. */
function fakeFetch(
  odpoved: () => Response,
  zaznamy: Zaznam[] = [],
): FetchLike & { zaznamy: Zaznam[] } {
  const impl = (async (url: string, init?: RequestInit) => {
    zaznamy.push({ url, init });
    return odpoved();
  }) as FetchLike & { zaznamy: Zaznam[] };
  impl.zaznamy = zaznamy;
  return impl;
}

function json(telo: unknown, status = 200): Response {
  return new Response(JSON.stringify(telo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const STAV_OK = {
  eligible: true,
  credit: { total: 1000, spent: 250, remaining: 750 },
  catalog: [
    { id: "c1", n: "Kokosová voda", price: 90 },
    { id: "c2", n: "Cocofir", price: 120 },
  ],
  orders: [
    {
      id: "o1",
      items: [{ id: "c1", n: "Kokosová voda", qty: 2, price: 90 }],
      total: 180,
      createdAt: "2026-08-05T10:00:00Z",
      issuedAt: null,
    },
  ],
};

const PUVODNI = {
  url: process.env.HEALING_CREDIT_BRIDGE_URL,
  secret: process.env.HEALING_BRIDGE_SECRET,
};

/** Na dobu volání nastaví env bridge; pak hodnoty vrátí zpět. */
async function sEnv<T>(
  url: string | undefined,
  secret: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const nastav = (klic: string, hodnota: string | undefined) => {
    if (hodnota === undefined) delete process.env[klic];
    else process.env[klic] = hodnota;
  };
  nastav("HEALING_CREDIT_BRIDGE_URL", url);
  nastav("HEALING_BRIDGE_SECRET", secret);
  try {
    return await fn();
  } finally {
    nastav("HEALING_CREDIT_BRIDGE_URL", PUVODNI.url);
    nastav("HEALING_BRIDGE_SECRET", PUVODNI.secret);
  }
}

/**
 * Asynchronní část kontrol. `tsx` běží v CJS, takže top-level `await` nejde —
 * všechno kolem bridge proto žije tady a spouští se na konci souboru.
 */
async function kontrolyBridge(): Promise<void> {
// Bez konfigurace se nesmí ani zavolat bridge.
for (const [popis, url, secret] of [
  ["bez URL i secretu", undefined, undefined],
  ["bez URL", undefined, SECRET],
  ["bez secretu", BASE, undefined],
  ["s relativní URL", "/api/bar-credit", SECRET],
] as const) {
  const f = fakeFetch(() => json(STAV_OK));
  const stav = await sEnv(url, secret, () => nacistStavKreditu(TELEFON, f));
  assert.deepEqual(stav, KREDIT_NEDOSTUPNY, `${popis}: musí být fail-closed`);
  assert.equal(f.zaznamy.length, 0, `${popis}: bridge se nesmí volat vůbec`);
}

// Neplatný telefon se do bridge nikdy nedostane.
for (const spatny of ["", "601123456", "420601123456", "+420 601 123 456", "+abc"]) {
  const f = fakeFetch(() => json(STAV_OK));
  const stav = await sEnv(BASE, SECRET, () => nacistStavKreditu(spatny, f));
  assert.deepEqual(stav, KREDIT_NEDOSTUPNY, `telefon „${spatny}" musí být odmítnut`);
  assert.equal(f.zaznamy.length, 0, `telefon „${spatny}" se nesmí poslat na bridge`);
}

// Šťastná cesta: správná URL, Bearer secret, no-store a rozparsovaný stav.
{
  const f = fakeFetch(() => json(STAV_OK));
  const stav = await sEnv(BASE, SECRET, () => nacistStavKreditu(TELEFON, f));
  assert.equal(stav.eligible, true);
  assert.deepEqual(stav.credit, { total: 1000, spent: 250, remaining: 750 });
  assert.equal(stav.catalog.length, 2);
  assert.equal(stav.orders[0].issuedAt, null, "nevydaná objednávka zůstává vstupenkou");
  assert.equal(stav.orders[0].items[0].qty, 2);

  const [volani] = f.zaznamy;
  assert.equal(
    volani.url,
    `${BASE}/state?phone=%2B420601123456`,
    "telefon musí být zakódovaný v query",
  );
  assert.equal(
    (volani.init?.headers as Record<string, string>).Authorization,
    `Bearer ${SECRET}`,
  );
  assert.equal(volani.init?.cache, "no-store", "stav kreditu se nesmí cachovat");
}

// Selhání na straně bridge = žádný kredit, nikdy dohadování. Od 6. 8. 2026 se
// navíc rozlišuje „NEVÍME“ (`nedostupny`) od „opravdu nic“ (`neni`) — jen tak
// může /kredit přestat tvrdit hostovi, že nárok nemá, když je rozbitý most.
for (const [popis, odpoved, ocekavano] of [
  ["HTTP 500", () => json({ error: "boom" }, 500), KREDIT_NEDOSTUPNY],
  ["HTTP 401", () => json({ error: "unauthorized" }, 401), KREDIT_NEDOSTUPNY],
  ["nečitelné tělo", () => new Response("<html>", { status: 200 }), KREDIT_NEDOSTUPNY],
  ["eligible bez kreditu", () => json({ eligible: true, credit: null }), KREDIT_NEDOSTUPNY],
  [
    "eligible s rozbitým kreditem",
    () => json({ eligible: true, credit: { total: "x" } }),
    KREDIT_NEDOSTUPNY,
  ],
  ["eligible false", () => json({ eligible: false, credit: null }), KREDIT_NENI],
  ["prázdná odpověď", () => json(null), KREDIT_NEDOSTUPNY],
] as const) {
  const stav = await sEnv(BASE, SECRET, () =>
    nacistStavKreditu(TELEFON, fakeFetch(odpoved)),
  );
  assert.deepEqual(stav, ocekavano, `${popis}: musí skončit bez kreditu`);
  assert.equal(stav.eligible, false, `${popis}: eligible musí zůstat false`);
}

// Oba „prázdné“ stavy se liší JEN dostupností — nikdy obsahem.
assert.equal(KREDIT_NEDOSTUPNY.dostupnost, "nedostupny");
assert.equal(KREDIT_NENI.dostupnost, "neni");
assert.deepEqual(
  { ...KREDIT_NEDOSTUPNY, dostupnost: null },
  { ...KREDIT_NENI, dostupnost: null },
  "oba stavy musí zůstat bez kreditu, katalogu i objednávek",
);
assert.equal(
  parsovatStavKreditu({ eligible: true, credit: { total: 1, spent: 0, remaining: 1 } })
    .dostupnost,
  "kredit",
);

// Výjimka ze sítě nesmí probublat do server komponenty.
{
  const vybuch = (async () => {
    throw new Error("ECONNRESET");
  }) as FetchLike;
  const stav = await sEnv(BASE, SECRET, () => nacistStavKreditu(TELEFON, vybuch));
  assert.deepEqual(stav, KREDIT_NEDOSTUPNY, "výpadek sítě = žádný kredit, žádná výjimka");
}

// Parser: cizí klíče a nesmyslné řádky se zahazují, ne dopočítávají.
{
  const stav = parsovatStavKreditu({
    eligible: true,
    credit: { total: 500, spent: 0, remaining: 500 },
    catalog: [
      { id: "ok", n: "Voda", price: 50 },
      { id: "bez-ceny", n: "Nevím" },
      { n: "bez id", price: 10 },
      "nesmysl",
    ],
    orders: [{ id: "o", items: [{ id: "x", qty: 0 }, { qty: 2 }], total: 0 }],
  });
  assert.equal(stav.catalog.length, 1, "položka bez ceny nebo id se nenabízí");
  assert.equal(stav.orders[0].items.length, 0, "řádek bez množství se zahazuje");
  assert.equal(stav.orders[0].issuedAt, null);
}

/* ========================================================================== */
/* C2) Objednávka a výdej                                                     */
/* ========================================================================== */

assert.equal(normalizovatPolozky([]), null, "prázdná objednávka neprojde");
assert.equal(normalizovatPolozky("nic"), null);
assert.equal(normalizovatPolozky([{ id: "a", qty: 0 }]), null, "nulové množství neprojde");
assert.equal(normalizovatPolozky([{ id: "a", qty: -2 }]), null);
assert.equal(normalizovatPolozky([{ id: "a", qty: 1.5 }]), null, "půlka kusu neprojde");
assert.equal(normalizovatPolozky([{ id: "a", qty: 999 }]), null, "strop množství platí");
assert.equal(normalizovatPolozky([{ qty: 1 }]), null, "položka bez id neprojde");
assert.equal(
  normalizovatPolozky([{ id: "a", qty: 1 }, { id: "a", qty: 2 }]),
  null,
  "duplicitní id neprojde",
);
assert.equal(
  normalizovatPolozky(Array.from({ length: 21 }, (_, i) => ({ id: `p${i}`, qty: 1 }))),
  null,
  "strop počtu položek platí",
);
assert.deepEqual(normalizovatPolozky([{ id: "a", qty: 2 }]), [{ id: "a", qty: 2 }]);

{
  const f = fakeFetch(() => json(STAV_OK));
  const vysledek = await sEnv(BASE, SECRET, () =>
    objednatZKreditu(TELEFON, [{ id: "c1", qty: 2 }], f),
  );
  assert.equal(vysledek.ok, true);
  const [volani] = f.zaznamy;
  assert.equal(volani.url, `${BASE}/order`);
  assert.equal(volani.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(volani.init?.body)), {
    phone: TELEFON,
    items: [{ id: "c1", qty: 2 }],
  });
}

{
  const f = fakeFetch(() => json(STAV_OK));
  const vysledek = await sEnv(BASE, SECRET, () => vydatObjednavku(TELEFON, "o1", f));
  assert.equal(vysledek.ok, true);
  const [volani] = f.zaznamy;
  assert.equal(volani.url, `${BASE}/issue`);
  assert.deepEqual(JSON.parse(String(volani.init?.body)), {
    phone: TELEFON,
    orderId: "o1",
  });
}

// Text z mostu se hostovi NIKDY nepropouští — ani ten „hezký“. Je psaný pro
// jinou appku, není přeložený a může nést technický detail. Host proto vždycky
// vidí vlastní znění Bar.app, jen podle toho, co dělal.
for (const [popis, odpoved] of [
  ["krátká hláška z bridge", () => json({ error: "Nemáš dost kreditu." }, 400)],
  ["bez hlášky", () => json({}, 500)],
  ["cizí HTML", () => new Response("<html>rozbito</html>", { status: 502 })],
  ["konfigurační detail", () => json({ error: "ECONNREFUSED 10.0.0.4:8080" }, 500)],
] as const) {
  const vysledek = await sEnv(BASE, SECRET, () =>
    objednatZKreditu(TELEFON, [{ id: "c1", qty: 1 }], fakeFetch(odpoved)),
  );
  assert.equal(vysledek.ok, false, `${popis}: musí skončit chybou`);
  assert.equal(
    vysledek.ok === false && vysledek.zprava,
    cs.kredit.chybaObjednavky,
    `${popis}: host vidí vlastní hlášku appky`,
  );
}

// Výdej má vlastní hlášku — „objednávku se nepodařilo odeslat“ by u pultu
// obsluhu jen mátlo.
{
  const vydej = await sEnv(BASE, SECRET, () =>
    vydatObjednavku(TELEFON, "o1", fakeFetch(() => json({ error: "boom" }, 500))),
  );
  assert.equal(vydej.ok, false);
  assert.equal(vydej.ok === false && vydej.zprava, cs.chyby.vydejSelhal);
}
}

/* ========================================================================== */
/* C3) Stránka, routy a žádný secret v klientu                                */
/* ========================================================================== */

assert.match(kredit, /redirect\(`\/prihlaseni\?next=/, "/kredit musí vyžadovat přihlášení");
assert.match(kredit, /!stav\.eligible/, "/kredit musí ošetřit hosty bez kreditu");
// Třetí stav: při rozbitém mostu se nesmí tvrdit „nemáš nárok“. Větev musí
// přijít DŘÍV než ta o chybějícím kreditu, jinak by ji nikdy nedosáhla.
assert.match(
  kredit,
  /stav\.dostupnost === "nedostupny"/,
  "/kredit musí rozlišit nedostupný most od chybějícího kreditu",
);
assert.ok(
  kredit.indexOf('stav.dostupnost === "nedostupny"') < kredit.indexOf("!stav.eligible"),
  "větev nedostupného mostu musí předcházet větvi bez kreditu",
);
assert.match(kredit, /<ZkusitZnovu \/>/, "/kredit musí nabídnout opakování načtení");
assert.ok(
  cs.kredit.nedostupnyNadpis.trim().length > 0 &&
    en.kredit.nedostupnyNadpis.trim().length > 0 &&
    cs.kredit.zkusitZnovu.trim().length > 0 &&
    en.kredit.zkusitZnovu.trim().length > 0,
  "třetí stav kreditu musí být dvojjazyčný",
);
assert.doesNotMatch(
  cs.kredit.nedostupnyPopis,
  /nemáš|nárok/i,
  "hláška o nedostupnosti nesmí tvrdit, že host nárok nemá",
);
const zkusitZnovu = read("src/components/ZkusitZnovu.tsx");
assert.match(zkusitZnovu, /router\.refresh\(\)/, "opakování jede přes router.refresh()");
assert.match(kredit, /<ZiveHodiny \/>/, "vstupenka musí mít živé hodiny");
assert.match(
  kredit,
  /endpoint="\/api\/kredit\/vydat"/,
  "výdej musí jít přes vlastní endpoint",
);
assert.match(kredit, /issuedAt === null/, "vstupenka je jen pro nevydanou objednávku");

assert.match(homepage, /kredit\?\.stav\.eligible/, "karta kreditu jen pro eligible hosty");
assert.match(homepage, /href: "\/kredit"/);

for (const [jmeno, route] of [
  ["objednat", routeObjednat],
  ["vydat", routeVydat],
] as const) {
  assert.match(route, /getSessionUser\(\)/, `${jmeno}: musí ověřit session`);
  assert.match(
    route,
    /barCreditProUzivatele\(user\.id\)/,
    `${jmeno}: telefon se bere ze session`,
  );
  assert.doesNotMatch(
    route,
    /telo as \{[^}]*phone/,
    `${jmeno}: telefon se NIKDY nesmí brát z těla requestu`,
  );
  assert.match(route, /status: 401/, `${jmeno}: nepřihlášený dostane 401`);
  assert.match(route, /!stav\.eligible/, `${jmeno}: bez kreditu se nic neposílá dál`);
}
assert.match(
  routeVydat,
  /objednavka\.id === orderId\.trim\(\) && objednavka\.issuedAt === null/,
  "vydat: cizí ani už vydaná objednávka neprojde",
);

// Secret smí znát jen server. Klientské komponenty nesmí modul ani importovat
// jinak než typově (`import type`, který se z bundlu úplně vymaže).
assert.match(
  bridge,
  /typeof window !== "undefined"/,
  "bridge musí mít pojistku proti client bundlu",
);

function souboryTS(adresar: string): string[] {
  return readdirSync(adresar, { withFileTypes: true }).flatMap((polozka) => {
    const cesta = join(adresar, polozka.name);
    if (polozka.isDirectory()) return souboryTS(cesta);
    return /\.tsx?$/.test(polozka.name) && statSync(cesta).isFile() ? [cesta] : [];
  });
}

// Sdílený secret Healing.app zná jen trojice serverových modulů: příchozí
// autorizace, SMS most a nově kredit. Jinde nemá co dělat.
const POVOLENE_ENV_SOUBORY = [
  "src/lib/healing-credit.ts",
  "src/lib/healing-bridge.ts",
  "src/lib/phone-auth-server.ts",
];
for (const soubor of souboryTS(join(root, "src"))) {
  const relativni = soubor.slice(root.length);
  const obsah = readFileSync(soubor, "utf8");

  if (/HEALING_BRIDGE_SECRET|HEALING_CREDIT_BRIDGE_URL/.test(obsah)) {
    assert.ok(
      POVOLENE_ENV_SOUBORY.includes(relativni),
      `${relativni}: konfigurace bridge patří jen do serverového klienta`,
    );
  }

  if (!obsah.startsWith('"use client"')) continue;
  const importyBridge = obsah.match(/^import(?! type).*healing-credit.*$/gm) ?? [];
  assert.deepEqual(
    importyBridge,
    [],
    `${relativni}: klientská komponenta smí z healing-credit brát jen typy`,
  );
}

// Fail-closed cesty schválně logují varování (to je jejich smysl) — v suite by
// ale jen zašuměly výstup, takže je na dobu testu bridge ztlumíme.
const puvodniWarn = console.warn;
console.warn = () => {};

kontrolyBridge()
  .finally(() => {
    console.warn = puvodniWarn;
  })
  .then(
    () =>
      console.log(
        "✓ darek + kredit checks OK (CTA v obou kvízech, schválené texty + QR 480 px, bridge fail-closed)",
      ),
    (chyba) => {
      console.error("✗ check-darek-kredit:", chyba);
      process.exit(1);
    },
  );
