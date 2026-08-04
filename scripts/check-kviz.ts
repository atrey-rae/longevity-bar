/**
 * Kontrola doporučovací logiky kvízu.
 *
 * Projde všechny kombinace odpovědí (aktuálně 4 × 4 × 5 = 80) a ověří, že
 * výsledek je použitelný na obrazovce i v kupónu:
 *   1. 6–8 produktů,
 *   2. každý slug existuje v katalogu,
 *   3. žádné duplicity,
 *   4. aspoň 2 produkty z gut pilíře dané odpovědi na otázku 2 — zdravotní
 *      část kvízu se musí propsat do výsledku vždy, ne jen když zbude místo.
 *
 * Spuštění: `npx tsx scripts/check-kviz.ts`
 */
import {
  GUT_PILIR,
  OTAZKA_1,
  OTAZKA_2,
  OTAZKA_3,
  PRODUKTY,
  doporucitProdukty,
} from "../src/lib/kviz";

const MIN = 6;
const MAX = 8;
const MIN_Z_GUT = 2;

const SLUGY_V_KATALOGU = new Set(PRODUKTY.map((p) => p.slug));

const chyby: string[] = [];
let kombinaci = 0;

for (const q1 of OTAZKA_1) {
  for (const q2 of OTAZKA_2) {
    for (const q3 of OTAZKA_3) {
      kombinaci += 1;
      const kde = `${q1.hodnota} / ${q2.hodnota} / ${q3.hodnota}`;
      const vysledek = doporucitProdukty(q1.hodnota, q2.hodnota, q3.hodnota);
      const slugy = vysledek.map((p) => p.slug);

      if (slugy.length < MIN || slugy.length > MAX) {
        chyby.push(`${kde}: ${slugy.length} produktů, čekáme ${MIN}–${MAX}`);
      }

      const mimoKatalog = slugy.filter((s) => !SLUGY_V_KATALOGU.has(s));
      if (mimoKatalog.length > 0) {
        chyby.push(`${kde}: slug mimo katalog — ${mimoKatalog.join(", ")}`);
      }

      if (new Set(slugy).size !== slugy.length) {
        chyby.push(`${kde}: duplicity — ${slugy.join(", ")}`);
      }

      const gut = GUT_PILIR[q2.hodnota];
      const zGut = slugy.filter((s) => gut.includes(s)).length;
      if (zGut < MIN_Z_GUT) {
        chyby.push(
          `${kde}: jen ${zGut} z gut pilíře (čekáme ≥${MIN_Z_GUT}) — ${slugy.join(", ")}`,
        );
      }
    }
  }
}

if (chyby.length > 0) {
  console.error(`✗ check-kviz: ${chyby.length} chyb z ${kombinaci} kombinací`);
  for (const c of chyby) console.error(`  · ${c}`);
  process.exit(1);
}

console.log(
  `✓ check-kviz: ${kombinaci}/${kombinaci} kombinací OK ` +
    `(${MIN}–${MAX} produktů, unikátní, z katalogu, ≥${MIN_Z_GUT} z gut pilíře)`,
);
