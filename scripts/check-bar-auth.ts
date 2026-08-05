import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PIN_TTL_MS,
  generateFourDigitCode,
  normalizeCzechPhone,
  smsText,
  isInternalAuthEmail,
} from "../src/lib/phone-auth";
import { sendSms } from "../src/lib/phone-auth-server";

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
assert.match(onboarding, /Mrkni se do Tvého inboxu i do spamu/);
assert.match(emailServer, /aktivuj svůj účet <a href="\$\{activationUrl\}">zde<\/a>/);
assert.doesNotMatch(emailServer, /last_activation_email_at:\s*null/);
assert.match(onboarding, /data\.throttled/);

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
