import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

const migration = read("supabase/migrations/006_quiz_access_policy.sql");
const page = read("src/app/kviz/[bavic]/page.tsx");
const selector = read("src/components/QuizVariantSelector.tsx");
const action = read("src/app/kviz/actions.ts");
const route = read("src/app/api/internal/healing-dashboard/quiz-policy/route.ts");
const helper = read("src/lib/quiz-access.ts");

assert.match(migration, /quiz_login_required boolean not null default true/i);
assert.match(migration, /unique index[\s\S]*user_id, quiz_variant/i);
assert.match(migration, /unique index[\s\S]*contact_hash, quiz_variant/i);
assert.match(migration, /num_nonnulls\(user_id, contact_hash\)\s*=\s*1/i);
assert.match(migration, /user_id = auth\.uid\(\)/i);
assert.match(migration, /create trigger quiz_settings_touch_updated_at/i);
assert.match(migration, /revoke all on public\.quiz_completions from public, anon, authenticated/i);
assert.doesNotMatch(migration, /\b(answer|score|odpoved|skore)\w*\s+(text|jsonb|integer|numeric)\b/i);

assert.match(page, /getQuizPolicy/);
assert.match(page, /policy\.loginRequired && !user/);
assert.match(page, /\/prihlaseni\?next=/);
assert.match(page, /QuizVariantSelector/);

// Popisky rozcestníku variant jsou od 6. 8. 2026 ve slovníku. Kontrolují se
// česká znění (aby zůstala stejná) i to, že je komponenta bere odtamtud —
// a že anglické mutace existují a nesou stejná čísla otázek.
assert.match(cs.kviz.variantaMikrobiom, /Mikrobiom/);
assert.match(cs.kviz.variantaMikrobiomPopis, /3 otázky/);
assert.match(cs.kviz.variantaProfilPopis, /9 otázek/);
assert.match(cs.kviz.hotovo, /Hotovo ✓/);
assert.match(en.kviz.variantaMikrobiomPopis, /3 questions/);
assert.match(en.kviz.variantaProfilPopis, /9 questions/);
assert.ok(en.kviz.hotovo.trim().length > 0, "chybí anglický štítek hotovo");
for (const klic of [
  "t.kviz.variantaMikrobiom",
  "t.kviz.variantaMikrobiomPopis",
  "t.kviz.variantaProfil",
  "t.kviz.variantaProfilPopis",
  "t.kviz.hotovo",
]) {
  assert.ok(selector.includes(klic), `selectoru chybí ${klic}`);
}

assert.match(action, /claimQuizCompletion/);
assert.match(action, /finishQuizCompletion/);
assert.match(action, /policy\.loginRequired && !user/);
assert.match(helper, /status:\s*"pending"/);
assert.match(helper, /error\?\.code === "23505"/);
assert.doesNotMatch(helper, /updated_at:\s*updatedAt/);

const rateLimit = action.indexOf("/* --- Rate-limit");
const claim = action.indexOf("await claimQuizCompletion");
const coupon = action.indexOf("const osobni = await vytvoritOsobniKupon");
assert.ok(rateLimit >= 0 && rateLimit < claim && claim < coupon,
  "rate-limit musí proběhnout před rezervací a vytvořením kupónu");

assert.match(route, /isAuthorizedHealingBridge/);
assert.match(route, /export async function GET/);
assert.match(route, /export async function PUT/);
assert.match(route, /typeof input\.quizLoginRequired !== "boolean"/);
assert.match(route, /quizLoginRequired:\s*policy\.loginRequired/);
assert.doesNotMatch(route, /json\(\{\s*(?:ok:\s*true,\s*)?policy:/);

// Při integrační práci leží oba repozitáře vedle sebe; kontrola skutečných
// serializerů tak zachytí rozjezd názvu pole, který izolované testy minuly.
const healingBridgePath = `${root}/../healing-festival-bar/src/healing-bridge.mjs`;
if (existsSync(healingBridgePath)) {
  const healingBridge = readFileSync(healingBridgePath, "utf8");
  assert.match(healingBridge, /JSON\.stringify\(\{\s*quizLoginRequired,\s*actor\s*\}\)/);
  assert.match(healingBridge, /body\.quizLoginRequired/);
}

console.log("✓ quiz access policy checks OK");
