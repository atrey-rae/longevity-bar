import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  BAVICI,
  PUBLIC_WEB_QUIZ_HOST,
  najitBavice,
} from "../src/lib/kviz";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(`${root}/src/app/kviz/[bavic]/page.tsx`, "utf8");
const actions = readFileSync(`${root}/src/app/kviz/actions.ts`, "utf8");

assert.equal(BAVICI.length, 6, "healing dashboard must keep exactly six entertainers");
assert.deepEqual(PUBLIC_WEB_QUIZ_HOST, {
  slug: "web",
  kod: "WEB",
  jmeno: "Longevity Bar",
});
assert.equal(najitBavice(" web ")?.kod, "WEB");
assert.equal(
  BAVICI.some((host) => host.slug === "web"),
  false,
  "public web host must not become a seventh entertainer",
);
assert.equal(
  BAVICI.find((host) => host.kod === "D4")?.jmeno,
  "Atrey",
  "D4 identity must stay untouched",
);

assert.match(page, /PUBLIC_WEB_QUIZ_HOST/);
assert.match(
  page,
  /\[\.\.\.BAVICI, PUBLIC_WEB_QUIZ_HOST\]\.map/,
  "static params must include the public web route",
);
assert.match(
  page,
  /bavic\.kod === PUBLIC_WEB_QUIZ_HOST\.kod[\s\S]*?Promise\.resolve\("microbiom" as const\)/,
  "WEB must keep microbiom as the recommended quiz",
);
assert.match(
  page,
  /getHostQuizVariant\(bavic\.kod\)/,
  "configured hosts (including D4) must retain DB-driven recommendation",
);
assert.match(page, /QuizVariantSelector/, "customers must choose either quiz variant");

assert.match(actions, /PUBLIC_WEB_QUIZ_HOST/);
assert.match(
  actions,
  /duvodFallbacku\s*&&\s*bavic\.kod\s*===\s*PUBLIC_WEB_QUIZ_HOST\.kod/,
  "WEB care-api failure must be handled explicitly",
);
assert.match(
  actions,
  /Osobní kupón se nepodařilo vytvořit/,
  "WEB failure must return a clear user-facing error",
);
const webFailureGuard = actions.indexOf(
  "duvodFallbacku && bavic.kod === PUBLIC_WEB_QUIZ_HOST.kod",
);
const databaseSection = actions.indexOf("/* --- Zápis leadu");
assert.ok(
  webFailureGuard >= 0 && webFailureGuard < databaseSection,
  "WEB failure must return before the lead is inserted",
);

console.log("✓ public WEB quiz checks OK");
