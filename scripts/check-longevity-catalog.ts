import assert from "node:assert/strict";

import { LONGEVITY_BAR_CATALOG } from "../src/lib/catalog-longevity";
import { en } from "../src/lib/i18n/en";

// 34 → 43 (Atrey 6. 8.): Modrý lotos vyřazen (−1), kokosová voda rozdělená na
// Wild/Thai (+1), Cocofir na 6 příchutí (+5) a Cocofir Shot na 5 příchutí (+4).
assert.equal(LONGEVITY_BAR_CATALOG.length, 43);
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

/* --- Anglická mutace katalogu (zadání 6. 8. 2026) -------------------------- */
// Popis a USP se překládají, název produktu ne. Anglická kopie musí projít
// stejným sítem jako česká — jen s anglickými formulacemi tvrzení.
const enItems = en.sortiment.longevity.polozky;
assert.equal(
  Object.keys(enItems).length,
  LONGEVITY_BAR_CATALOG.length,
  "anglický katalog musí pokrýt všechny položky",
);
for (const item of LONGEVITY_BAR_CATALOG) {
  const preklad = enItems[item.id];
  assert.ok(preklad, `${item.id}: chybí anglická verze`);
  assert.ok(preklad.description.trim().length >= 45, `${item.id}: příliš krátký anglický popis`);
  assert.equal(
    preklad.usps.length,
    item.usps.length,
    `${item.id}: počet anglických USP musí sedět s českým`,
  );
  assert.ok(
    preklad.usps.every((usp) => usp.trim().length >= 5),
    `${item.id}: prázdné anglické USP`,
  );
}

const enCopy = Object.values(enItems)
  .flatMap((item) => [item.description, ...item.usps])
  .join(" ")
  .toLowerCase();
for (const risky of [
  "supports immunity",
  "supports the microbiome",
  "for a healthy gut",
  "soothes",
  "detox",
  // Kmeny zakázaných slov — `heal` chytí i „healthy“ a „healing“.
  "cure",
  "heal",
  "disease",
  "diagnos",
  "allerg",
  "intoleran",
  "probiotic",
]) {
  assert.ok(!enCopy.includes(risky), `Rizikové tvrzení v anglickém katalogu: ${risky}`);
}

const najit = (id: string) => LONGEVITY_BAR_CATALOG.find((item) => item.id === id);

assert.equal(najit("kombucha")?.format, "300 ml");
assert.equal(najit("kokos-voda-wild")?.format, "473 ml");
assert.equal(najit("kokos-voda-thai")?.format, "473 ml");
assert.equal(najit("bowl-strawberry")?.format, "350 g");
assert.equal(najit("pop-strawberry")?.format, "40 g");
assert.ok(najit("retail-protein-30"));

/* --- Korekce Atreye 6. 8. 2026 --------------------------------------------- */

// Matcha jede na 3 g. Šestka byla chyba proti pokladně i listu surovin, takže
// se hlídá jak správná hodnota, tak to, že se nikde v katalogu nevrátí ta stará.
assert.equal(najit("matcha")?.format, "3 g matchy");
assert.equal(en.sortiment.longevity.polozky.matcha.format, "3 g matcha");
for (const [jazyk, texty] of [
  ["cs", LONGEVITY_BAR_CATALOG.flatMap((item) => [item.description, ...item.usps, item.format ?? ""])],
  [
    "en",
    Object.values(en.sortiment.longevity.polozky).flatMap((item) => [
      item.description,
      ...item.usps,
      item.format ?? "",
    ]),
  ],
] as const) {
  assert.ok(
    !texty.some((text) => /\b6\s*g\b/i.test(text) && /match/i.test(text)),
    `${jazyk}: gramáž matchy je 3 g, nikde nesmí zůstat 6 g`,
  );
}

// Matcha Latté NENÍ vždy na ledu, Matcha Mango Latté vždy ANO.
assert.ok(
  najit("matcha")?.usps.includes("Lze podávat na ledu"),
  "Matcha Latté nesmí slibovat led vždy",
);
assert.ok(
  !najit("matcha")?.usps.some((usp) => /vždy/i.test(usp)),
  "u Matcha Latté nesmí zůstat „vždy na ledu“",
);
assert.ok(
  najit("matcha-mango")?.usps.includes("Podáváme na ledu"),
  "Matcha Mango Latté se podává vždy na ledu",
);
assert.ok(en.sortiment.longevity.polozky.matcha.usps.includes("Can be served on ice"));
assert.ok(
  en.sortiment.longevity.polozky["matcha-mango"].usps.includes("Always served on ice"),
);

// Longevito Mocktail: mango pyré místo nealko ginu.
for (const [jazyk, polozka] of [
  ["cs", { description: najit("mocktail")!.description, usps: najit("mocktail")!.usps }],
  ["en", en.sortiment.longevity.polozky.mocktail],
] as const) {
  const text = [polozka.description, ...polozka.usps].join(" ").toLowerCase();
  assert.ok(!text.includes("gin"), `${jazyk}: mocktail už neobsahuje gin`);
  assert.ok(/mango/.test(text), `${jazyk}: mocktail musí zmiňovat mango pyré`);
}

// Wild Ceremony Cacao: 25 g ceremoniálního kakaa + fotka hrnku.
assert.ok(najit("ceremony")?.usps.includes("25 g ceremoniálního kakaa"));
assert.ok(
  en.sortiment.longevity.polozky.ceremony.usps.includes("25 g of ceremonial cacao"),
);
assert.equal(najit("ceremony")?.imageUrl, "/longevity/wild-ceremony-cacao.jpg");

// Kombucha se jmenuje Lavender (názvy se nepřekládají, platí v obou jazycích).
assert.equal(najit("kombucha")?.name, "Kombucha Lavender");

// Modrý lotos se u stánku neprodává — nesmí být v katalogu ani v překladu.
assert.ok(!najit("blue-lotus"), "Modrý lotos musí být vyřazený");
assert.ok(
  !LONGEVITY_BAR_CATALOG.some((item) => /lotos|lotus/i.test(item.name)),
  "Modrý lotos nesmí zůstat pod jiným id",
);
assert.ok(!("blue-lotus" in en.sortiment.longevity.polozky));

// Příchutě přebírá katalog z pokladny: Cocofir 6, Cocofir Shot 5, vody 2.
// Kdyby se počet rozešel, host by u stánku viděl jiné menu než obsluha.
const podlePrefixu = (prefix: string) =>
  LONGEVITY_BAR_CATALOG.filter((item) => item.id.startsWith(prefix));
assert.equal(podlePrefixu("cocofir-shot-").length, 5, "Cocofir Shot má 5 příchutí");
assert.equal(
  podlePrefixu("cocofir-").filter((item) => !item.id.startsWith("cocofir-shot-")).length,
  6,
  "Cocofir 250 ml má 6 příchutí",
);
assert.equal(podlePrefixu("kokos-voda-").length, 2, "kokosová voda má Wild a Thai variantu");
for (const item of [...podlePrefixu("cocofir-"), ...podlePrefixu("kokos-voda-")]) {
  assert.ok(item.imageUrl, `${item.id}: příchuť musí zdědit fotku produktové řady`);
}

console.log(`longevity catalog checks: ${LONGEVITY_BAR_CATALOG.length}/${LONGEVITY_BAR_CATALOG.length} OK`);
