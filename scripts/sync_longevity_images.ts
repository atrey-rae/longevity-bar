/**
 * Drop-mechanismus pro fotky Longevity katalogu.
 *
 * Atrey (nebo kdokoli z týmu) vloží soubor do:
 *   _data/longevity-bar/obrazky-drop/
 * pojmenovaný přesně jako položka v menu, např. `Matcha Latté.jpg`
 * (viz README.md v té složce), a spustí:
 *   npx tsx scripts/sync_longevity_images.ts
 *
 * Skript:
 *  1. projde drop složku,
 *  2. normalizuje název souboru (diakritika pryč, mezery → pomlčky, lowercase),
 *  3. zkopíruje soubor do `public/longevity/<normalizovaný-název>.<přípona>`,
 *  4. napáruje soubor na položku katalogu podle názvu (case/diakritika-insensitive
 *     přesná shoda `item.name`),
 *  5. vypíše, co se napárovalo a co ne,
 *  6. vypíše hotové řádky `imageUrl: "/longevity/…"` k ručnímu vložení do
 *     `src/lib/catalog-longevity.ts` — CATALOG SOUBOR SE NIKDY NEPŘEPISUJE AUTOMATICKY.
 */
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LONGEVITY_BAR_CATALOG, type CatalogItem } from "../src/lib/catalog-longevity";

// scripts/ žije uvnitř repa longevity-bar/; drop složka je mimo repo, sourozenec
// repa v portfoliu Coding.AI: .../Coding.AI/_data/longevity-bar/obrazky-drop/.
// "../../" ze `scripts/sync_longevity_images.ts` vede na kořen Coding.AI.
const CODING_AI_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DROP_DIR = path.join(CODING_AI_ROOT, "_data", "longevity-bar", "obrazky-drop");

const PUBLIC_LONGEVITY_DIR = fileURLToPath(new URL("../public/longevity/", import.meta.url));

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const IGNORED_FILES = new Set(["README.md", ".DS_Store", ".gitkeep"]);

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Klíč pro case/diakritika-insensitive přesnou shodu jmen. */
function comparableKey(value: string): string {
  return stripDiacritics(value).toLowerCase().trim().replace(/\s+/g, " ");
}

/** URL-bezpečný slug odvozený z názvu položky katalogu (ne z názvu souboru). */
function slugify(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type MatchResult = {
  file: string;
  ext: string;
  baseName: string;
  matches: CatalogItem[];
};

function main() {
  const dropDir = DROP_DIR;

  if (!existsSync(dropDir)) {
    console.error(`Drop složka neexistuje: ${dropDir}`);
    process.exitCode = 1;
    return;
  }

  if (!existsSync(PUBLIC_LONGEVITY_DIR)) {
    mkdirSync(PUBLIC_LONGEVITY_DIR, { recursive: true });
  }

  const entries = readdirSync(dropDir).filter((name) => {
    if (IGNORED_FILES.has(name)) return false;
    if (name.startsWith(".")) return false;
    const full = path.join(dropDir, name);
    return statSync(full).isFile();
  });

  if (entries.length === 0) {
    console.log(`Drop složka je prázdná: ${dropDir}`);
    console.log("Vlož sem soubor pojmenovaný přesně jako položka v menu a spusť sync znovu.");
    return;
  }

  const results: MatchResult[] = [];
  const skippedExtensions: string[] = [];

  for (const file of entries) {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, path.extname(file));

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      skippedExtensions.push(file);
      continue;
    }

    const key = comparableKey(baseName);
    const matches = LONGEVITY_BAR_CATALOG.filter((item) => comparableKey(item.name) === key);

    results.push({ file, ext, baseName, matches });
  }

  console.log(`Drop složka: ${dropDir}`);
  console.log(`Nalezeno souborů k párování: ${results.length}\n`);

  const readyLines: string[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const result of results) {
    const sourcePath = path.join(dropDir, result.file);

    if (result.matches.length === 0) {
      unmatchedCount += 1;
      console.log(`NEPÁROVÁNO  "${result.file}" — žádná položka katalogu se jménem "${result.baseName}" nenalezena.`);
      continue;
    }

    for (const item of result.matches) {
      matchedCount += 1;
      const targetFileName = `${slugify(item.name)}${result.ext}`;
      const targetPath = path.join(PUBLIC_LONGEVITY_DIR, targetFileName);
      copyFileSync(sourcePath, targetPath);

      const publicPath = `/longevity/${targetFileName}`;
      console.log(
        `NAPÁROVÁNO  "${result.file}" -> id="${item.id}" (${item.name}) -> public/longevity/${targetFileName}`,
      );
      readyLines.push(`  imageUrl: "${publicPath}", // ${item.id} – ${item.name}`);
    }

    if (result.matches.length > 1) {
      console.log(
        `            (pozor: "${result.baseName}" odpovídá ${result.matches.length} položkám katalogu — zkopírováno pro všechny, viz řádky níže)`,
      );
    }
  }

  if (skippedExtensions.length > 0) {
    console.log("");
    for (const file of skippedExtensions) {
      console.log(`PŘESKOČENO  "${file}" — nepodporovaná přípona (povoleno: ${[...ALLOWED_EXTENSIONS].join(", ")})`);
    }
  }

  console.log("");
  console.log(`Souhrn: ${matchedCount} napárováno, ${unmatchedCount} nenapárováno, ${skippedExtensions.length} přeskočeno.`);

  if (readyLines.length > 0) {
    console.log("");
    console.log("Hotové řádky k ručnímu vložení do src/lib/catalog-longevity.ts");
    console.log("(katalog se automaticky nepřepisuje — vlož ručně k odpovídající položce):");
    console.log("");
    for (const line of readyLines) {
      console.log(line);
    }
  }
}

main();
