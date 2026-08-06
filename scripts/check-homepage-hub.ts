import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LONGEVITY_BAR_CATALOG } from "../src/lib/catalog-longevity";
import { WILD_COCO_CATALOG } from "../src/lib/catalog-wild-coco";
import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const homepage = read("src/app/page.tsx");
const rewards = read("src/app/odmeny/page.tsx");
const catalog = read("src/app/sortiment/longevity/page.tsx");
const wildCocoCatalogPage = read("src/app/sortiment/wild-coco/page.tsx");
const scan = read("src/app/scan/[token]/page.tsx");
const activation = read("src/app/aktivovat-email/route.ts");

for (const href of [
  "/odmeny",
  "/kviz/web",
  "/sortiment/longevity",
  "/sortiment/wild-coco",
]) {
  const escaped = href.replaceAll("/", "\\/");
  assert.match(homepage, new RegExp(`(?:href=[{\"']+|href:\\s*[\"'])${escaped}`));
}

assert.match(homepage, /getSessionUser/);
assert.match(homepage, /getEmailStatus/);
// Výzva k potvrzení e-mailu žije od 6. 8. 2026 ve slovníku — hlídá se české
// znění i to, že ho rozcestník opravdu vykresluje.
assert.equal(cs.rozcestnik.potvrdEmail, "Potvrď e-mail");
assert.ok(en.rozcestnik.potvrdEmail.trim().length > 0, "chybí anglická výzva");
assert.match(homepage, /t\.rozcestnik\.potvrdEmail/);
assert.doesNotMatch(homepage, /ensureProfile\(/);

assert.match(rewards, /ensureProfile\(/);
assert.match(rewards, /EmailOnboarding/);
assert.match(rewards, /QrKamera/);
assert.match(rewards, /InstallPrompt/);
assert.match(rewards, /redirect\([^\n]*prihlaseni[^\n]*next[^\n]*odmeny/);

assert.match(catalog, /LONGEVITY_BAR_CATALOG/);
assert.match(catalog, /loading="lazy"/);
assert.match(catalog, /item\.usps/);
assert.match(catalog, /item\.format/);
// 43 od korekcí 6. 8. 2026 (rozpad příchutí, Modrý lotos ven) — přesný počet
// hlídá `check-longevity-catalog.ts`, tady jde o to, že katalog vůbec něco má.
assert.equal(LONGEVITY_BAR_CATALOG.length, 43, "Longevity katalog musí zobrazit všech 43 položek");
assert.equal(
  new Set(LONGEVITY_BAR_CATALOG.map((item) => item.id)).size,
  LONGEVITY_BAR_CATALOG.length,
  "Položky katalogu musí mít unikátní id",
);
for (const item of LONGEVITY_BAR_CATALOG) {
  assert.ok(item.description.trim(), `${item.id}: chybí popis`);
  assert.ok(item.usps.length >= 2 && item.usps.length <= 4, `${item.id}: očekávám 2–4 USP`);
}

assert.match(wildCocoCatalogPage, /WILD_COCO_CATALOG/);
assert.match(wildCocoCatalogPage, /item\.officialUrl/);
assert.match(wildCocoCatalogPage, /target="_blank"/);
assert.match(wildCocoCatalogPage, /rel="noopener noreferrer"/);
assert.match(wildCocoCatalogPage, /loading="lazy"/);
assert.match(wildCocoCatalogPage, /item\.usps/);
assert.equal(WILD_COCO_CATALOG.length, 22, "WILD&COCO katalog musí zobrazit všech 22 položek");
assert.equal(
  new Set(WILD_COCO_CATALOG.map((item) => item.id)).size,
  WILD_COCO_CATALOG.length,
  "WILD&COCO položky musí mít unikátní id",
);
for (const item of WILD_COCO_CATALOG) {
  assert.ok(item.description.trim(), `${item.id}: chybí popis`);
  assert.ok(item.usps.length >= 2 && item.usps.length <= 4, `${item.id}: očekávám 2–4 USP`);
  assert.match(item.officialUrl, /^https:\/\/www\.wildandcoco\.com\//, `${item.id}: neoficiální odkaz`);
  assert.match(item.imageUrl, /^https:\/\/www\.wildandcoco\.com\//, `${item.id}: neoficiální fotografie`);
}

assert.match(scan, /redirect\(`\/odmeny\?\$\{qs\.toString\(\)\}`\)/);
assert.match(activation, /\/odmeny\?email=/);

console.log("homepage hub contract: OK");
