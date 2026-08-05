import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

async function main() {
const catalogPath = fileURLToPath(new URL("../src/lib/catalog-wild-coco.ts", import.meta.url));
assert.ok(existsSync(catalogPath), "Chybí implementace katalogu WILD&COCO");

const { WILD_COCO_CATALOG } = await import("../src/lib/catalog-wild-coco");

assert.ok(
  WILD_COCO_CATALOG.length >= 20 && WILD_COCO_CATALOG.length <= 25,
  `Očekávám 20–25 kurátorovaných karet, nalezeno ${WILD_COCO_CATALOG.length}`,
);
assert.equal(
  new Set(WILD_COCO_CATALOG.map((item) => item.id)).size,
  WILD_COCO_CATALOG.length,
  "ID katalogu musí být unikátní",
);

const snapshotPath = "/tmp/wc-eshop.html";
assert.ok(existsSync(snapshotPath), `Chybí oficiální snapshot ${snapshotPath}`);
const snapshot = readFileSync(snapshotPath, "utf8").replaceAll("\\/", "/").replaceAll("\\.", ".");

for (const item of WILD_COCO_CATALOG) {
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${item.id}: ID není stabilní kebab-case`);
  assert.ok(item.name.trim().length >= 4, `${item.id}: chybí název`);
  assert.ok(item.description.trim().length >= 65, `${item.id}: popis je příliš krátký`);
  assert.match(
    `${item.name} ${item.description} ${item.usps.join(" ")}`,
    /[áčďéěíňóřšťúůýž]/i,
    `${item.id}: copy nepůsobí jako plnohodnotná čeština`,
  );
  assert.ok(item.usps.length >= 2 && item.usps.length <= 4, `${item.id}: očekávám 2–4 USP`);
  assert.ok(item.usps.every((usp) => usp.trim().length >= 8), `${item.id}: USP je prázdné nebo příliš krátké`);

  assert.match(
    item.officialUrl,
    /^https:\/\/www\.wildandcoco\.com\/[a-z0-9][a-z0-9-]*$/,
    `${item.id}: neplatný oficiální odkaz`,
  );
  assert.match(
    item.imageUrl,
    /^https:\/\/www\.wildandcoco\.com\/temp\/img\/.+\.(?:jpg|jpeg|png)$/,
    `${item.id}: neplatný oficiální obrázek`,
  );

  const officialPath = new URL(item.officialUrl).pathname;
  const imagePath = new URL(item.imageUrl).pathname;
  assert.ok(snapshot.includes(`href="${officialPath}"`), `${item.id}: produktový odkaz není ve snapshotu`);
  assert.ok(snapshot.includes(imagePath), `${item.id}: obrázek není ve snapshotu`);
}

const requiredIds = [
  "cocofir",
  "protein-cocofir",
  "cocofir-shots",
  "biotic-cocoguard",
  "cocoguard-premium",
  "raw-kokosove-vody",
  "essential-dynamic",
  "essential-protein",
  "symbiotics-superhuman",
  "histabiotics",
  "jahodova-granola",
  "kakaova-granola",
  "wild-cacao-ceremony",
  "kokosove-pomazanky",
  "makadamiova-pomazanka",
  "fermentovana-zelenina",
  "tempehy",
  "rostlinna-proteinova-jidla",
  "proteinove-pecivo",
  "chi-pesto-coco-mayo",
  "kokosova-spiz",
] as const;

const ids = new Set(WILD_COCO_CATALOG.map((item) => item.id));
for (const id of requiredIds) assert.ok(ids.has(id), `Chybí povinná produktová rodina: ${id}`);

const requiredCategories = [
  "Fermentovaný kokos",
  "Nápoje",
  "Wellbeing",
  "Granoly & kakao",
  "Pomazánky",
  "Slané jídlo",
  "Kokosová spíž",
] as const;
const categories = new Set(WILD_COCO_CATALOG.map((item) => item.category));
for (const category of requiredCategories) assert.ok(categories.has(category), `Chybí kategorie: ${category}`);

const allCopy = WILD_COCO_CATALOG
  .flatMap((item) => [item.name, item.description, ...item.usps])
  .join(" ")
  .toLowerCase();
for (const risky of [
  "léčí",
  "vyléčí",
  "uzdravuje",
  "detox",
  "podporuje imunitu",
  "podporuje mikrobiom",
  "zdravá střeva",
  "terapeutický",
  "prevence nemoci",
]) {
  assert.ok(!allCopy.includes(risky), `Rizikové zdravotní tvrzení v katalogu: ${risky}`);
}
assert.doesNotMatch(allCopy, /\b(?:kč|eur|euro|€)\b/i, "Ve veřejném katalogu nesmí být ceny");

console.log(`WILD&COCO catalog checks: ${WILD_COCO_CATALOG.length}/${WILD_COCO_CATALOG.length} OK`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
