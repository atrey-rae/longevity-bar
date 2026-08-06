/**
 * Kontrola oznámení (Web Push).
 *
 * Hlídá pět věcí, na kterých ta funkce stojí:
 *
 *   A) PRIVÁTNÍ VAPID KLÍČ nesmí opustit server — ani přes klientskou
 *      komponentu, ani přes `NEXT_PUBLIC_` proměnnou,
 *   B) BEZ KONFIGURACE se všechno tiše vypne (žádná chyba hostovi),
 *   C) SERVICE WORKER neobsahuje cachování — Next si assety řídí sám,
 *   D) SUBSCRIBE routa validuje tvar a nepřijímá cizí endpointy,
 *   E) iOS GATE se opravdu renderuje a nabídka se nikdy neptá sama.
 *
 * Spuštění: `npx tsx scripts/check-push.ts`
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (cesta: string) => readFileSync(join(root, cesta), "utf8");

const sw = read("public/sw.js");
const push = read("src/lib/push.ts");
const config = read("src/lib/push-config.ts");
const pwa = read("src/lib/pwa.ts");
const komponenta = read("src/components/Oznameni.tsx");
const routeSubscribe = read("src/app/api/push/subscribe/route.ts");
const routeUnsubscribe = read("src/app/api/push/unsubscribe/route.ts");
const adminStranka = read("src/app/admin/oznameni/page.tsx");
const adminAkce = read("src/app/admin/actions.ts");
const migrace = read("supabase/migrations/010_push_subscriptions.sql");
const loyalty = read("src/lib/loyalty-server.ts");

/* ========================================================================== */
/* A) Privátní VAPID klíč zůstává na serveru                                  */
/* ========================================================================== */

assert.match(
  push,
  /typeof window !== "undefined"/,
  "lib/push.ts musí mít pojistku proti client bundlu",
);

function souboryTS(adresar: string): string[] {
  return readdirSync(adresar, { withFileTypes: true }).flatMap((polozka) => {
    const cesta = join(adresar, polozka.name);
    if (polozka.isDirectory()) return souboryTS(cesta);
    return /\.tsx?$/.test(polozka.name) && statSync(cesta).isFile() ? [cesta] : [];
  });
}
const zdroje = souboryTS(join(root, "src"));

// Privátní klíč smí ČÍST jen dva moduly: `push.ts` (podepisuje jím oznámení)
// a `push-config.ts` (ptá se pouze na jeho existenci, hodnotu nikdy nevrací).
// Kontroluje se skutečné čtení z env, ne pouhá zmínka názvu — admin stránka
// návod na jeho nastavení zobrazuje a to je v pořádku.
const POVOLENO_PRIVATNI = ["src/lib/push.ts", "src/lib/push-config.ts"];
for (const soubor of zdroje) {
  const relativni = soubor.slice(root.length);
  const obsah = readFileSync(soubor, "utf8");

  if (/process\.env\.VAPID_PRIVATE_KEY/.test(obsah)) {
    assert.ok(
      POVOLENO_PRIVATNI.includes(relativni),
      `${relativni}: privátní VAPID klíč smí číst jen push.ts a push-config.ts`,
    );
  }
  // `NEXT_PUBLIC_` by klíč propsalo do bundlu napevno — nikdy.
  assert.doesNotMatch(
    obsah,
    /NEXT_PUBLIC_VAPID/,
    `${relativni}: VAPID klíč se nesmí publikovat přes NEXT_PUBLIC_`,
  );

  if (!obsah.startsWith('"use client"')) continue;
  // Klientské komponenty nesmí sahat na ŽÁDNÝ serverový push modul — ani na
  // `push-config`, který sice hodnotu privátního klíče nevrací, ale čte env.
  // Veřejný klíč jde ke klientovi výhradně propem ze server komponenty.
  for (const zakazany of ["lib/push", "push-config", "web-push"] as const) {
    const vzor = new RegExp(`^import(?! type).*${zakazany.replace("/", "\\/")}.*$`, "gm");
    assert.deepEqual(
      obsah.match(vzor) ?? [],
      [],
      `${relativni}: klientská komponenta nesmí importovat ${zakazany}`,
    );
  }
  assert.doesNotMatch(
    obsah,
    /process\.env\.VAPID/,
    `${relativni}: klient nesmí číst VAPID proměnné`,
  );
}

// Veřejný klíč se ke klientovi dostane VÝHRADNĚ jako prop ze server komponenty.
assert.match(
  komponenta,
  /\{ vapidKlic \}: \{ vapidKlic: string \| null \}/,
  "komponenta bere veřejný klíč propem, ne z env",
);
for (const [jmeno, stranka] of [
  ["rozcestník", read("src/app/page.tsx")],
  ["odměny", read("src/app/odmeny/page.tsx")],
] as const) {
  assert.match(
    stranka,
    /<Oznameni vapidKlic=\{verejnyKlicProKlienta\(\)\} \/>/,
    `${jmeno}: musí montovat nabídku oznámení s klíčem ze serveru`,
  );
}

/* ========================================================================== */
/* B) Bez konfigurace se funkce tiše vypne                                    */
/* ========================================================================== */

assert.match(
  config,
  /VAPID_PUBLIC_KEY[\s\S]*VAPID_PRIVATE_KEY[\s\S]*VAPID_SUBJECT/,
  "konfigurace musí kontrolovat všechny tři proměnné",
);
assert.match(
  config,
  /return jePushNakonfigurovany\(\) \? vapidVerejnyKlic\(\) : null;/,
  "bez KOMPLETNÍ konfigurace se klientovi nesmí dát ani veřejný klíč",
);
assert.match(
  komponenta,
  /if \(!vapidKlic\) \{\s*setStav\("nepodporovano"\);/,
  "bez klíče se nabídka vůbec nezobrazí",
);
assert.match(
  push,
  /if \(!pripravit\(\)\) return prazdny;/,
  "bez konfigurace se nic neodesílá a nic nehází",
);
assert.match(
  routeSubscribe,
  /if \(!jePushNakonfigurovany\(\)\)/,
  "bez konfigurace se odběry ani nepřijímají",
);
// Návod na vygenerování klíčů musí být po ruce tam, kde ho admin hledá.
for (const [jmeno, zdroj] of [
  ["push-config", config],
  ["admin stránka", adminStranka],
] as const) {
  assert.match(
    zdroj,
    /web-push generate-vapid-keys/,
    `${jmeno}: musí popsat, jak se klíče vyrobí`,
  );
}

/* ========================================================================== */
/* C) Service worker: jen oznámení, žádné cachování                           */
/* ========================================================================== */

for (const [popis, vzor] of [
  ["push handler", /addEventListener\("push"/],
  ["klik na oznámení", /addEventListener\("notificationclick"/],
  ["zobrazení oznámení", /showNotification\(/],
  ["ikona z manifestu", /icon: "\/icon-192\.png"/],
] as const) {
  assert.match(sw, vzor, `service worker: chybí ${popis}`);
}
// Cachování by hostovi u baru servírovalo starý katalog nebo zamrzlý kredit.
for (const zakazane of [
  /addEventListener\(\s*["']fetch["']/,
  /caches\./,
  /new Cache/,
  /cache\.addAll/,
  /workbox/i,
] as const) {
  assert.doesNotMatch(sw, zakazane, `service worker nesmí cachovat (${zakazane})`);
}
// Cíl kliknutí musí zůstat v appce — cizí doména v oznámení je phishing.
assert.match(
  sw,
  /data\.url\.startsWith\("\/"\)/,
  "service worker musí odmítnout absolutní URL v payloadu",
);
assert.match(
  sw,
  /new URL\(okno\.url\)\.origin !== self\.location\.origin/,
  "service worker smí přeostřit jen vlastní okno",
);

/* ========================================================================== */
/* D) Routy: validace tvaru, žádné cizí endpointy                             */
/* ========================================================================== */

for (const [popis, vzor] of [
  ["https endpoint", /url\.protocol === "https:"/],
  ["strop délky endpointu", /hodnota\.length > 1000/],
  ["validace klíčů", /platnyKlic\(vstup\?\.keys\?\.p256dh, 200\)/],
  ["abeceda klíčů", /\/\^\[A-Za-z0-9_=-\]\+\$\//],
  ["spárování s účtem", /user_id: user\?\.id \?\? null/],
  ["jazyk z klienta", /normalizeLang\(vstup\?\.lang\) \?\? lang/],
  ["upsert podle endpointu", /onConflict: "endpoint"/],
  ["no-store", /NO_STORE/],
] as const) {
  assert.match(routeSubscribe, vzor, `subscribe: chybí ${popis}`);
}
assert.match(routeSubscribe, /runtime = "nodejs"/, "subscribe potřebuje Node runtime");
// Odhlášení nesmí nic prozradit ani vyžadovat session (jinak by ho
// nepřihlášený host nikdy neprovedl).
assert.match(
  routeUnsubscribe,
  /return NextResponse\.json\(\{ status: "ok" \}/,
  "unsubscribe odpovídá vždy stejně",
);
assert.doesNotMatch(
  routeUnsubscribe,
  /getSessionUser/,
  "unsubscribe nesmí vyžadovat přihlášení",
);

/* --- Admin: server action má vlastní ochranu ------------------------------ */
assert.match(
  adminAkce,
  /export async function odeslatOznameni\(formData: FormData\)/,
  "hromadné oznámení jede server action, ne API routou",
);
assert.ok(
  adminAkce.indexOf("export async function odeslatOznameni") <
    adminAkce.indexOf('requireAdmin("/admin/oznameni")'),
  "server action musí volat requireAdmin uvnitř sebe",
);
assert.match(
  adminAkce,
  /!syrovaUrl\.startsWith\("\/"\) \|\| syrovaUrl\.startsWith\("\/\/"\)/,
  "odkaz v oznámení musí zůstat relativní (jinak phishing)",
);
assert.match(adminStranka, /requireAdmin\("\/admin\/oznameni"\)/, "admin stránka je chráněná");
assert.match(
  read("src/app/admin/oznameni/OznameniFormular.tsx"),
  /Náhled/,
  "formulář musí mít náhled oznámení",
);
assert.match(
  read("src/app/admin/oznameni/OznameniFormular.tsx"),
  /potvrzeno/,
  "odeslání musí vyžadovat potvrzení",
);

/* --- Odesílání: úklid mrtvých odběrů a fail-soft -------------------------- */
assert.match(
  push,
  /status === 404 \|\| status === 410/,
  "mrtvý odběr (404/410) se musí poznat",
);
assert.match(push, /\.delete\(\)\s*\.in\("id", kSmazani\)/, "mrtvé odběry se mažou");
assert.match(push, /const DAVKA = 50;/, "posílá se po dávkách");
assert.match(
  push,
  /export function poslatNaPozadi/,
  "musí existovat fail-soft obal pro automatická oznámení",
);
// Automatické oznámení o odměně nesmí zdržet ani shodit připsání razítka.
assert.match(
  loyalty,
  /if \(newReward\) \{\s*poslatNaPozadi\(\{/,
  "nová odměna musí spustit oznámení",
);
assert.match(loyalty, /url: "\/vyber"/, "oznámení o odměně vede na výběr");
assert.doesNotMatch(
  loyalty,
  /await poslatOznameni\(/,
  "razítko nesmí čekat na odeslání oznámení",
);

/* ========================================================================== */
/* E) iOS gate a slušná nabídka                                               */
/* ========================================================================== */

assert.match(
  pwa,
  /export function potrebujeNaPlochuKvuliPush\(\): boolean \{\s*return jeIos\(\) && !jeNaPlose\(\);/,
  "iOS gate musí být jedna sdílená funkce",
);
assert.match(
  komponenta,
  /potrebujeNaPlochuKvuliPush\(\)/,
  "komponenta musí iOS gate používat",
);
assert.match(komponenta, /stav === "naploshu"/, "iOS větev musí mít vlastní vykreslení");
assert.match(
  komponenta,
  /\{t\.oznameni\.iosNadpis\}/,
  "iOS návod musí být ze slovníku",
);
// Nikdy se neptá sama — `requestPermission` smí být jen v obsluze kliknutí.
assert.equal(
  (komponenta.match(/Notification\.requestPermission\(\)/g) ?? []).length,
  1,
  "o povolení se smí žádat jen na jednom místě",
);
assert.ok(
  komponenta.indexOf("const zapnout = useCallback") <
    komponenta.indexOf("Notification.requestPermission()"),
  "o povolení se žádá až v reakci na klepnutí hosta",
);
assert.match(
  komponenta,
  /if \(stav === "zjistuji" \|\| stav === "nepodporovano" \|\| stav === "odmitnuto"\) \{\s*return null;/,
  "nepodporovaný ani odmítnutý stav se hostovi nepřipomíná",
);
assert.match(komponenta, /vypnout/, "host musí mít cestu oznámení vypnout");

/* --- Dvojjazyčnost -------------------------------------------------------- */
for (const klic of [
  "eyebrow",
  "nadpis",
  "popis",
  "zapnout",
  "zapinam",
  "zapnuto",
  "vypnout",
  "chyba",
  "iosNadpis",
  "iosPopis",
  "odmenaTitulek",
  "odmenaText",
  "kreditTitulek",
] as const) {
  assert.ok(
    cs.oznameni[klic].trim().length > 0 && en.oznameni[klic].trim().length > 0,
    `oznameni.${klic} musí být v obou jazycích`,
  );
}
assert.ok(
  cs.oznameni.kreditText("500 Kč").includes("500 Kč") &&
    en.oznameni.kreditText("500 Kč").includes("500 Kč"),
  "oznámení o kreditu musí propsat částku v obou jazycích",
);

/* ========================================================================== */
/* F) Migrace 010                                                             */
/* ========================================================================== */

for (const [popis, vzor] of [
  ["tabulka", /create table if not exists public\.push_subscriptions/],
  ["id uuid pk", /id uuid primary key default gen_random_uuid\(\)/],
  ["user_id nullable + cascade", /user_id uuid references auth\.users\(id\) on delete cascade/],
  ["endpoint unique", /endpoint text not null unique/],
  ["p256dh", /p256dh text not null/],
  ["auth", /auth text not null/],
  ["lang s výchozí hodnotou", /lang text not null default 'cs'/],
  ["created_at", /created_at timestamptz not null default now\(\)/],
  ["last_sent_at", /last_sent_at timestamptz/],
  ["failed_at", /failed_at timestamptz/],
  ["index na user_id", /push_subscriptions_user_idx/],
  ["RLS", /alter table public\.push_subscriptions enable row level security/],
  ["idempotence", /create table if not exists/],
] as const) {
  assert.match(migrace, vzor, `migrace 010: chybí ${popis}`);
}
assert.doesNotMatch(migrace, /create policy/i, "push_subscriptions nesmí mít policies");
assert.match(
  migrace,
  /revoke all on public\.push_subscriptions from anon, authenticated/,
  "tabulka musí být pro klientské role zavřená",
);

console.log(
  "✓ check-push: OK (privátní VAPID klíč jen v lib/push.ts · bez konfigurace vše tiše vypnuté · " +
    "SW bez cachování a jen s relativními cíli · subscribe validuje tvar · iOS gate + nabídka " +
    "se nikdy neptá sama · admin action s vlastním requireAdmin · migrace 010 service-role only)",
);
