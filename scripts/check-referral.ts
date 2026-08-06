/**
 * Kontrola sledovatelných osobních QR („Dárek přátelům“) a interního reportu.
 *
 *   A) validace referral kódu — fuzz: SQL injection, dlouhé řetězce,
 *      diakritika, emoji, pole, `null` → všechno se musí tiše zahodit,
 *   B) generování kódu — abeceda bez `I`, `O`, `0`, `1` a stabilní délka,
 *      tvar URL `…/kviz/web?od=<KOD>`,
 *   C) migrace 008 — oba sloupce, unikátní index, idempotence,
 *   D) payload leadu — `referral_code` JEN u platného kódu,
 *      + fallback v server action, když migrace 008 ještě neproběhla,
 *   E) `/darek` a `/kviz/<slug>` — osobní QR jen přihlášenému, `?od=` se čte
 *      na každém vstupu a přežije i přihlášení,
 *   F) balík `qrcode` ani serverové moduly se nesmí dostat do klienta,
 *   G) interní report `/api/internal/report/users` — fail-closed 401, no-store.
 *
 * Spuštění: `npx tsx scripts/check-referral.ts`
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { DAREK_KVIZ_URL, darekKvizUrl, darekPocitadloText } from "../src/lib/darek";
import { BAVICI, PRODUKTY } from "../src/lib/kviz";
import { parseKvizFormData, sestavitQuizLeadZaznam } from "../src/lib/kviz-lead";
import {
  REFERRAL_ABECEDA,
  REFERRAL_DELKA,
  REFERRAL_MAX_DELKA,
  REFERRAL_MIN_DELKA,
  REFERRAL_PARAM,
  normalizovatReferralKod,
  sReferralem,
  vygenerovatReferralKod,
} from "../src/lib/referral";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (cesta: string) => readFileSync(join(root, cesta), "utf8");

const darek = read("src/app/darek/page.tsx");
const kvizPage = read("src/app/kviz/[bavic]/page.tsx");
const kvizFlow = read("src/components/KvizFlow.tsx");
const kvizProfil = read("src/components/KvizFlowProfil.tsx");
const selector = read("src/components/QuizVariantSelector.tsx");
const actions = read("src/app/kviz/actions.ts");
const migrace = read("supabase/migrations/008_referral_codes.sql");
const referralServer = read("src/lib/referral-server.ts");
const referralQr = read("src/lib/referral-qr.ts");
const reportLib = read("src/lib/report-users.ts");
const reportRoute = read("src/app/api/internal/report/users/route.ts");
const reportAuth = read("src/lib/report-auth.ts");
const odmenyLib = read("src/lib/report-rewards.ts");
const odmenyRoute = read("src/app/api/internal/report/rewards/route.ts");

const chyby: string[] = [];
let kontrol = 0;

function overit(popis: string, podminka: boolean): void {
  kontrol += 1;
  if (!podminka) chyby.push(popis);
}

/* ========================================================================== */
/* A) Validace kódu — fuzz                                                    */
/* ========================================================================== */

// Všechno, co se nesmí dostat do databáze ani do URL. Nic z toho nesmí
// vyhodit výjimku — host o referralu nikdy nemá vidět chybu.
const NEPLATNE: [string, unknown][] = [
  ["prázdný řetězec", ""],
  ["samé mezery", "   "],
  ["příliš krátký", "AB"],
  ["příliš dlouhý", "ABCDEFGHJKLMN"],
  ["zakázané I", "ABCDEFIJ"],
  ["zakázané O", "ABCDEFOJ"],
  ["zakázaná 0", "ABCDEF0J"],
  ["zakázaná 1", "ABCDEF1J"],
  ["diakritika", "ŽLUŤOUČK"],
  ["české ě", "ABCDĚFGH"],
  ["emoji", "ABCD🦠EFG"],
  ["pomlčka", "ABCD-EFG"],
  ["mezera uvnitř", "ABCD EFG"],
  ["SQL injection", "' OR 1=1 --"],
  ["SQL drop", "ABCD'; drop table quiz_leads; --"],
  ["SQL union", "AB' union select * from profiles --"],
  ["procenta pro LIKE", "%"],
  ["podtržítko pro LIKE", "ABCD_EFG"],
  ["nulový bajt", "ABCD\u0000EFG"],
  ["nový řádek", "ABCDEFGH\nIJ"],
  ["HTML", "<script>alert(1)</script>"],
  ["URL s protokolem", "https://zlo.example"],
  ["10 kB řetězec", "A".repeat(10_000)],
  ["65 znaků (nad limit vstupu)", "A".repeat(65)],
  ["null", null],
  ["undefined", undefined],
  ["číslo", 12345678],
  ["pole", ["ABCD2345"]],
  ["objekt", { kod: "ABCD2345" }],
  ["boolean", true],
];

for (const [popis, vstup] of NEPLATNE) {
  let vysledek: string | null = "NEVYHODNOCENO";
  let spadlo = false;
  try {
    vysledek = normalizovatReferralKod(vstup);
  } catch {
    spadlo = true;
  }
  overit(`${popis}: normalizace nesmí spadnout`, !spadlo);
  overit(`${popis}: musí se ignorovat (null)`, vysledek === null);
}

// Platné tvary — včetně tolerance k malým písmenům a mezerám okolo.
const PLATNE: [unknown, string][] = [
  ["ABCD2345", "ABCD2345"],
  ["abcd2345", "ABCD2345"],
  ["  ABCD2345  ", "ABCD2345"],
  ["aBcD2345", "ABCD2345"],
  ["ABCD", "ABCD"],
  ["ABCDEFGHJKLM", "ABCDEFGHJKLM"],
  ["23456789", "23456789"],
];
for (const [vstup, ocekavano] of PLATNE) {
  overit(
    `platný kód „${String(vstup)}" → ${ocekavano}`,
    normalizovatReferralKod(vstup) === ocekavano,
  );
}

overit(
  `hranice délky drží (${REFERRAL_MIN_DELKA}–${REFERRAL_MAX_DELKA})`,
  normalizovatReferralKod("A".repeat(REFERRAL_MIN_DELKA)) !== null &&
    normalizovatReferralKod("A".repeat(REFERRAL_MAX_DELKA)) !== null &&
    normalizovatReferralKod("A".repeat(REFERRAL_MIN_DELKA - 1)) === null &&
    normalizovatReferralKod("A".repeat(REFERRAL_MAX_DELKA + 1)) === null,
);

/* ========================================================================== */
/* B) Generování kódu a tvar URL                                              */
/* ========================================================================== */

overit("abeceda nemá I, O, 0 ani 1", !/[IO01]/.test(REFERRAL_ABECEDA));
overit("abeceda má 32 znaků (rovnoměrné rozdělení bajtů)", REFERRAL_ABECEDA.length === 32);
overit(
  "abeceda nemá duplicity",
  new Set(REFERRAL_ABECEDA).size === REFERRAL_ABECEDA.length,
);

const vzorky = new Set<string>();
for (let i = 0; i < 2000; i += 1) {
  const kod = vygenerovatReferralKod();
  overit(`vygenerovaný kód „${kod}" má ${REFERRAL_DELKA} znaků`, kod.length === REFERRAL_DELKA);
  overit(`vygenerovaný kód „${kod}" projde vlastní validací`, normalizovatReferralKod(kod) === kod);
  vzorky.add(kod);
}
overit("2000 kódů je prakticky bez kolizí", vzorky.size >= 1995);

overit("parametr se jmenuje `od`", REFERRAL_PARAM === "od");
overit(
  "URL má tvar …/kviz/web?od=<KOD>",
  darekKvizUrl("ABCD2345") === "https://bar.peaceandcoco.com/kviz/web?od=ABCD2345",
);
overit("bez kódu zůstává původní URL", darekKvizUrl(null) === DAREK_KVIZ_URL);
overit("neplatný kód URL nezmění", darekKvizUrl("' or 1=1") === DAREK_KVIZ_URL);
overit(
  "existující query se doplní přes &",
  sReferralem("/kviz/a1?x=1", "ABCD2345") === "/kviz/a1?x=1&od=ABCD2345",
);
overit(
  "do URL jde jen normalizovaný kód",
  sReferralem("/kviz/web", "  abcd2345 ") === "/kviz/web?od=ABCD2345",
);

// Počítadlo: jen číslo, nikdy jméno ani e-mail kamaráda.
overit("nula má motivační větu", /zatím neprošel nikdo/.test(darekPocitadloText(0)));
overit("jednotné číslo", darekPocitadloText(1).includes("1 kamarád."));
overit("množné číslo 2–4", darekPocitadloText(3).includes("3 kamarádi"));
overit("množné číslo 5+", darekPocitadloText(12).includes("12 kamarádů"));
for (const pocet of [0, 1, 3, 12, 999]) {
  overit(
    `počítadlo (${pocet}) neobsahuje kontakt`,
    !/@|\+\d{3}/.test(darekPocitadloText(pocet)),
  );
}

/* ========================================================================== */
/* C) Migrace 008                                                             */
/* ========================================================================== */

overit(
  "migrace přidává profiles.referral_code",
  /alter table public\.profiles\s+add column if not exists referral_code text;/.test(migrace),
);
overit(
  "migrace přidává quiz_leads.referral_code",
  /alter table public\.quiz_leads\s+add column if not exists referral_code text;/.test(migrace),
);
overit(
  "kód zákazníka je unikátní",
  /create unique index if not exists profiles_referral_code_key/.test(migrace),
);
overit(
  "leady mají index na referral_code",
  /create index if not exists quiz_leads_referral_code_idx/.test(migrace),
);
overit(
  "index leadů je částečný (jen neprázdné kódy)",
  /quiz_leads_referral_code_idx[\s\S]*?where referral_code is not null/.test(migrace),
);
overit(
  "databáze hlídá stejný tvar kódu jako appka",
  (migrace.match(/\^\[A-HJ-NP-Z2-9\]\{4,12\}\$/g) ?? []).length === 2,
);
// `add constraint` neumí `if not exists`, takže každý musí být uvnitř
// do-bloku, který se nejdřív podívá do `pg_constraint` — jinak by druhé
// spuštění migrace spadlo.
overit(
  "každý add constraint je chráněný proti opakovanému spuštění",
  (migrace.match(/add constraint/g) ?? []).length ===
    (migrace.match(/select 1 from pg_constraint/g) ?? []).length,
);
overit(
  "migrace používá add column if not exists",
  (migrace.match(/add column if not exists/g) ?? []).length === 2,
);
overit(
  "migrace nepřidává nic o odpovědích z kvízu",
  !/\b(answer|score|odpoved|skore)\w*\s+(text|jsonb|integer|numeric)\b/i.test(migrace),
);

/* ========================================================================== */
/* D) Payload leadu                                                           */
/* ========================================================================== */

const bavic = BAVICI[0];
const produkt = PRODUKTY[0];

function formular(zmeny: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const zaklad: Record<string, string> = {
    bavic: bavic.slug,
    produkt: produkt.slug,
    jmeno: "Ivona",
    email: "ivona@example.com",
    telefon: "601 123 456",
  };
  for (const [k, v] of Object.entries({ ...zaklad, ...zmeny })) fd.set(k, v);
  return fd;
}

const zakladZaznamu = {
  bavic,
  produkt,
  quizVariant: "microbiom" as const,
  jmeno: "Ivona",
  email: "ivona@example.com",
  telefon: "+420601123456",
  kod: "HEAL21-A1-NTR250",
};

const bezReferralu = sestavitQuizLeadZaznam(zakladZaznamu);
overit(
  "bez referralu má záznam původních 8 klíčů",
  Object.keys(bezReferralu).length === 8 && !("referral_code" in bezReferralu),
);

const sReferralemZaznam = sestavitQuizLeadZaznam({
  ...zakladZaznamu,
  referralKod: "ABCD2345",
});
overit(
  "s referralem má záznam 9 klíčů",
  Object.keys(sReferralemZaznam).length === 9,
);
overit(
  "referral_code se uloží normalizovaný",
  sReferralemZaznam.referral_code === "ABCD2345",
);
overit(
  "malá písmena se před zápisem zvětší",
  sestavitQuizLeadZaznam({ ...zakladZaznamu, referralKod: "abcd2345" }).referral_code ===
    "ABCD2345",
);

for (const [popis, vstup] of NEPLATNE) {
  const zaznam = sestavitQuizLeadZaznam({
    ...zakladZaznamu,
    referralKod: vstup as string | null,
  });
  overit(
    `${popis}: do quiz_leads se referral_code nedostane`,
    !("referral_code" in zaznam) && Object.keys(zaznam).length === 8,
  );
}

// Ani při referralu se nesmí do záznamu přidat nic dalšího (odpovědi z kvízu).
overit(
  "s referralem přibyl JEN referral_code",
  Object.keys(sReferralemZaznam)
    .filter((k) => !Object.keys(bezReferralu).includes(k))
    .join(",") === "referral_code",
);

// Formulář: platný `od` projde, nesmysl se tiše zahodí a kvíz běží dál.
const sOd = parseKvizFormData(formular({ od: "abcd2345" }));
overit("formulář s `od` projde", sOd.ok === true);
overit(
  "formulář s `od` nese normalizovaný kód",
  sOd.ok === true && sOd.data.referralKod === "ABCD2345",
);
const bezOd = parseKvizFormData(formular());
overit("formulář bez `od` projde", bezOd.ok === true);
overit("formulář bez `od` má null", bezOd.ok === true && bezOd.data.referralKod === null);

for (const nesmysl of ["' or 1=1 --", "ŽLUŤOUČK", "A".repeat(500), "", "AB"]) {
  const r = parseKvizFormData(formular({ od: nesmysl }));
  overit(`formulář s rozbitým od="${nesmysl.slice(0, 12)}" pořád projde`, r.ok === true);
  overit(
    `rozbité od="${nesmysl.slice(0, 12)}" se zahodí`,
    r.ok === true && r.data.referralKod === null,
  );
}

// Fallback pro dobu mezi deployem a spuštěním migrace 008.
overit(
  "server action umí zapsat lead i bez sloupce referral_code",
  /VOLITELNE_SLOUPCE_LEADU\s*=\s*\["quiz_variant",\s*"referral_code"\]/.test(actions),
);
overit(
  "fallback vyhazuje chybějící sloupec a zkouší znovu",
  /const \{ \[chybejici\]: _vynechany, \.\.\.zbytek \} = telo/.test(actions),
);
overit("server action předává referralKod do záznamu", /\breferralKod,/.test(actions));

/* ========================================================================== */
/* E) Stránky                                                                 */
/* ========================================================================== */

overit("/darek zná přihlášeného hosta", /getSessionUser\(\)/.test(darek));
overit("/darek přiděluje kód přes serverový modul", /zajistitReferralKod\(user\.id\)/.test(darek));
overit("/darek ukazuje počítadlo", /spocitatPozvane/.test(darek));
overit("/darek se nesmí cachovat", /export const dynamic = "force-dynamic"/.test(darek));
overit(
  "/darek nesahá na leady kamarádů (jen počítadlo)",
  !/quiz_leads|first_name|supabase\/admin/.test(darek),
);
overit(
  "/darek padá na statické QR, když osobní nevznikne",
  /: DAREK_QR_SOUBOR/.test(darek) && /maOsobni/.test(darek),
);

overit("/kviz čte parametr `od`", /normalizovatReferralKod\(prvni\(sp\[REFERRAL_PARAM\]\)\)/.test(kvizPage));
overit(
  "`od` funguje na každém vstupu (žádná podmínka na WEB)",
  !/referralKod[\s\S]{0,120}PUBLIC_WEB_QUIZ_HOST/.test(kvizPage),
);
overit("referral přežije přihlášení", /sReferralem\(`\/kviz\/\$\{bavic\.slug\}`, referralKod\)/.test(kvizPage));
overit("selektor propouští kód do obou variant", /referralKod=\{referralKod\}/.test(selector));
for (const [jmeno, zdroj] of [
  ["KvizFlow", kvizFlow],
  ["KvizFlowProfil", kvizProfil],
] as const) {
  overit(
    `${jmeno}: skryté pole „od" vzniká jen když kód existuje`,
    /\{referralKod && \(\s*<input type="hidden" name="od" value=\{referralKod\} \/>/.test(zdroj),
  );
}

/* ========================================================================== */
/* F) Nic serverového v klientu                                               */
/* ========================================================================== */

function souboryTS(adresar: string): string[] {
  return readdirSync(adresar, { withFileTypes: true }).flatMap((polozka) => {
    const cesta = join(adresar, polozka.name);
    if (polozka.isDirectory()) return souboryTS(cesta);
    return /\.tsx?$/.test(polozka.name) && statSync(cesta).isFile() ? [cesta] : [];
  });
}

const SERVEROVE_MODULY = [
  "referral-server",
  "referral-qr",
  "report-users",
  "report-rewards",
  "report-auth",
];
let klientskych = 0;
for (const soubor of souboryTS(join(root, "src"))) {
  const relativni = soubor.slice(root.length);
  const obsah = readFileSync(soubor, "utf8");

  // Balík `qrcode` je čistě serverový (Node API). Smí ho importovat jen
  // serverové moduly — nikdy komponenta s `"use client"`, jinak by se
  // protáhl do klientského bundlu.
  if (/from "qrcode"/.test(obsah)) {
    overit(
      `${relativni}: qrcode nesmí být v klientské komponentě`,
      !obsah.startsWith('"use client"'),
    );
  }

  if (!obsah.startsWith('"use client"')) continue;
  klientskych += 1;
  for (const modul of SERVEROVE_MODULY) {
    const importy = obsah.match(new RegExp(`^import(?! type).*${modul}.*$`, "gm")) ?? [];
    overit(
      `${relativni}: klientská komponenta nesmí importovat ${modul}`,
      importy.length === 0,
    );
  }
  overit(`${relativni}: klientská komponenta nesmí volat qrcode`, !/qrcode/.test(obsah));
  overit(
    `${relativni}: klientská komponenta nesmí znát service-role klienta`,
    !/supabase\/admin/.test(obsah),
  );
}
overit("kontrola prošla aspoň 5 klientských komponent", klientskych >= 5);

for (const [jmeno, zdroj] of [
  ["referral-server", referralServer],
  ["referral-qr", referralQr],
  ["report-users", reportLib],
  ["report-rewards", odmenyLib],
  ["report-auth", reportAuth],
] as const) {
  overit(
    `${jmeno}: má pojistku proti klientskému bundlu`,
    /typeof window !== "undefined"/.test(zdroj),
  );
}
overit(
  "referral-server nečte jména ani e-maily kamarádů",
  /head: true/.test(referralServer) && !/first_name|\.select\("\*"\)/.test(referralServer),
);

/* ========================================================================== */
/* G) Interní report uživatelů                                                */
/* ========================================================================== */

// Guard se od zavedení `REPORT_USERS_SECRET` jmenuje `jeAutorizovanyReport`
// a bridge secret bere jako první možnost. Od přidání reportu odměn bydlí
// v `lib/report-auth.ts` — jedna implementace pro všechny reporty, aby se
// při první opravě nerozešly a jeden endpoint nezůstal slabší.
overit(
  "guard reportů stojí na bridge autorizaci",
  /export function jeAutorizovanyReport\(hlavicka: string \| null\): boolean \{\s*if \(isAuthorizedHealingBridge\(hlavicka\)\) return true;/.test(
    reportAuth,
  ),
);
overit(
  "guard bere i vlastní REPORT_USERS_SECRET a je fail-closed",
  /process\.env\.REPORT_USERS_SECRET/.test(reportAuth) &&
    /if \(!vlastni \|\| !hlavicka\?\.startsWith\("Bearer "\)\) return false;/.test(reportAuth),
);
overit(
  "guard porovnává v konstantním čase (bez předčasného návratu v cyklu)",
  /diff \|= token\.charCodeAt\(i\) \^ vlastni\.charCodeAt\(i\);/.test(reportAuth) &&
    /return diff === 0;/.test(reportAuth),
);
overit(
  "guard má pojistku proti klientskému bundlu",
  /typeof window !== "undefined"/.test(reportAuth),
);
overit(
  "žádná route si guard neduplikuje",
  !/function jeAutorizovanyReport/.test(reportRoute) &&
    !/function jeAutorizovanyReport/.test(odmenyRoute),
);

// Oba interní reporty musí splňovat tentýž kontrakt — proto společná smyčka:
// nový report se nesmí dát přidat s volnějšími pravidly.
for (const [jmeno, route, sestavitel] of [
  ["users", reportRoute, "sestavitReportUzivatelu()"],
  ["rewards", odmenyRoute, "sestavitReportOdmen()"],
] as const) {
  overit(`report ${jmeno} běží na Node runtime`, /export const runtime = "nodejs"/.test(route));
  overit(`report ${jmeno} se nesmí cachovat`, /export const dynamic = "force-dynamic"/.test(route));
  overit(
    `report ${jmeno} je bez tokenu fail-closed 401`,
    /if \(!jeAutorizovanyReport\(request\.headers\.get\("authorization"\)\)\)/.test(route) &&
      /status: 401/.test(route),
  );
  overit(
    `report ${jmeno}: 401 přijde dřív než jakékoli čtení dat`,
    route.indexOf("status: 401") < route.indexOf(sestavitel),
  );
  overit(
    `report ${jmeno} má Cache-Control: no-store`,
    (route.match(/"Cache-Control": "no-store"/g) ?? []).length >= 3,
  );
  overit(`report ${jmeno} nevrací detail chyby ven`, /error: "report selhal"/.test(route));
  overit(
    `report ${jmeno} je jen GET`,
    !/export async function (POST|PUT|PATCH|DELETE)/.test(route),
  );
}
// Konzument `scripts/sync_bar_users_report.py` dělá `for l in json.load(r)` —
// obalení do objektu by mu zrcadlení do Sheetu rozbilo.
overit(
  "úspěšná odpověď je holé pole řádků",
  /NextResponse\.json\(users, \{/.test(reportRoute),
);
// Konzument je mimo tenhle repozitář-modul a může se přejmenovat — kontrola
// se pouští jen když soubor existuje, aby `npm run check` nezhasl cizí změnou.
const syncSkript = join(root, "scripts/sync_bar_users_report.py");
if (existsSync(syncSkript)) {
  overit(
    "sync skript do Sheetu čte stejnou adresu",
    readFileSync(syncSkript, "utf8").includes("/api/internal/report/users"),
  );
}

for (const pole of [
  "signup",
  "jmeno",
  "telefon",
  "email",
  "posledni",
  "kvizy",
  "razitka",
  "odmeny",
  "referral_code",
  "rozdane",
]) {
  overit(`report má pole ${pole}`, new RegExp(`\\b${pole}:`).test(reportLib));
}

/* --- Report vydaných odměn (evidence) ------------------------------------- */

for (const pole of ["vydano", "jmeno", "telefon", "produkt", "kategorie"]) {
  overit(`report odměn má pole ${pole}`, new RegExp(`\\b${pole}:`).test(odmenyLib));
}
// Tabulka `rewards` NEMÁ sloupec `issued_at` — výdej je `state = 'redeemed'`
// plus `redeemed_at` (migrace 001). Kdyby se filtr rozešel se schématem,
// evidence by buď mlčela, nebo vydávala nevydané odměny.
overit(
  "report odměn bere jen skutečně vydané",
  /\.eq\("state", "redeemed"\)/.test(odmenyLib) &&
    /\.not\("redeemed_at", "is", null\)/.test(odmenyLib),
);
overit(
  "report odměn řadí podle času výdeje",
  /\.order\("redeemed_at", \{ ascending: true \}\)/.test(odmenyLib) &&
    /radky\.sort\(\(a, b\) => a\.vydano\.localeCompare\(b\.vydano\)\)/.test(odmenyLib),
);
overit(
  "report odměn nesahá na neexistující issued_at",
  !/issued_at/.test(odmenyLib.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")),
);
overit(
  "telefon v evidenci je normalizovaný na E.164",
  /normalizeCzechPhone/.test(odmenyLib) && /phone_e164/.test(odmenyLib),
);
overit(
  "úspěšná odpověď reportu odměn je holé pole řádků",
  /NextResponse\.json\(rewards, \{/.test(odmenyRoute),
);
overit("report skrývá interní alias telefonního loginu", /isInternalAuthEmail/.test(reportLib));
overit("report řadí podle registrace", /radky\.sort\(\(a, b\) => a\.signup\.localeCompare\(b\.signup\)\)/.test(reportLib));
overit(
  "report počítá jen dokončené kvízy",
  /radek\.status !== "completed"/.test(reportLib),
);
overit(
  "report dělí odměny na dostupné a vydané",
  /state === "redeemed"/.test(reportLib) && /dostupne: 0, vydane: 0/.test(reportLib),
);
overit(
  "report přežije chybějící migraci 008",
  /leadyRes\.error/.test(reportLib) && /console\.warn/.test(reportLib),
);

/* ========================================================================== */

if (chyby.length > 0) {
  console.error(`✗ check-referral: ${chyby.length} chyb z ${kontrol} kontrol`);
  for (const c of chyby) console.error(`  · ${c}`);
  process.exit(1);
}

assert.ok(kontrol > 0);
console.log(
  `✓ check-referral: ${kontrol}/${kontrol} kontrol OK ` +
    `(fuzz ${NEPLATNE.length} neplatných vstupů, migrace 008, payload s referralem jen když platí, ` +
    `qrcode mimo klient, report fail-closed)`,
);
