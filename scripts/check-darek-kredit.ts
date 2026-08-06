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
  zrusitObjednavku,
  type FetchLike,
} from "../src/lib/healing-credit";
import {
  MAX_ZALOH,
  VSTUPENKY_ID,
  normalizovatZalohy,
  predvyplneneZalohy,
} from "../src/lib/kredit-ui";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (cesta: string) => readFileSync(join(root, cesta), "utf8");

const darek = read("src/app/darek/page.tsx");
const kredit = read("src/app/kredit/page.tsx");
const homepage = read("src/app/page.tsx");
const kvizFlow = read("src/components/KvizFlow.tsx");
const kvizProfil = read("src/components/KvizFlowProfil.tsx");
const routeObjednat = read("src/app/api/kredit/objednat/route.ts");
const routeVydat = read("src/app/api/kredit/vydat/route.ts");
const routeZrusit = read("src/app/api/kredit/zrusit/route.ts");
const bridge = read("src/lib/healing-credit.ts");
const zrusitKomponenta = read("src/components/ZrusitObjednavku.tsx");
const objednavkaKomponenta = read("src/components/KreditObjednavka.tsx");
const vydejKomponenta = read("src/components/VydejKreditu.tsx");

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
  const vysledek = await sEnv(BASE, SECRET, () =>
    vydatObjednavku(TELEFON, "o1", null, f),
  );
  assert.equal(vysledek.ok, true);
  const [volani] = f.zaznamy;
  assert.equal(volani.url, `${BASE}/issue`);
  // Bez zadaných záloh se klíč `zalohy` VŮBEC neposílá — nula by pro most
  // znamenala „obsluha vědomě řekla žádné kelímky“, což by nebyla pravda.
  assert.deepEqual(JSON.parse(String(volani.init?.body)), {
    phone: TELEFON,
    orderId: "o1",
  });
}

/* --- Zálohované kelímky ve výdeji ----------------------------------------- */
{
  const f = fakeFetch(() => json(STAV_OK));
  await sEnv(BASE, SECRET, () => vydatObjednavku(TELEFON, "o1", 3, f));
  assert.deepEqual(JSON.parse(String(f.zaznamy[0].init?.body)), {
    phone: TELEFON,
    orderId: "o1",
    zalohy: 3,
  });
}
// Nula je legitimní vědomá volba pokladní a MUSÍ se odeslat.
{
  const f = fakeFetch(() => json(STAV_OK));
  await sEnv(BASE, SECRET, () => vydatObjednavku(TELEFON, "o1", 0, f));
  assert.deepEqual(JSON.parse(String(f.zaznamy[0].init?.body)), {
    phone: TELEFON,
    orderId: "o1",
    zalohy: 0,
  });
}
// Nesmysl se na most nepropustí — raději bez klíče než se špatným číslem.
for (const spatne of [-1, 21, 2.5, Number.NaN]) {
  const f = fakeFetch(() => json(STAV_OK));
  await sEnv(BASE, SECRET, () => vydatObjednavku(TELEFON, "o1", spatne, f));
  assert.deepEqual(
    JSON.parse(String(f.zaznamy[0].init?.body)),
    { phone: TELEFON, orderId: "o1" },
    `zálohy „${spatne}" se nesmí dostat na most`,
  );
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
    vydatObjednavku(
      TELEFON,
      "o1",
      null,
      fakeFetch(() => json({ error: "boom" }, 500)),
    ),
  );
  assert.equal(vydej.ok, false);
  assert.equal(vydej.ok === false && vydej.zprava, cs.chyby.vydejSelhal);
}

/* -------------------------------------------------------------------------- */
/* C2b) Zrušení nevydané objednávky (bridge `POST /cancel`)                    */
/* -------------------------------------------------------------------------- */
// Endpoint na straně Healing.app se staví paralelně, takže se tu testuje
// výhradně proti podstrčenému `fetch` — stejně jako objednávka a výdej.

// Šťastná cesta: `/cancel`, POST, Bearer secret, no-store a tělo {phone, orderId}.
{
  const f = fakeFetch(() => json(STAV_OK));
  const vysledek = await sEnv(BASE, SECRET, () =>
    zrusitObjednavku(TELEFON, "o1", f),
  );
  assert.equal(vysledek.ok, true);
  const [volani] = f.zaznamy;
  assert.equal(volani.url, `${BASE}/cancel`, "zrušení jde na /cancel");
  assert.equal(volani.init?.method, "POST");
  assert.equal(volani.init?.cache, "no-store", "zrušení se nesmí cachovat");
  assert.equal(
    (volani.init?.headers as Record<string, string>).Authorization,
    `Bearer ${SECRET}`,
  );
  assert.deepEqual(JSON.parse(String(volani.init?.body)), {
    phone: TELEFON,
    orderId: "o1",
  });
}

// Fail-closed: bez konfigurace, s nesmyslným telefonem i bez orderId se most
// nesmí zavolat vůbec — a host vždycky vidí hlášku Bar.app o zrušení.
for (const [popis, url, secret, telefon, orderId] of [
  ["bez konfigurace", undefined, undefined, TELEFON, "o1"],
  ["bez secretu", BASE, undefined, TELEFON, "o1"],
  ["neplatný telefon", BASE, SECRET, "601123456", "o1"],
  ["prázdné orderId", BASE, SECRET, TELEFON, "   "],
] as const) {
  const f = fakeFetch(() => json(STAV_OK));
  const vysledek = await sEnv(url, secret, () =>
    zrusitObjednavku(telefon, orderId, f),
  );
  assert.equal(vysledek.ok, false, `${popis}: zrušení musí být fail-closed`);
  assert.equal(
    vysledek.ok === false && vysledek.zprava,
    cs.kredit.chybaZruseni,
    `${popis}: host vidí vlastní hlášku o zrušení`,
  );
  assert.equal(f.zaznamy.length, 0, `${popis}: bridge se nesmí volat vůbec`);
}

// Odmítnutí i výpadek mostu končí stejnou hláškou — nikdy textem z Healing.app.
for (const [popis, odpoved] of [
  ["už vydaná (409)", () => json({ error: "already issued" }, 409)],
  ["HTTP 500", () => json({}, 500)],
  ["cizí HTML", () => new Response("<html>rozbito</html>", { status: 502 })],
  ["konfigurační detail", () => json({ error: "ECONNREFUSED 10.0.0.4" }, 500)],
] as const) {
  const vysledek = await sEnv(BASE, SECRET, () =>
    zrusitObjednavku(TELEFON, "o1", fakeFetch(odpoved)),
  );
  assert.equal(vysledek.ok, false, `${popis}: musí skončit chybou`);
  assert.equal(
    vysledek.ok === false && vysledek.zprava,
    cs.kredit.chybaZruseni,
    `${popis}: text z mostu se hostovi nepropouští`,
  );
}

// Výjimka ze sítě nesmí probublat ven ze zrušení.
{
  const vybuch = (async () => {
    throw new Error("ECONNRESET");
  }) as FetchLike;
  const vysledek = await sEnv(BASE, SECRET, () =>
    zrusitObjednavku(TELEFON, "o1", vybuch),
  );
  assert.equal(vysledek.ok, false, "výpadek sítě = neúspěch, žádná výjimka");
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
// Výdej se od 6. 8. 2026 skládá ve `VydejKreditu` (stepper záloh + VYDAT),
// takže endpoint hlídáme tam, ne na stránce.
assert.match(
  vydejKomponenta,
  /endpoint="\/api\/kredit\/vydat"/,
  "výdej musí jít přes vlastní endpoint",
);
assert.match(kredit, /issuedAt === null/, "vstupenka je jen pro nevydanou objednávku");

assert.match(homepage, /kredit\?\.stav\.eligible/, "karta kreditu jen pro eligible hosty");
assert.match(homepage, /href: "\/kredit"/);

/* --- Banner se zůstatkem nad kartami (6. 8. 2026) -------------------------- */
// Banner smí vyjet JEN tehdy, když most kredit potvrdil. Při `nedostupny`
// (i při `neni`) se nesmí objevit vůbec — rozcestník není místo na chybové
// hlášky o něčem, s čím host nic neudělá.
assert.match(
  homepage,
  /kredit\?\.stav\.dostupnost === "kredit"/,
  "banner kreditu se řídí dostupností, ne jen `eligible`",
);
assert.doesNotMatch(
  homepage,
  /dostupnost === "nedostupny"/,
  "rozcestník nesmí mít vlastní větev pro nedostupný most — prostě mlčí",
);
assert.match(
  homepage,
  /zbyvaKredit !== null && \(/,
  "banner se vykresluje jen se známým zůstatkem",
);
assert.match(
  homepage,
  /\{t\.rozcestnik\.kreditBanner\(korun\(zbyvaKredit\)\)\}/,
  "banner musí ukázat zbývající částku ze slovníku",
);
assert.ok(
  homepage.indexOf("zbyvaKredit !== null && (") < homepage.indexOf("<nav aria-label"),
  "banner patří NAD karty rozcestníku",
);
assert.ok(
  cs.rozcestnik.kreditBanner("500 Kč").includes("500 Kč") &&
    en.rozcestnik.kreditBanner("500 Kč").includes("500 Kč"),
  "banner musí částku propsat v obou jazycích",
);
assert.match(cs.rozcestnik.kreditBanner("500 Kč"), /kredit/i, "cs banner mluví o kreditu");
assert.match(en.rozcestnik.kreditBanner("500 Kč"), /credit/i, "en banner mluví o kreditu");

/* --- Historie objednávek je sbalená a kompaktní ---------------------------- */
assert.match(
  kredit,
  /<details className="karta">/,
  "historie kreditních objednávek musí být sbalený <details> blok",
);
assert.doesNotMatch(kredit, /<details[^>]*\sopen/, "historie musí být defaultně SBALENÁ");
assert.match(
  kredit,
  /\{t\.kredit\.historieNadpis\}/,
  "sbalená historie musí mít nadpis ze slovníku",
);
assert.ok(
  cs.kredit.historieNadpis === "Historie kreditních objednávek" &&
    en.kredit.historieNadpis === "Credit order history",
  "schválené znění nadpisu historie",
);
// Kompaktní řádek = datum a čas, počet položek a součet. ŽÁDNÝ rozpad položek:
// `radek.n` smí zůstat jen na živé vstupence, ne v historii.
const historieOd = kredit.indexOf("<details className=\"karta\">");
const historieDo = kredit.indexOf("</details>");
assert.ok(historieOd > 0 && historieDo > historieOd, "blok historie se nenašel");
const historie = kredit.slice(historieOd, historieDo);
for (const [popis, vzor] of [
  ["datum a čas", /formatCzechDateTime\(objednavka\.issuedAt, lang\)/],
  ["počet položek", /t\.kredit\.historiePocet\(pocetKusu\(objednavka\)\)/],
  ["součet v Kč", /korun\(objednavka\.total\)/],
] as const) {
  assert.match(historie, vzor, `historie musí ukázat ${popis}`);
}
assert.doesNotMatch(
  historie,
  /radek\.n|items\.map/,
  "historie nesmí rozpadat objednávku na položky",
);
// Nevydané vstupenky zůstávají nahoře v plném detailu.
assert.ok(
  kredit.indexOf("{kCekani.length > 0 && (") < historieOd,
  "živé vstupenky zůstávají nad historií",
);

/* ========================================================================== */
/* C4) Regrese 6. 8. 2026: po „Objednat" musí být vstupenka VIDĚT             */
/* ========================================================================== */
// Produkční bug: objednávka se založila, server komponenta se překreslila
// a vstupenka vznikla — jenže NAD katalogem. Prohlížeč po vložení obsahu nad
// viewportem dorovná scroll (scroll anchoring), takže host zůstal viset dole
// u tlačítka a vstupenku ~650 px nad sebou nikdy neuviděl.
//
// Kontrakt, který to drží pohromadě:
//   1. sekce vstupenek nese kotvu `VSTUPENKY_ID`,
//   2. klient po objednání na tu kotvu odscrolluje,
//   3. potvrzení se ukáže OKAMŽITĚ, ne až po server round-tripu.
assert.equal(VSTUPENKY_ID, "kredit-vstupenky", "kotva vstupenek má stabilní id");
assert.match(
  kredit,
  /<section id=\{VSTUPENKY_ID\}/,
  "sekce živých vstupenek musí nést kotvu VSTUPENKY_ID",
);
assert.match(
  objednavkaKomponenta,
  /document\.getElementById\(VSTUPENKY_ID\)/,
  "klient musí kotvu hledat přes sdílenou konstantu, ne přes opsaný řetězec",
);
assert.match(
  objednavkaKomponenta,
  /scrollIntoView\(/,
  "po objednání se musí odscrollovat na vstupenku",
);
assert.match(
  objednavkaKomponenta,
  /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/,
  "scroll musí respektovat „omezit pohyb“",
);
assert.match(
  objednavkaKomponenta,
  /behavior: omezitPohyb \? "auto" : "smooth"/,
  "při omezeném pohybu se nesmí animovat",
);
// Vstupenka vzniká až po refreshi — scroll proto nesmí proběhnout dřív,
// než přechod doběhne, a nesmí to vzdát na prvním prázdném snímku.
assert.match(
  objednavkaKomponenta,
  /useTransition\(\)/,
  "refresh musí běžet v přechodu, ať víme, kdy doběhl",
);
assert.match(
  objednavkaKomponenta,
  /spustitObnovu\(\(\) => router\.refresh\(\)\)/,
  "refresh se spouští uvnitř přechodu",
);
assert.match(
  objednavkaKomponenta,
  /if \(stav !== "hotovo" \|\| obnovuji\) return;/,
  "scroll až po dokončení obnovy",
);
assert.match(
  objednavkaKomponenta,
  /requestAnimationFrame\(\(\) => odscrollujNaVstupenku\(pokus \+ 1\)\)/,
  "na vstupenku se musí pár snímků počkat",
);
// Optimistické potvrzení u palce — bez čekání na server.
assert.match(
  objednavkaKomponenta,
  /setStav\("hotovo"\);\s*\n\s*spustitObnovu/,
  "potvrzení se nastavuje PŘED refreshem, ne až po něm",
);
for (const [popis, vzor] of [
  ["nadpis potvrzení", /\{t\.kredit\.objednavkaHotova\}/],
  ["popis potvrzení", /\{t\.kredit\.objednavkaHotovaPopis\}/],
  ["ruční cesta na vstupenku", /\{t\.kredit\.zobrazitVstupenku\}/],
  ["oznámení pro odečítač", /role="status"/],
] as const) {
  assert.match(objednavkaKomponenta, vzor, `potvrzení objednávky: chybí ${popis}`);
}
assert.ok(
  cs.kredit.objednavkaHotova.trim().length > 0 &&
    en.kredit.objednavkaHotova.trim().length > 0 &&
    cs.kredit.zobrazitVstupenku.trim().length > 0 &&
    en.kredit.zobrazitVstupenku.trim().length > 0,
  "potvrzení objednávky musí být dvojjazyčné",
);
// Pořadí v DOM zůstává (vstupenka nahoře) — proto ten scroll vůbec je.
assert.ok(
  kredit.indexOf(`<section id={VSTUPENKY_ID}`) < kredit.indexOf("<KreditObjednavka"),
  "vstupenka je nad katalogem — kdyby se to otočilo, scroll se musí přehodnotit",
);

/* ========================================================================== */
/* C5) Počet záloh nad tlačítkem VYDAT                                        */
/* ========================================================================== */

assert.equal(MAX_ZALOH, 20, "strop záloh je 20");
for (const [popis, vstup, ocekavano] of [
  ["celé číslo projde", 3, 3],
  ["nula projde", 0, 0],
  ["strop projde", 20, 20],
  ["nad strop neprojde", 21, null],
  ["záporné neprojde", -1, null],
  ["desetinné neprojde", 2.5, null],
  ["NaN neprojde", Number.NaN, null],
  ["text s číslem projde", "4", 4],
  ["nesmyslný text neprojde", "hodně", null],
  ["undefined = nezadáno", undefined, null],
  ["null = nezadáno", null, null],
] as const) {
  assert.equal(normalizovatZalohy(vstup), ocekavano, `zálohy: ${popis}`);
}

// Předvyplnění: nápoje z festivalového katalogu se počítají, jídlo ne.
assert.equal(
  predvyplneneZalohy([{ n: "Wild Raw coconut water", qty: 2 }]),
  2,
  "studený nápoj = zálohovaný kelímek",
);
assert.equal(
  predvyplneneZalohy([{ n: "Cappuccino", qty: 3 }]),
  3,
  "káva = zálohovaný kelímek",
);
assert.equal(
  predvyplneneZalohy([
    { n: "Cappuccino", qty: 2 },
    { n: "Granola v lodičce", qty: 5 },
  ]),
  2,
  "jídlo se do záloh nepočítá",
);
assert.equal(
  predvyplneneZalohy([{ n: "Granola v lodičce", qty: 4 }]),
  0,
  "jen jídlo = žádná záloha",
);
assert.equal(
  predvyplneneZalohy([{ n: "  wild RAW   coconut water ", qty: 1 }]),
  1,
  "shoda názvu ignoruje mezery a velikost písmen",
);
// Když se v katalogu nenajde ANI JEDNA položka, nápoj poznat nejde → celkem.
assert.equal(
  predvyplneneZalohy([
    { n: "Neznámá novinka", qty: 2 },
    { n: "Další neznámá", qty: 1 },
  ]),
  3,
  "nerozpoznaná objednávka spadne na celkový počet kusů",
);
assert.equal(
  predvyplneneZalohy([{ n: "Neznámá novinka", qty: 99 }]),
  MAX_ZALOH,
  "předvyplnění nikdy nepřeleze strop",
);
assert.equal(predvyplneneZalohy([]), 0, "prázdná objednávka = žádné zálohy");

// Parser stavu: `deposits` se přebírá z mostu, nesmysly se zahazují.
{
  const s = parsovatStavKreditu({
    eligible: true,
    credit: { total: 500, spent: 0, remaining: 500 },
    orders: [
      { id: "a", items: [], total: 0, deposits: 2 },
      { id: "b", items: [], total: 0, deposits: 99 },
      { id: "c", items: [], total: 0 },
    ],
  });
  assert.equal(s.orders[0].deposits, 2, "platné deposits se přeberou");
  assert.equal(s.orders[1].deposits, null, "deposits nad strop se zahodí");
  assert.equal(s.orders[2].deposits, null, "chybějící deposits = null");
}

// Stránka: stepper je NAD tlačítkem VYDAT a předvyplní se podle objednávky.
assert.match(
  kredit,
  /<VydejKreditu\s+orderId=\{objednavka\.id\}/,
  "vstupenka musí vydávat přes VydejKreditu",
);
assert.match(
  kredit,
  /objednavka\.deposits \?\? predvyplneneZalohy\(objednavka\.items\)/,
  "předvyplnění bere hodnotu z mostu, jinak návrh z katalogu",
);
assert.ok(
  vydejKomponenta.indexOf("t.kredit.zalohyNadpis") <
    vydejKomponenta.indexOf("<VydatTlacitko"),
  "ovladač záloh patří NAD tlačítko VYDAT",
);
assert.match(
  vydejKomponenta,
  /telo=\{\{ orderId, zalohy \}\}/,
  "hodnota stepperu musí odejít v těle výdeje",
);
// Barevné odlišení od primární akce: stepper je laguna, ne mango.
assert.doesNotMatch(
  vydejKomponenta,
  /bg-mango|tlacitko-hlavni/,
  "stepper záloh nesmí použít barvu primární akce",
);
assert.match(vydejKomponenta, /laguna-/, "stepper záloh jede v lagunové rodině");
for (const [popis, vzor] of [
  ["nadpis", /\{t\.kredit\.zalohyNadpis\}/],
  ["nápověda", /\{t\.kredit\.zalohyNapoveda\}/],
  ["popisek ubrat", /t\.kredit\.zalohyUbrat/],
  ["popisek přidat", /t\.kredit\.zalohyPridat/],
  ["strop ze sdílené konstanty", /MAX_ZALOH/],
] as const) {
  assert.match(vydejKomponenta, vzor, `stepper záloh: chybí ${popis}`);
}
assert.ok(
  cs.kredit.zalohyNadpis === "Počet záloh" &&
    en.kredit.zalohyNadpis === "Deposit cups",
  "schválené znění nadpisu záloh",
);
assert.ok(
  cs.kredit.zalohyNapoveda.trim().length > 0 &&
    en.kredit.zalohyNapoveda.trim().length > 0,
  "nápověda k zálohám musí být dvojjazyčná",
);
// Route: nesmyslný počet záloh se nepřepočítá potichu na nulu.
assert.match(
  routeVydat,
  /normalizovatZalohy\(surovyZalohy\)/,
  "vydat: zálohy se normalizují na serveru",
);
assert.match(
  routeVydat,
  /zprava: t\.chyby\.zalohyNesmysl/,
  "vydat: nesmyslné zálohy končí chybou, ne tichou nulou",
);

/* --- Zrušení nevydané objednávky ------------------------------------------ */
assert.match(
  kredit,
  /<ZrusitObjednavku orderId=\{objednavka\.id\} \/>/,
  "nevydaná vstupenka musí nabídnout zrušení",
);
assert.ok(
  kredit.indexOf("<VydejKreditu") < kredit.indexOf("<ZrusitObjednavku"),
  "VYDAT zůstává hlavní akcí, zrušení je až pod ním",
);
// Váha akce: zrušení je textové tlačítko, ne barevná plocha vedle VYDAT.
assert.doesNotMatch(
  zrusitKomponenta,
  /tlacitko-hlavni|tlacitko-zapad|tlacitko-svetle/,
  "zrušení nesmí použít třídu primárního tlačítka",
);
assert.match(
  zrusitKomponenta,
  /underline/,
  "výchozí podoba zrušení je decentní textový odkaz",
);
// Dvoukrokové potvrzení + pending stav + refresh po úspěchu.
for (const [popis, vzor] of [
  ["potvrzovací krok", /\{t\.kredit\.zrusitPotvrzeni\}/],
  ["potvrzení ano", /t\.kredit\.zrusitAno/],
  ["ústup zpět", /\{t\.kredit\.zrusitNe\}/],
  ["pending stav", /stav === "rusim" \? t\.kredit\.rusim/],
  ["odeslání na vlastní endpoint", /fetch\("\/api\/kredit\/zrusit"/],
  ["refresh po úspěchu", /router\.refresh\(\)/],
  ["vlastní hláška při chybě", /t\.kredit\.chybaZruseni/],
] as const) {
  assert.match(zrusitKomponenta, vzor, `zrušení: chybí ${popis}`);
}
assert.doesNotMatch(
  zrusitKomponenta,
  /\bconfirm\(/,
  "potvrzení jede dvoukrokově v UI, ne nepřeložitelným nativním dialogem",
);
// Klient posílá VÝHRADNĚ orderId — telefon si server bere ze session.
assert.match(
  zrusitKomponenta,
  /JSON\.stringify\(\{ orderId \}\)/,
  "klient nesmí posílat nic než orderId",
);
assert.ok(
  cs.kredit.zrusit === "Zrušit objednávku" && en.kredit.zrusit === "Cancel order",
  "schválené znění tlačítka zrušení",
);
assert.ok(
  cs.kredit.zrusitPotvrzeni === "Opravdu zrušit? Kredit se ti vrátí." &&
    en.kredit.zrusitPotvrzeni ===
      "Really cancel? Your credit will be refunded.",
  "schválené znění potvrzení",
);
assert.ok(
  cs.kredit.chybaZruseni ===
    "Objednávku se nepodařilo zrušit — možná už byla vydaná." &&
    en.kredit.chybaZruseni ===
      "We couldn't cancel the order — it may already have been handed out.",
  "schválené znění chyby zrušení",
);

for (const [jmeno, route] of [
  ["objednat", routeObjednat],
  ["vydat", routeVydat],
  ["zrusit", routeZrusit],
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
// Zrušení má stejnou pojistku vlastnictví jako výdej — jinak by stačilo poslat
// cizí `orderId` a odepsat někomu objednávku z kreditu.
assert.match(
  routeZrusit,
  /objednavka\.id === orderId\.trim\(\) && objednavka\.issuedAt === null/,
  "zrusit: cizí ani už vydaná objednávka neprojde",
);
assert.match(routeZrusit, /status: 409/, "zrusit: neexistující objednávka končí 409");
assert.match(
  routeZrusit,
  /zrusitObjednavku\(telefon, cekajici\.id, fetch, lang\)/,
  "zrusit: na most jde telefon ze session a ověřené id objednávky",
);
assert.doesNotMatch(
  routeZrusit,
  /orderId: orderId/,
  "zrusit: na most se posílá ověřená objednávka, ne syrový vstup",
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
        "✓ darek + kredit checks OK (CTA v obou kvízech, schválené texty + QR 480 px, " +
          "bridge fail-closed vč. /cancel, banner jen při potvrzeném kreditu, historie sbalená)",
      ),
    (chyba) => {
      console.error("✗ check-darek-kredit:", chyba);
      process.exit(1);
    },
  );
