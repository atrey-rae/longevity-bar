import assert from "node:assert/strict";

import { LONGEVITY_BAR_CATALOG } from "../src/lib/catalog-longevity";

assert.equal(LONGEVITY_BAR_CATALOG.length, 34);
assert.equal(new Set(LONGEVITY_BAR_CATALOG.map((item) => item.id)).size, LONGEVITY_BAR_CATALOG.length);

for (const item of LONGEVITY_BAR_CATALOG) {
  assert.ok(item.name.trim().length >= 3, `${item.id}: chybí název`);
  assert.ok(item.description.trim().length >= 45, `${item.id}: příliš krátký popis`);
  assert.ok(item.usps.length >= 2 && item.usps.length <= 4, `${item.id}: očekávám 2–4 USP`);
  assert.ok(item.usps.every((usp) => usp.trim().length >= 5), `${item.id}: prázdné USP`);
}

const allCopy = LONGEVITY_BAR_CATALOG.flatMap((item) => [item.description, ...item.usps]).join(" ").toLowerCase();
for (const risky of [
  "podporuje imunitu",
  "podporuje mikrobiom",
  "pro zdravá střeva",
  "uklidňuje",
  "detox",
  "léčí",
]) {
  assert.ok(!allCopy.includes(risky), `Rizikové tvrzení v katalogu: ${risky}`);
}

assert.equal(LONGEVITY_BAR_CATALOG.find((item) => item.id === "kombucha")?.format, "300 ml");
assert.equal(LONGEVITY_BAR_CATALOG.find((item) => item.id === "kokos-voda")?.format, "473 ml");
assert.equal(LONGEVITY_BAR_CATALOG.find((item) => item.id === "bowl-strawberry")?.format, "350 g");
assert.equal(LONGEVITY_BAR_CATALOG.find((item) => item.id === "pop-strawberry")?.format, "40 g");
assert.ok(LONGEVITY_BAR_CATALOG.some((item) => item.id === "retail-protein-30"));

console.log(`longevity catalog checks: ${LONGEVITY_BAR_CATALOG.length}/${LONGEVITY_BAR_CATALOG.length} OK`);
