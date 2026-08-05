/**
 * Kontrola politiky kvízu — části, které jdou ověřit bez databáze:
 *
 *   1. normalizace kontaktu (e-mail, telefon),
 *   2. HMAC hash kontaktu pro anonymní ochranu proti duplicitám
 *      (migrace 006, `quiz_completions.contact_hash`),
 *   3. porovnání tajemství v konstantním čase,
 *   4. bearer autorizace interního API pro Healing,
 *   5. bezpečný `next` při přesměrování z `/kviz/<bavič>` na `/prihlaseni`
 *      (bavič se nesmí ztratit a nesmí z toho jít udělat open redirect).
 *
 * Spuštění: `npx tsx scripts/check-kviz-policy.ts` (nebo `npm run check`)
 */
import { overitInterniToken } from "../src/lib/interni-auth";
import {
  hashKontaktu,
  normalizovatEmail,
  normalizovatTelefon,
  shodujeSeTajemstvi,
} from "../src/lib/kontakt";
import { BAVICI } from "../src/lib/kviz";
import { VARIANTY } from "../src/lib/kviz-varianty";
import { bezpecnyNext } from "../src/lib/navigation";

const chyby: string[] = [];

function overit(popis: string, podminka: boolean): void {
  if (!podminka) chyby.push(popis);
}

function stejne(popis: string, a: unknown, b: unknown): void {
  if (a !== b) chyby.push(`${popis} — dostali jsme ${String(a)}, čekáme ${String(b)}`);
}

/* -------------------------------------------------------------------------- */
/* 1) Normalizace kontaktu                                                     */
/* -------------------------------------------------------------------------- */

stejne("telefon: 9 číslic → +420", normalizovatTelefon("601123456"), "+420601123456");
stejne("telefon: mezery se ignorují", normalizovatTelefon(" 601 123 456 "), "+420601123456");
stejne("telefon: pomlčky a tečky", normalizovatTelefon("601-123.456"), "+420601123456");
stejne("telefon: +420 zůstává", normalizovatTelefon("+420601123456"), "+420601123456");
stejne("telefon: cizí předvolba", normalizovatTelefon("00421901123456"), "+00421901123456");
overit("telefon: krátké číslo neprojde", normalizovatTelefon("12345") === null);
overit("telefon: písmena neprojdou", normalizovatTelefon("60112345a") === null);
overit("telefon: prázdný vstup neprojde", normalizovatTelefon("") === null);

stejne("e-mail: trim + lowercase", normalizovatEmail("  Host@Email.CZ "), "host@email.cz");
overit("e-mail: bez zavináče neprojde", normalizovatEmail("host.email.cz") === null);
overit("e-mail: bez domény neprojde", normalizovatEmail("host@email") === null);

/* -------------------------------------------------------------------------- */
/* 2) HMAC hash kontaktu                                                       */
/* -------------------------------------------------------------------------- */

// Bez tajemství se hash nepočítá — ochrana je best-effort, ale nikdy slabá.
delete process.env.QUIZ_CONTACT_HMAC_SECRET;
overit(
  "hash: bez QUIZ_CONTACT_HMAC_SECRET vrací null",
  hashKontaktu("host@email.cz", "601123456") === null,
);

process.env.QUIZ_CONTACT_HMAC_SECRET = "testovaci-tajemstvi-pro-kontrolu";

const zaklad = hashKontaktu("host@email.cz", "601123456");
overit("hash: se secretem něco vrátí", typeof zaklad === "string");
overit("hash: je hex sha256 (64 znaků)", /^[0-9a-f]{64}$/.test(zaklad ?? ""));

// Stejný kontakt zapsaný jinak musí dát stejný hash — jinak by duplicitní
// průchod stačilo schovat za mezeru nebo velké písmeno.
for (const [email, telefon] of [
  ["HOST@email.cz", "601123456"],
  ["  host@Email.CZ  ", " 601 123 456 "],
  ["host@email.cz", "+420601123456"],
  ["host@email.cz", "601-123-456"],
] as const) {
  stejne(`hash: '${email}' + '${telefon}' dává stejný hash`, hashKontaktu(email, telefon), zaklad);
}

// Jiný kontakt = jiný hash.
overit("hash: jiný e-mail dá jiný hash", hashKontaktu("jiny@email.cz", "601123456") !== zaklad);
overit("hash: jiný telefon dá jiný hash", hashKontaktu("host@email.cz", "601123457") !== zaklad);

// Hash nesmí prozradit kontakt ani při pohledu do databáze.
overit("hash: neobsahuje e-mail", !(zaklad ?? "").includes("host"));
overit("hash: neobsahuje telefon", !(zaklad ?? "").includes("601123456"));

// Jiné tajemství = jiný hash (kdyby klíč unikl, staré hashe se rotací zneplatní).
process.env.QUIZ_CONTACT_HMAC_SECRET = "jine-tajemstvi";
overit("hash: závisí na tajemství", hashKontaktu("host@email.cz", "601123456") !== zaklad);
process.env.QUIZ_CONTACT_HMAC_SECRET = "testovaci-tajemstvi-pro-kontrolu";

// Nepoužitelný kontakt se nehashuje — do DB by šel klíč z nesmyslu.
overit("hash: neplatný e-mail → null", hashKontaktu("neplatny", "601123456") === null);
overit("hash: neplatný telefon → null", hashKontaktu("host@email.cz", "abc") === null);

/* -------------------------------------------------------------------------- */
/* 3) Porovnání tajemství                                                      */
/* -------------------------------------------------------------------------- */

overit("tajemství: shoda", shodujeSeTajemstvi("tajny-token", "tajny-token"));
overit("tajemství: neshoda stejné délky", !shodujeSeTajemstvi("tajny-token", "tajny-tokeM"));
overit("tajemství: různá délka", !shodujeSeTajemstvi("tajny", "tajny-token"));
overit("tajemství: prázdné vs. neprázdné", !shodujeSeTajemstvi("", "tajny-token"));

/* -------------------------------------------------------------------------- */
/* 4) Bearer autorizace interního API                                          */
/* -------------------------------------------------------------------------- */

const URL_API = "https://bar.peaceandcoco.com/api/interni/quiz-policy";
const pozadavek = (hlavicky: Record<string, string> = {}): Request =>
  new Request(URL_API, { headers: hlavicky });

// Fail-closed: bez nastaveného tokenu je endpoint zavřený, ne otevřený.
delete process.env.HEALING_API_TOKEN;
const bezTokenu = overitInterniToken(pozadavek({ authorization: "Bearer cokoli" }));
overit("API: bez HEALING_API_TOKEN neprojde", !bezTokenu.ok);
stejne("API: bez HEALING_API_TOKEN vrací 503", bezTokenu.ok ? null : bezTokenu.status, 503);

process.env.HEALING_API_TOKEN = "spravny-token";

overit("API: správný token projde", overitInterniToken(pozadavek({ authorization: "Bearer spravny-token" })).ok);
overit("API: schéma je case-insensitive", overitInterniToken(pozadavek({ authorization: "bearer spravny-token" })).ok);

for (const [popis, hlavicky] of [
  ["bez hlavičky", {}],
  ["prázdná hlavička", { authorization: "" }],
  ["špatný token", { authorization: "Bearer spatny-token" }],
  ["token bez schématu", { authorization: "spravny-token" }],
  ["Basic místo Bearer", { authorization: "Basic spravny-token" }],
  ["Bearer bez hodnoty", { authorization: "Bearer" }],
] as const) {
  const vysledek = overitInterniToken(pozadavek(hlavicky));
  overit(`API: ${popis} neprojde`, !vysledek.ok);
  stejne(`API: ${popis} vrací 401`, vysledek.ok ? null : vysledek.status, 401);
}

/* -------------------------------------------------------------------------- */
/* 5) Návrat z přihlášení na stejný QR                                         */
/* -------------------------------------------------------------------------- */

// Přesně to, co skládá `/kviz/[bavic]/page.tsx`: cesta → encode → next → zpět.
for (const bavic of BAVICI) {
  for (const varianta of [null, ...VARIANTY.map((v) => v.id)]) {
    const cesta = varianta
      ? `/kviz/${bavic.slug}?varianta=${varianta}`
      : `/kviz/${bavic.slug}`;
    const parametr = new URLSearchParams({ next: cesta }).get("next");
    stejne(`next: ${cesta} přežije kolečko přes /prihlaseni`, bezpecnyNext(parametr), cesta);
    overit(`next: ${cesta} nese baviče`, bezpecnyNext(parametr).includes(bavic.slug));
  }
}

// A pořád nesmí jít o open redirect.
for (const zlomyslny of [
  "//evil.example.com",
  "https://evil.example.com/kviz/d4",
  "http://evil.example.com",
  "evil.example.com",
]) {
  stejne(`next: '${zlomyslny}' spadne na /`, bezpecnyNext(zlomyslny), "/");
}

/* -------------------------------------------------------------------------- */

if (chyby.length > 0) {
  console.error(`✗ check-kviz-policy: ${chyby.length} chyb`);
  for (const c of chyby) console.error(`  · ${c}`);
  process.exit(1);
}

console.log(
  "✓ check-kviz-policy: normalizace kontaktu, HMAC hash, konstantní porovnání, " +
    "bearer autorizace a bezpečný návrat na QR — vše OK",
);
