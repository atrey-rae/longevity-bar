/**
 * Kontrola hostů kvízu — bavičů i sdílených vstupů bez předgenerovaných kupónů.
 *
 * Hlídá tři věci, na kterých stojí platnost kupónu na festivalu:
 *   1. složení hostů (9 bavičů A1–I9 + `WEB` + `TYM`, sdílené vstupy nesmí
 *      propadnout do `BAVICI`, kde by se staly bavičem v healing dashboardu),
 *   2. že každý host má vlastní adresu `/kviz/<slug>` (statické parametry),
 *   3. že hostům BEZ předgenerovaných sdílených kupónů (G7, H8, I9, WEB, TYM)
 *      se při selhání care-api vrátí chyba, a ne neplatný odvozený kód —
 *      a to ještě před zápisem leadu.
 *
 * Spuštění: `npx tsx scripts/check-public-web-quiz.ts`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";
import {
  BAVICI,
  KODY_BEZ_SDILENYCH_KUPONU,
  PUBLIC_WEB_QUIZ_HOST,
  TEAM_QUIZ_HOST,
  VIP_QUIZ_HOST,
  VSICHNI_HOSTE,
  kodKuponu,
  najitBavice,
} from "../src/lib/kviz";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(`${root}/src/app/kviz/[bavic]/page.tsx`, "utf8");
const actions = readFileSync(`${root}/src/app/kviz/actions.ts`, "utf8");
const migrace = readFileSync(
  `${root}/supabase/migrations/007_quiz_hosts_team.sql`,
  "utf8",
);

/* --- Složení hostů ---------------------------------------------------------- */
assert.equal(BAVICI.length, 9, "healing dashboard must keep exactly nine entertainers");
assert.deepEqual(
  BAVICI.map((host) => [host.kod, host.jmeno]),
  [
    ["A1", "Ivona"],
    ["B2", "Denisa"],
    ["C3", "Amae"],
    ["D4", "Atrey"],
    ["E5", "Kateřina"],
    ["F6", "Leonardo"],
    ["G7", "Zuzanna"],
    ["H8", "Filip"],
    ["I9", "Veronika"],
  ],
  "entertainer roster and order must stay explicit",
);
assert.deepEqual(PUBLIC_WEB_QUIZ_HOST, {
  slug: "web",
  kod: "WEB",
  jmeno: "Longevity Bar",
});
assert.deepEqual(TEAM_QUIZ_HOST, {
  slug: "tym",
  kod: "TYM",
  jmeno: "Longevity tým",
});
assert.deepEqual(VIP_QUIZ_HOST, {
  slug: "vit",
  kod: "VIT",
  jmeno: "Vít",
});
assert.deepEqual(
  VSICHNI_HOSTE,
  [...BAVICI, PUBLIC_WEB_QUIZ_HOST, TEAM_QUIZ_HOST, VIP_QUIZ_HOST],
  "VSICHNI_HOSTE must cover every entertainer plus every standalone entry",
);

for (const samostatny of [PUBLIC_WEB_QUIZ_HOST, TEAM_QUIZ_HOST, VIP_QUIZ_HOST]) {
  assert.equal(
    BAVICI.some((host) => host.slug === samostatny.slug || host.kod === samostatny.kod),
    false,
    `standalone entry ${samostatny.kod} must not become an extra entertainer`,
  );
}

assert.equal(
  new Set(VSICHNI_HOSTE.map((host) => host.slug)).size,
  VSICHNI_HOSTE.length,
  "host slugs must be unique — they are the /kviz/<slug> routes",
);
assert.equal(
  new Set(VSICHNI_HOSTE.map((host) => host.kod)).size,
  VSICHNI_HOSTE.length,
  "host codes must be unique — they key quiz_leads.bavic and quiz_hosts.code",
);
for (const host of VSICHNI_HOSTE) {
  assert.equal(host.slug, host.kod.toLowerCase(), `${host.kod}: slug must mirror the code`);
}

assert.equal(najitBavice(" web ")?.kod, "WEB");
assert.equal(najitBavice(" TYM ")?.kod, "TYM");
assert.equal(najitBavice("Vit")?.kod, "VIT");
assert.equal(najitBavice("G7")?.jmeno, "Zuzanna");
assert.equal(najitBavice("z9"), undefined, "unknown slug must stay unknown");
assert.equal(
  BAVICI.find((host) => host.kod === "D4")?.jmeno,
  "Atrey",
  "D4 identity must stay untouched",
);

/* --- Kdo smí spadnout na sdílený kupón -------------------------------------- */
assert.deepEqual(
  [...KODY_BEZ_SDILENYCH_KUPONU].sort(),
  ["G7", "H8", "I9", "TYM", "VIT", "WEB"],
  "only the six original entertainers have pre-generated shared coupons",
);
for (const host of VSICHNI_HOSTE) {
  assert.equal(
    host.maSdileneKupony === true,
    !KODY_BEZ_SDILENYCH_KUPONU.has(host.kod),
    `${host.kod}: flag and derived set must agree`,
  );
}
for (const kod of ["A1", "B2", "C3", "D4", "E5", "F6"]) {
  assert.equal(
    BAVICI.find((host) => host.kod === kod)?.maSdileneKupony,
    true,
    `${kod}: proven fallback to the shared coupon must stay`,
  );
}

/* --- Kód kupónu ------------------------------------------------------------- */
// Sdílený kód se skládá i hostům bez předgenerovaných kupónů — je základem
// osobního kódu `HEAL21-<KOD>-<SLUG>-<suffix>` zakládaného přes care-api.
for (const host of VSICHNI_HOSTE) {
  const zaklad = kodKuponu(host.slug, "NTR250");
  assert.equal(zaklad, `HEAL21-${host.kod}-NTR250`, `${host.kod}: shared code shape`);
  assert.match(
    `${zaklad}-QK7M`,
    /^HEAL21-[A-Z0-9]{2,3}-NTR250-[A-HJ-NP-TV-Z2-9]{4}$/,
    `${host.kod}: personal code shape`,
  );
}
assert.equal(kodKuponu("tym", "NENI"), null, "unknown product must fail closed");
assert.equal(kodKuponu("z9", "NTR250"), null, "unknown host must fail closed");
assert.match(
  actions,
  /const kod = `\$\{sdilenyKod\}-\$\{suffix\}`/,
  "personal coupon code must be derived from the shared code plus a suffix",
);

/* --- Stránka kvízu ---------------------------------------------------------- */
assert.match(page, /PUBLIC_WEB_QUIZ_HOST/);
assert.match(
  page,
  /return VSICHNI_HOSTE\.map/,
  "static params must cover every host, including TYM and the new entertainers",
);
assert.match(
  page,
  /bavic\.kod === PUBLIC_WEB_QUIZ_HOST\.kod[\s\S]*?Promise\.resolve\("microbiom" as const\)/,
  "WEB must keep microbiom as the recommended quiz",
);
assert.match(
  page,
  /getHostQuizVariant\(bavic\.kod\)/,
  "configured hosts (including D4 and TYM) must retain DB-driven recommendation",
);
assert.match(page, /QuizVariantSelector/, "customers must choose either quiz variant");

/* --- Guard proti neplatnému sdílenému kódu ---------------------------------- */
assert.match(
  actions,
  /duvodFallbacku\s*&&\s*!bavic\.maSdileneKupony/,
  "care-api failure must be handled for every host without shared coupons",
);
assert.doesNotMatch(
  actions,
  /bavic\.kod === PUBLIC_WEB_QUIZ_HOST\.kod/,
  "the guard must not regress to a WEB-only check",
);
// Hláška je od 6. 8. 2026 ve slovníku (dvojjazyčnost) — kontroluje se české
// znění i to, že ji server action pro tenhle případ opravdu vrací.
assert.match(
  cs.chyby.osobniKuponSelhal,
  /^Osobní kupón se nepodařilo vytvořit/,
  "the Czech wording of that error must stay",
);
assert.ok(
  en.chyby.osobniKuponSelhal.trim().length > 0,
  "the error must exist in English too",
);
assert.match(
  actions,
  /return chyba\(t\.chyby\.osobniKuponSelhal\);/,
  "such a failure must return a clear user-facing error",
);
const failureGuard = actions.indexOf("duvodFallbacku && !bavic.maSdileneKupony");
const databaseSection = actions.indexOf("/* --- Zápis leadu");
assert.ok(
  failureGuard >= 0 && failureGuard < databaseSection,
  "the failure must return before the lead is inserted",
);

/* --- Migrace 007 ------------------------------------------------------------ */
for (const kod of ["G7", "H8", "I9", "TYM", "VIT"]) {
  assert.match(
    migrace,
    new RegExp(`\\('${kod}', 'microbiom'\\)`),
    `migration 007 must seed ${kod} with the default variant`,
  );
}
assert.match(migrace, /on conflict \(code\) do nothing/, "migration 007 must stay idempotent");
assert.doesNotMatch(
  migrace,
  /\('WEB',/,
  "WEB has no quiz_hosts row — the public hub is hardcoded to microbiom",
);
assert.doesNotMatch(
  migrace,
  /update public\.quiz_hosts/,
  "migration 007 must not overwrite a variant chosen in healing.app",
);

console.log(
  `✓ quiz host checks OK (${BAVICI.length} bavičů, ` +
    `${KODY_BEZ_SDILENYCH_KUPONU.size} kódů bez sdílených kupónů, migrace 007)`,
);
