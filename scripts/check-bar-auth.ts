import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";
import {
  PIN_TTL_MS,
  generateFourDigitCode,
  normalizeCzechPhone,
  smsText,
  isInternalAuthEmail,
} from "../src/lib/phone-auth";
import { sendSms } from "../src/lib/phone-auth-server";
import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  dlouhodobaCookie,
} from "../src/lib/supabase/cookies";

assert.equal(normalizeCzechPhone("601 123 456"), "+420601123456");
assert.equal(normalizeCzechPhone("+420 601 123 456"), "+420601123456");
assert.equal(normalizeCzechPhone("00421 944 940 028"), "+421944940028");
assert.throws(() => normalizeCzechPhone("123"));

assert.equal(generateFourDigitCode(() => 7), "0007");
assert.equal(generateFourDigitCode(() => 12_345), "2345");
assert.match(generateFourDigitCode(), /^\d{4}$/);
assert.equal(PIN_TTL_MS, 10 * 60 * 1000);
assert.equal(isInternalAuthEmail("phone+abc@auth.longevity.invalid"), true);
assert.equal(isInternalAuthEmail("atrey@wildandcoco.com"), false);
assert.equal(
  smsText("1234"),
  "Tvuj kod pro Longevity Bar je 1234. Tak ziskej co nejvic odmen! WILD&COCO",
);

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const login = read("src/components/PrihlaseniFormular.tsx");
const migration = read("supabase/migrations/005_phone_first_auth.sql");
const loyalty = read("src/lib/loyalty-server.ts");
const onboarding = read("src/components/EmailOnboarding.tsx");
const emailServer = read("src/lib/email-verification-server.ts");
const phoneServer = read("src/lib/phone-auth-server.ts");

assert.match(login, /sessionStorage/);
assert.match(login, /maxLength=\{4\}/);
assert.doesNotMatch(login, /sessionStorage\.setItem\([^\n]+kod/);
assert.match(migration, /create table if not exists public\.phone_identities/);
assert.match(migration, /revoke all on public\.phone_auth_challenges from anon, authenticated/);
assert.match(migration, /@auth\\\.longevity\\\.invalid\$/);
assert.match(migration, /for update/i);
assert.match(migration, /revoke all on function public\.consume_phone_auth_challenge/i);
assert.match(phoneServer, /rpc\("consume_phone_auth_challenge"/);
assert.match(loyalty, /email_unverified/);

// Texty onboardingu i aktivačního e-mailu se od 6. 8. 2026 berou ze slovníku.
// Hlídá se proto české ZNĚNÍ ve slovníku plus to, že ho kód opravdu používá —
// dřív stačil doslovný řetězec v komponentě.
assert.match(cs.emailOnboarding.uspech, /Mrkni se do Tvého inboxu i do spamu/);
assert.match(onboarding, /t\.emailOnboarding\.uspech/);
assert.match(cs.email.aktivaceTelo, /aktivuj svůj účet zde\.$/);
assert.equal(cs.email.aktivaceOdkazSlovo, "zde");
assert.equal(en.email.aktivaceOdkazSlovo, "here");
// Odkaz se do věty vkládá na místo posledního výskytu slova „zde“/„here“.
assert.match(emailServer, /<a href="\$\{activationUrl\}">\$\{slovo\}<\/a>/);
assert.match(emailServer, /kolemOdkazu\(t\.email\.aktivaceTelo, slovo\)/);
for (const jazyk of ["cs", "en"] as const) {
  const slovnik = jazyk === "cs" ? cs : en;
  assert.ok(
    slovnik.email.aktivaceTelo.lastIndexOf(slovnik.email.aktivaceOdkazSlovo) > 0,
    `${jazyk}: aktivační věta musí obsahovat slovo odkazu`,
  );
}
assert.doesNotMatch(emailServer, /last_activation_email_at:\s*null/);
assert.match(onboarding, /data\.throttled/);

// --- Dlouhé přihlášení (Atrey 6. 8.: 30 dní, nikdo nevypadne na place) ------

const middleware = read("src/middleware.ts");
const serverClient = read("src/lib/supabase/server.ts");
const browserClient = read("src/lib/supabase/client.ts");
const odhlaseni = read("src/app/auth/odhlasit/route.ts");

assert.equal(SESSION_COOKIE_MAX_AGE_SECONDS, 60 * 60 * 24 * 30);

// Cookie bez maxAge = session cookie: zmizí se zavřením prohlížeče.
assert.equal(dlouhodobaCookie({}).maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
assert.equal(dlouhodobaCookie({ path: "/" }).maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
// Krátkou platnost zvedáme na 30 dní…
assert.equal(dlouhodobaCookie({ maxAge: 3600 }).maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
// …delší (dnes 400 dní z @supabase/ssr) nikdy nezkracujeme.
assert.equal(dlouhodobaCookie({ maxAge: 400 * 24 * 60 * 60 }).maxAge, 400 * 24 * 60 * 60);
// maxAge <= 0 je mazání cookie při odhlášení — to se prodloužit NESMÍ.
assert.equal(dlouhodobaCookie({ maxAge: 0 }).maxAge, 0);
assert.equal(dlouhodobaCookie({ maxAge: -1 }).maxAge, -1);
// Ostatní vlastnosti musí projít beze změny (jinak by se rozešly cookie jména).
assert.equal(dlouhodobaCookie({ sameSite: "lax", secure: true }).secure, true);
assert.equal(dlouhodobaCookie({}).path, "/");

// Zápis session cookies jde všude přes dlouhodobaCookie(), jinak by se
// 30denní platnost tiše minula účinkem.
assert.match(middleware, /dlouhodobaCookie\(options\)/);
assert.match(serverClient, /dlouhodobaCookie\(options\)/);
assert.match(middleware, /cookieOptions: SUPABASE_COOKIE_OPTIONS/);
assert.match(serverClient, /cookieOptions: SUPABASE_COOKIE_OPTIONS/);
// Prohlížečový klient si cookies píše sám — cookieOptions je jediná páka.
assert.match(browserClient, /cookieOptions: SUPABASE_COOKIE_OPTIONS/);

// Refresh tokenu se dá zapsat jen v middleware. Matcher proto musí sedět na
// všech stránkách, po kterých se člověk pohybuje — jinak mu tam session
// zestárne a po týdnu ho appka odhlásí.
const matcherZapis = middleware.match(/matcher:\s*\[([\s\S]*?)\]/);
assert.ok(matcherZapis, "middleware.ts nemá matcher");
// JSON.parse, ne holý text: ve zdrojáku je `\\.`, což by jako regex znamenalo
// „zpětné lomítko + cokoli" a výjimka na obrázky by tiše přestala platit.
const vzory = [...matcherZapis[1].matchAll(/"(?:[^"\\]|\\.)*"/g)].map(
  (m) => JSON.parse(m[0]) as string,
);
assert.equal(vzory.length, 1, "čekáme jediný matcher vzor");
const matcher = new RegExp(`^${vzory[0]}$`);
for (const cesta of [
  "/",
  "/darek",
  "/kredit",
  "/odmeny",
  "/odmena/12",
  "/kviz/a1",
  "/kviz/f6",
  "/vyber",
  "/prihlaseni",
  "/pravidla",
  "/sortiment/longevity",
  "/sortiment/wild-coco",
  "/scan/abc123",
  "/auth/callback",
]) {
  assert.ok(matcher.test(cesta), `middleware matcher nepokrývá ${cesta}`);
}
// Statika se naopak obnovovat nemá — zbytečný request na Supabase u každé ikony.
for (const cesta of ["/_next/static/chunk.js", "/icon.svg", "/logo.png", "/favicon.ico"]) {
  assert.ok(!matcher.test(cesta), `middleware matcher zbytečně chytá ${cesta}`);
}

// Odhlášení smí zabít jen tohle zařízení. Výchozí "global" scope zneplatní
// refresh tokeny všech zařízení — na sdíleném telefonu u stánku by jedno
// odhlášení vyhodilo člověka i z jeho vlastního mobilu.
assert.match(odhlaseni, /signOut\(\{\s*scope:\s*"local"\s*\}\)/);

// Přihlášení telefonem musí vydat plnou session s refresh tokenem (verifyOtp),
// ne anonymní účet bez obnovy.
assert.match(login, /verifyOtp\(\{\s*token_hash:/);
assert.doesNotMatch(login, /signInAnonymously/);

async function checkSmsDeliveryPaths() {
const originalEnv = { ...process.env };
try {
  process.env.OPTIMCALL_TOKEN = "test-token";
  process.env.OPTIMCALL_DEVICE_ID = "device";
  let directUrl = "";
  assert.equal(await sendSms("+420601123456", "1234", async (input, init) => {
    directUrl = String(input);
    assert.match(String(init?.body), /Tvuj kod pro Longevity Bar je 1234/);
    return new Response(JSON.stringify({ name: "SmsSent" }), { status: 200 });
  }), true);
  assert.match(directUrl, /optimcall/);

  delete process.env.OPTIMCALL_TOKEN;
  delete process.env.OPTIMCALL_DEVICE_ID;
  process.env.HEALING_SMS_BRIDGE_URL = "https://healing.example/api/internal/bar-sms";
  process.env.HEALING_BRIDGE_SECRET = "x".repeat(32);
  let bridgeAuth = "";
  assert.equal(await sendSms("+420601123456", "9876", async (input, init) => {
    assert.equal(String(input), process.env.HEALING_SMS_BRIDGE_URL);
    bridgeAuth = new Headers(init?.headers).get("authorization") ?? "";
    assert.match(String(init?.body), /Tvuj kod pro Longevity Bar je 9876/);
    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  }), true);
  assert.equal(bridgeAuth, `Bearer ${process.env.HEALING_BRIDGE_SECRET}`);
} finally {
  process.env = originalEnv;
}
}

checkSmsDeliveryPaths()
  .then(() => console.log("bar phone auth checks: OK"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
