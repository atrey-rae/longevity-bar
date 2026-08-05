/**
 * Hlídá iCloud duplikáty typu „page 2.tsx" v src/ a scripts/ — soubor s mezerou
 * v názvu není nikdy route ani modul, ale tsc a check skripty ho čtou, takže
 * zastaralá kopie umí rozbít build nebo tiše lhát v kontrolách.
 * Spuštění: npx tsx scripts/check-no-icloud-duplicates.ts
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KORENY = ["src", "scripts", "supabase"];
const spatne: string[] = [];

function projdi(cesta: string): void {
  for (const nazev of readdirSync(cesta)) {
    const plna = join(cesta, nazev);
    if (statSync(plna).isDirectory()) {
      projdi(plna);
      continue;
    }
    if (/ \d+\.[a-z]+$/i.test(nazev)) spatne.push(plna);
  }
}

for (const koren of KORENY) projdi(koren);

if (spatne.length > 0) {
  console.error(`✗ iCloud duplikáty (soubor s mezerou v názvu) — smaž je:`);
  for (const s of spatne) console.error(`  · ${s}`);
  process.exit(1);
}
console.log("✓ check-no-icloud-duplicates: žádné duplikáty s mezerou v názvu");
