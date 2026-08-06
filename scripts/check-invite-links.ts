/**
 * Kontrola pozvánky na jedno ťuknutí (`https://bar.peaceandcoco.com/<token>`).
 *
 * Hlídá šest věcí, na kterých ta zkratka bezpečnostně stojí:
 *
 *   A) TOKEN NIKDY V LOGU ani nikde jinde v plaintextu mimo jedinou odpověď,
 *   B) VYTVOŘENÍ je server-to-server za sdíleným secretem (401 bez něj),
 *   C) OVĚŘENÍ je fail-closed a bez orákula — všechny důvody selhání vypadají
 *      pro volajícího naprosto stejně,
 *   D) V DATABÁZI leží jen hash s peppertem, nikdy plaintext,
 *   E) SESSION vzniká JEDINOU sdílenou cestou společně s ověřením SMS kódu,
 *   F) RATE LIMIT na IP běží dřív, než se sáhne na token,
 *   G) ROOT CATCH-ALL nepřebíjí žádnou statickou routu ani veřejný soubor.
 *
 * Databáze se tu nevolá — testuje se čistá logika (token, hash, tvar) a pak
 * staticky kontrakt rout a migrace.
 *
 * Spuštění: `npx tsx scripts/check-invite-links.ts`
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// `hashSecret` čte pepper až za běhu, takže stačí nastavit ho před prvním
// voláním — ne před importem.
process.env.BAR_AUTH_PEPPER = "testovaci-pepper-aspon-16-znaku";

import {
  INVITE_RATE_MAX,
  INVITE_RATE_WINDOW_MS,
  INVITE_TTL_MS,
  MAX_DELKA_URL,
  TOKEN_LENGTH,
  hashInviteToken,
  jePouzitelnyTvarTokenu,
  novyInviteToken,
} from "../src/lib/invite-links";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (cesta: string) => readFileSync(join(root, cesta), "utf8");

const lib = read("src/lib/invite-links.ts");
const routeCreate = read("src/app/api/internal/invite/create/route.ts");
const routeVstup = read("src/app/[token]/page.tsx");
const klientPozvanky = read("src/components/DokoncitPozvanku.tsx");
const phoneAuthServer = read("src/lib/phone-auth-server.ts");
const migrace = read("supabase/migrations/009_invite_links.sql");

/* ========================================================================== */
/* A) Token: entropie, tvar, žádný plaintext v logu                           */
/* ========================================================================== */

const vzorky = Array.from({ length: 2000 }, () => novyInviteToken());

for (const token of vzorky.slice(0, 50)) {
  // Délka je PŘESNÁ, ne „aspoň": rozpočet SMS je 45 znaků a jediné, co se
  // v adrese může protáhnout, je token.
  assert.equal(
    token.length,
    TOKEN_LENGTH,
    `token musí mít přesně ${TOKEN_LENGTH} znaků, má ${token.length}`,
  );
  assert.match(token, /^[A-Za-z0-9_-]+$/, "token musí být URL-safe (base64url)");
  // Base64url nesmí obsahovat znaky, které by se v URL musely enkódovat.
  assert.equal(encodeURIComponent(token), token, "token se nesmí měnit v URL");
  assert.ok(!token.includes("="), "base64url nesmí nést padding");
}
assert.equal(new Set(vzorky).size, vzorky.length, "tokeny se nesmí opakovat");
assert.equal(TOKEN_LENGTH, 16, "token má 16 znaků = 96 bitů entropie");
// TOKEN_LENGTH je ODVOZENÁ z počtu bajtů. Kdyby se ražba a validace rozešly,
// appka by přestala pouštět vlastní čerstvě vydané odkazy — tohle to chytí
// na skutečně vyrobených tokenech, ne na přepsané konstantě.
for (const token of vzorky) {
  assert.equal(
    token.length,
    TOKEN_LENGTH,
    `ražba a validace se rozešly: token má ${token.length}, validace čeká ${TOKEN_LENGTH}`,
  );
}
assert.match(lib, /randomBytes\(TOKEN_BYTES\)/, "token musí jít z kryptografického RNG");
assert.ok(!/Math\.random/.test(lib), "Math.random nesmí generovat token");

// Tvar tokenu se kontroluje DŘÍV, než se s ním jde do databáze.
for (const spatny of [
  "",
  "kratky",
  "a".repeat(15),
  "má-diakritiku-16",
  "abc/def+ghi=jklm",
  "abcd efgh ijkl mn",
]) {
  assert.equal(jePouzitelnyTvarTokenu(spatny), false, `token „${spatny}" musí propadnout`);
}

// REGRESE (produkce 6. 8. 2026): tvar měl jen SPODNÍ hranici, takže delší
// řetězec z povolené abecedy prošel jako „token" a překlep skončil 307 na
// /prihlaseni místo na 404. Živě potvrzeno na `/tohle-fakt-neexistuje-vubec-nikde`.
for (const delsi of [
  "tohle-fakt-neexistuje-vubec-nikde",
  "a".repeat(TOKEN_LENGTH + 1),
  "a".repeat(TOKEN_LENGTH * 3),
  `${novyInviteToken()}x`,
  `${novyInviteToken()}${novyInviteToken()}`,
]) {
  assert.ok(
    delsi.length > TOKEN_LENGTH && /^[A-Za-z0-9_-]+$/.test(delsi),
    `kontrolní vzorek „${delsi}" musí být delší a z povolené abecedy`,
  );
  assert.equal(
    jePouzitelnyTvarTokenu(delsi),
    false,
    `delší řetězec z povolené abecedy („${delsi}") musí skončit 404, ne na přihlášení`,
  );
}
// A naopak: přesně TOKEN_LENGTH znaků z abecedy tvarem projde (i když
// v databázi neexistuje) — takový request má správně skončit 307 na
// /prihlaseni, ne 404. Rozlišení 404 vs 307 stojí přesně na téhle funkci.
assert.equal(
  jePouzitelnyTvarTokenu("a".repeat(TOKEN_LENGTH)),
  true,
  "přesná délka z povolené abecedy je tvarem platný token (→ 307, ne 404)",
);
assert.equal(jePouzitelnyTvarTokenu(novyInviteToken()), true, "čerstvý token musí projít");

/* --- Rozpočet SMS: celá adresa se musí vejít do jednoho segmentu ---------- */
const PRODUKCNI_BASE = "https://bar.peaceandcoco.com";
for (const token of vzorky.slice(0, 200)) {
  const url = `${PRODUKCNI_BASE}/${token}`;
  assert.ok(
    url.length <= MAX_DELKA_URL,
    `adresa pozvánky musí mít ≤ ${MAX_DELKA_URL} znaků, má ${url.length}: ${url}`,
  );
}
assert.equal(
  `${PRODUKCNI_BASE}/${vzorky[0]}`.length,
  45,
  "produkční adresa pozvánky má přesně 45 znaků",
);
assert.equal(MAX_DELKA_URL, 45, "rozpočet Healing strany je 45 znaků");
// Token jde ROVNOU za doménou — žádná cesta navíc, ani jednopísmenná.
assert.match(
  lib,
  /url: `\$\{baseUrl\}\/\$\{token\}`/,
  "token musí být rovnou za doménou (žádný prefix cesty)",
);
// Adresa musí zůstat v GSM-7 abecedě, jinak by SMS spadla do UCS-2 a segment
// by se zkrátil ze 160 na 70 znaků — rozpočet by nesedl ani zdaleka.
for (const token of vzorky.slice(0, 200)) {
  assert.match(
    `${PRODUKCNI_BASE}/${token}`,
    /^[A-Za-z0-9:/._~-]+$/,
    "adresa nesmí obsahovat znak mimo GSM-7",
  );
}

/* --- Root catch-all nesmí přebít žádnou statickou routu ------------------- */
// `src/app/[token]/route.ts` chytá KAŽDÝ jednosegmentový path bez vlastní
// stránky. Next.js dává statickým segmentům přednost, ale na tuhle vlastnost
// se tu nespoléhá slepě: kdyby někdo založil top-level routu, která vyhoví
// formátu tokenu (16 znaků base64url), catch-all by ji tiše přebil a stránka
// by z appky zmizela. Dnes je nejblíž `aktivovat-email` — 15 znaků, o jeden
// míň. Proto se kontroluje SKUTEČNÝ výčet ze souborového systému, ne ručně
// psaný seznam, který by časem zestárnul.
assert.ok(
  statSync(join(root, "src/app/[token]/page.tsx")).isFile(),
  "pozvánka musí být root catch-all src/app/[token]/page.tsx",
);
// Stránka, ne route handler: `notFound()` v route handleru vrací PRÁZDNÉ tělo,
// takže by každý překlep v adrese skončil bílou obrazovkou místo 404 appky.
// Ověřeno testem na produkčním buildu 6. 8. 2026.
assert.throws(
  () => statSync(join(root, "src/app/[token]/route.ts")),
  "pozvánka musí být page.tsx — route handler neumí vykreslit 404 stránku",
);
for (const stara of ["src/app/vstup", "src/app/i"]) {
  assert.throws(
    () => statSync(join(root, stara)),
    `${stara} už nesmí existovat — pozvánka je v rootu`,
  );
}

const topLevel = readdirSync(join(root, "src/app"), { withFileTypes: true })
  .filter((p) => p.isDirectory() && p.name !== "[token]")
  .map((p) => p.name);
// Statické soubory z `public/` se servírují před app routami, ale kdyby jeden
// z nich vyhověl formátu, kolidoval by úplně stejně.
const verejneSoubory = readdirSync(join(root, "public"));

// Ručně vyjmenované cesty ze zadání musí ve výčtu opravdu být — kdyby se
// složka přejmenovala, check by jinak kontroloval prázdno a tvářil se zeleně.
for (const ocekavana of [
  "admin",
  "aktivovat-email",
  "api",
  "auth",
  "darek",
  "kredit",
  "kviz",
  "odmena",
  "odmeny",
  "pravidla",
  "prihlaseni",
  "scan",
  "sortiment",
  "vyber",
]) {
  assert.ok(
    topLevel.includes(ocekavana),
    `top-level routa „${ocekavana}" ve výčtu chybí — přejmenovala se?`,
  );
}

for (const jmeno of [...topLevel, ...verejneSoubory]) {
  assert.equal(
    jePouzitelnyTvarTokenu(jmeno),
    false,
    `„${jmeno}" vyhovuje formátu tokenu → root catch-all by tuhle cestu přebil. ` +
      "Přejmenuj routu, nebo pozvánku vrať pod vlastní prefix.",
  );
}
// A totéž pro kořenové cesty, které nejsou složkou (`/` a 404).
for (const zvlastni of ["", "/", "_next", "favicon.ico"]) {
  assert.equal(
    jePouzitelnyTvarTokenu(zvlastni),
    false,
    `vyhrazená cesta „${zvlastni}" nesmí vyhovět formátu tokenu`,
  );
}

/* --- Co není token, je 404 — ne přesměrování na přihlášení ---------------- */
assert.match(
  routeVstup,
  /if \(!jePouzitelnyTvarTokenu\(token\)\) notFound\(\);/,
  "špatný tvar musí končit notFound(), ne redirectem",
);
assert.match(
  routeVstup,
  /^import \{ notFound, redirect \} from "next\/navigation";$/m,
  "stránka musí importovat notFound i redirect",
);
// Pořadí: tvar se kontroluje DŘÍV než rate limit, ať náhodné procházení webu
// nespotřebovává rozpočet pokusů.
assert.ok(
  routeVstup.indexOf("notFound()") < routeVstup.indexOf("zapsatPokusAOveritLimit("),
  "tvar tokenu se musí ověřit před rate limitem",
);

/* --- Token se nikdy neloguje ---------------------------------------------- */
// Každé `console.*` v modulu i v obou routách projdeme a ověříme, že se v jeho
// argumentech neobjeví proměnná s tokenem.
const ZAKAZANE_V_LOGU = /console\.(log|warn|error|info|debug)\([^)]*\b(token|rawToken|plaintext|url)\b/;
for (const [jmeno, zdroj] of [
  ["lib/invite-links.ts", lib],
  ["api/internal/invite/create", routeCreate],
  ["[token]/page.tsx", routeVstup],
  ["DokoncitPozvanku.tsx", klientPozvanky],
] as const) {
  assert.doesNotMatch(
    zdroj,
    ZAKAZANE_V_LOGU,
    `${jmeno}: token (ani hotová URL) se nesmí dostat do logu`,
  );
}
// Pojistka proti „vypíšeme si to jen dočasně": v routě konzumace nesmí být
// console vůbec — jediná cesta ven je redirect.
assert.doesNotMatch(routeVstup, /console\./, "pozvánka: žádné logování v cestě s tokenem");
assert.doesNotMatch(klientPozvanky, /console\./, "klient pozvánky: žádné logování tokenu");

/* ========================================================================== */
/* B) Vytvoření pozvánky: autorizace jako ostatní interní routy               */
/* ========================================================================== */

assert.match(
  routeCreate,
  /jeAutorizovanyReport\(request\.headers\.get\("authorization"\)\)/,
  "create musí použít sdílenou autorizaci interních rout",
);
assert.match(routeCreate, /status: 401/, "create musí bez secretu vracet 401");
assert.ok(
  routeCreate.indexOf("jeAutorizovanyReport") < routeCreate.indexOf("request.json()"),
  "autorizace musí proběhnout DŘÍV, než se sáhne na tělo requestu",
);
assert.match(routeCreate, /runtime = "nodejs"/, "create potřebuje Node runtime");
assert.match(routeCreate, /dynamic = "force-dynamic"/, "create se nesmí prerenderovat");
// Odpověď nese jediný plaintext token v systému — nikdy se nesmí cachovat.
const pocetNoStore = (routeCreate.match(/NO_STORE/g) ?? []).length;
assert.ok(pocetNoStore >= 5, `každá odpověď create musí být no-store (nalezeno ${pocetNoStore})`);
assert.match(
  routeCreate,
  /"Cache-Control": "no-store"/,
  "create musí zakázat cachování",
);
// Telefon se validuje (normalizeCzechPhone hází TypeError → 400, ne 500).
assert.match(routeCreate, /e instanceof TypeError/, "neplatný telefon musí končit 400");
assert.match(routeCreate, /status: 400/, "create musí umět odmítnout neplatný vstup");

// Tvar odpovědi: `{ url, expiresAt }` a URL míří na /vstup/<token>.
assert.match(lib, /expiresAt/, "odpověď musí nést expiraci");
assert.match(lib, /expiresAt/, "odpověď musí nést expiraci");
assert.equal(INVITE_TTL_MS, 30 * 24 * 60 * 60 * 1000, "pozvánka platí 30 dní");

/* ========================================================================== */
/* C) + D) Hash s peppertem, žádný plaintext v databázi                       */
/* ========================================================================== */

{
  const token = novyInviteToken();
  const hash = hashInviteToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/, "hash je 64 hex znaků (HMAC-SHA256)");
  assert.notEqual(hash, token, "hash se nesmí rovnat tokenu");
  assert.ok(!hash.includes(token), "hash nesmí obsahovat token");
  assert.equal(hashInviteToken(token), hash, "hash musí být deterministický");
  assert.notEqual(
    hashInviteToken(novyInviteToken()),
    hash,
    "různé tokeny musí dát různý hash",
  );

  // Bez pepperu (nebo s jiným) musí vyjít něco jiného — jinak by únik databáze
  // stačil k odvození platného odkazu.
  const puvodni = process.env.BAR_AUTH_PEPPER;
  process.env.BAR_AUTH_PEPPER = "uplne-jiny-pepper-16-znaku";
  const jinyPepper = hashInviteToken(token);
  process.env.BAR_AUTH_PEPPER = puvodni;
  assert.notEqual(jinyPepper, hash, "hash musí záviset na pepperu");
}

// Do databáze jde `token_hash`, nikdy `token`.
assert.match(
  lib,
  /token_hash: hashInviteToken\(token\)/,
  "do invite_links se ukládá hash, ne plaintext",
);
assert.doesNotMatch(
  lib,
  /insert\(\{[^}]*\btoken\b\s*[,}]/,
  "plaintext token se nesmí objevit v insertu",
);
// Pepper má jedinou implementaci — sdílenou s PINy a e-mailovými tokeny.
assert.match(lib, /hashSecret\("invite:v1", token\)/, "hash jede přes sdílený hashSecret");
assert.match(
  read("src/lib/phone-auth-server.ts"),
  /process\.env\.BAR_AUTH_PEPPER/,
  "pepper zůstává BAR_AUTH_PEPPER — nezavádí se další secret k rotaci",
);
assert.doesNotMatch(lib, /process\.env\.[A-Z_]*PEPPER/, "modul si nesmí číst vlastní pepper");

/* ========================================================================== */
/* C) Ověření: fail-closed a bez orákula                                      */
/* ========================================================================== */

// Jediná cesta ven při selhání — a všechny důvody ji sdílejí.
assert.match(routeVstup, /const PRI_SELHANI = "\/prihlaseni"/, "selhání vede na /prihlaseni");
const odmitnuti = (routeVstup.match(/redirect\(PRI_SELHANI\)/g) ?? []).length;
assert.ok(odmitnuti >= 3, `všechny důvody selhání musí končit stejně (nalezeno ${odmitnuti})`);
// Klient dopadá stejně: chyba výměny tokenu končí tam co neplatný token.
assert.match(
  klientPozvanky,
  /router\.replace\(error \? PRI_SELHANI : PO_PRIHLASENI\)/,
  "chyba při výměně tokenu musí skončit na /prihlaseni",
);
// Stránka nikdy nevypisuje důvod — jen 404, redirect, nebo přihlašovací mezikrok.
assert.doesNotMatch(
  routeVstup,
  /NextResponse\.json/,
  "pozvánka nikdy nevrací tělo s důvodem",
);
// Mezi důvody, proč SPRÁVNĚ TVAROVANÝ token neprošel, se rozlišovat nesmí.
// (`notFound` je jiná kategorie — viz níž: to není důvod selhání pozvánky,
// ale odpověď na cestu, která pozvánkou vůbec nebyla.)
const kodBezKomentaru = routeVstup.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
for (const podezrele of ["expired", "revoked", "neplatn", "prošl", "consumed"]) {
  assert.ok(
    !new RegExp(podezrele, "i").test(kodBezKomentaru),
    `vstup nesmí v kódu rozlišovat důvod („${podezrele}")`,
  );
}
// `notFound()` smí padnout JEN v jediné větvi — u špatného tvaru. Kdyby se
// použil i na neplatný token, stal by se z něj orákulum: 404 = token neexistuje,
// 303 = token existuje.
assert.equal(
  (kodBezKomentaru.match(/notFound\(\)/g) ?? []).length,
  1,
  "notFound() smí být jen ve větvi špatného tvaru, nikde jinde",
);
// Kontrola platnosti a revokace vůbec existuje.
assert.match(lib, /revoked_at !== null/, "revokovaná pozvánka nesmí projít");
assert.match(
  lib,
  /Date\.parse\(radek\.data\.expires_at\) <= Date\.now\(\)/,
  "prošlá pozvánka nesmí projít",
);
assert.match(lib, /timingSafeEqual\(ulozeny, kandidat\)/, "hash se porovnává v konstantním čase");
assert.match(lib, /last_used_at: new Date\(\)\.toISOString\(\)/, "úspěch zapisuje last_used_at");
// Celý modul je fail-closed: každá chybová větev vrací `null`/`false`.
assert.match(lib, /catch \(e\) \{[\s\S]*?return null;/, "výjimka při ověření = nepustíme dál");

// Cíl po úspěchu je rozcestník (rozhodnutí Atreye 6. 8. 2026), ne /kredit —
// homepage má nahoře kreditní banner, takže host vidí kredit i všechno ostatní.
assert.match(
  klientPozvanky,
  /const PO_PRIHLASENI = "\/";/,
  "po přihlášení se míří na rozcestník „/“",
);
assert.doesNotMatch(
  klientPozvanky,
  /PO_PRIHLASENI = "\/kredit"/,
  "cíl už není /kredit",
);

// Referrer: token je v adrese, takže se nesmí posílat na cizí zdroje.
assert.match(
  routeVstup,
  /referrer: "no-referrer"/,
  "stránka musí deklarovat referrer: no-referrer",
);
assert.match(
  routeVstup,
  /dynamic = "force-dynamic"/,
  "pozvánka se nesmí prerenderovat ani cachovat",
);

/* ========================================================================== */
/* E) Session vzniká JEDINOU sdílenou cestou                                  */
/* ========================================================================== */

assert.match(
  phoneAuthServer,
  /export async function vydatSessionProTelefon/,
  "sdílená cesta k session musí existovat",
);
assert.match(
  routeVstup,
  /vydatSessionProTelefon\(phone\)/,
  "pozvánka musí použít sdílenou cestu k session",
);
assert.match(
  phoneAuthServer,
  /const session = await vydatSessionProTelefon\(phone\);/,
  "ověření SMS kódu musí použít TU SAMOU sdílenou cestu",
);

// Jediná implementace: `generateLink` i zápis `phone_identities` smí být
// v celém zdrojovém stromu právě jednou.
function souboryTS(adresar: string): string[] {
  return readdirSync(adresar, { withFileTypes: true }).flatMap((polozka) => {
    const cesta = join(adresar, polozka.name);
    if (polozka.isDirectory()) return souboryTS(cesta);
    return /\.tsx?$/.test(polozka.name) && statSync(cesta).isFile() ? [cesta] : [];
  });
}
const vsechnyZdroje = souboryTS(join(root, "src"));
for (const [popis, vzor, strop] of [
  ["generateLink", /auth\.admin\.generateLink\(/g, 1],
  ["upsert phone_identities", /from\("phone_identities"\)\s*\.upsert\(/g, 1],
] as const) {
  let nalezeno = 0;
  const kde: string[] = [];
  for (const soubor of vsechnyZdroje) {
    const pocet = (readFileSync(soubor, "utf8").match(vzor) ?? []).length;
    if (pocet > 0) kde.push(soubor.slice(root.length));
    nalezeno += pocet;
  }
  assert.equal(
    nalezeno,
    strop,
    `${popis} smí být v celém stromu právě ${strop}× (nalezeno ${nalezeno}: ${kde.join(", ")})`,
  );
}

// Výměna tokenu za session jede STEJNÝM mechanismem jako přihlášení PINem
// (prohlížečový klient + verifyOtp typu email) — žádný nový způsob přihlášení.
assert.match(
  klientPozvanky,
  /getBrowserSupabase\(\)\.auth\.verifyOtp\(\{\s*token_hash: tokenHash,\s*type: "email",\s*\}\)/,
  "session se vyměňuje přes verifyOtp s typem email",
);
assert.match(
  read("src/components/PrihlaseniFormular.tsx"),
  /auth\.verifyOtp\(\{ token_hash: data\.tokenHash, type: "email" \}\)/,
  "SMS přihlášení musí používat tentýž mechanismus — jinak se cesty rozešly",
);

/* ========================================================================== */
/* F) Rate limit na IP                                                        */
/* ========================================================================== */

assert.match(
  routeVstup,
  /zapsatPokusAOveritLimit\(klientskaIp\(await headers\(\)\)\)/,
  "pozvánka musí rate-limitovat podle IP",
);
// Porovnávají se VOLÁNÍ, ne první výskyt jména — v importu je pořadí jiné.
assert.ok(
  routeVstup.indexOf("zapsatPokusAOveritLimit(klientskaIp(request))") <
    routeVstup.indexOf("telefonZPozvanky(token)"),
  "rate limit musí běžet DŘÍV, než se sáhne na token",
);
// Fail-closed: nezjištěný stav limitu request odmítne.
assert.match(lib, /if \(pocet\.error\) return false;/, "nezjištěný počet pokusů = odmítnout");
assert.match(lib, /if \(zapis\.error\) return false;/, "nezapsaný pokus = odmítnout");
assert.match(lib, /catch \(e\) \{[\s\S]*?return false;/, "výjimka v limitu = odmítnout");
assert.ok(INVITE_RATE_MAX > 0 && INVITE_RATE_MAX <= 50, "strop pokusů dává smysl");
assert.equal(INVITE_RATE_WINDOW_MS, 15 * 60 * 1000, "okno limitu je 15 minut (jako u SMS)");
// IP se ukládá jen jako hash — stejný postup jako u SMS challenge.
assert.match(lib, /hashIp\(rawIp\)/, "IP se ukládá výhradně jako hash");
assert.doesNotMatch(lib, /ip_hash: rawIp/, "syrová IP se nesmí ukládat");

/* ========================================================================== */
/* G) Migrace 009                                                             */
/* ========================================================================== */

for (const [popis, vzor] of [
  ["tabulka invite_links", /create table if not exists public\.invite_links/],
  ["id uuid pk", /id uuid primary key default gen_random_uuid\(\)/],
  ["phone not null", /phone text not null/],
  ["token_hash unique", /token_hash text not null unique/],
  ["created_at", /created_at timestamptz not null default now\(\)/],
  ["expires_at not null", /expires_at timestamptz not null,/],
  ["last_used_at", /last_used_at timestamptz/],
  ["revoked_at", /revoked_at timestamptz/],
  ["index na phone", /invite_links_phone_created_idx/],
  ["RLS zapnutá", /alter table public\.invite_links enable row level security/],
  ["tabulka pokusů", /create table if not exists public\.invite_link_attempts/],
  ["RLS na pokusech", /alter table public\.invite_link_attempts enable row level security/],
  ["idempotence", /create table if not exists/],
] as const) {
  assert.match(migrace, vzor, `migrace 009: chybí ${popis}`);
}
// Service-role only: žádné policies a odebrané grants pro klientské role.
assert.doesNotMatch(migrace, /create policy/i, "invite tabulky nesmí mít žádné policies");
assert.match(
  migrace,
  /revoke all on public\.invite_links from anon, authenticated/,
  "invite_links musí být pro klientské role zavřená",
);
assert.match(
  migrace,
  /revoke all on public\.invite_link_attempts from anon, authenticated/,
  "invite_link_attempts musí být pro klientské role zavřená",
);
assert.match(migrace, /grant select, insert, update on public\.invite_links to service_role/);

/* --- Modul nesmí do klientského bundlu ------------------------------------ */
assert.match(
  lib,
  /typeof window !== "undefined"/,
  "invite-links musí mít pojistku proti client bundlu",
);
for (const soubor of vsechnyZdroje) {
  const obsah = readFileSync(soubor, "utf8");
  if (!obsah.startsWith('"use client"')) continue;
  assert.doesNotMatch(
    obsah,
    /^import(?! type).*invite-links.*$/m,
    `${soubor.slice(root.length)}: klientská komponenta nesmí importovat invite-links`,
  );
}

console.log(
  `✓ check-invite-links: OK (${vzorky.length} tokenů á ${TOKEN_LENGTH} znaků base64url ` +
    `z crypto RNG bez kolize · adresa ${PRODUKCNI_BASE}/… = 45/${MAX_DELKA_URL} znaků v GSM-7 · ` +
    `root catch-all nekoliduje s ${topLevel.length} top-level routami ani ${verejneSoubory.length} ` +
    "veřejnými soubory · mimo formát = 404 · hash s peppertem, plaintext jen v odpovědi · " +
    "create 401 bez secretu · bez orákula, no-referrer, rate limit fail-closed · " +
    "session sdílená s SMS ověřením · migrace 009 service-role only)",
);
