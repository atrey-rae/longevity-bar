/**
 * Kontrola kvízu — doporučovací logika obou variant + přepínač variant.
 *
 * A) Pro KAŽDOU variantu projde všechny kombinace odpovědí
 *    (mikrobiom 4 × 4 × 5 = 80, profil 4 × 4 × 5 × 4 × 3 × 3 × 4 × 3 × 4 =
 *    138 240) a ověří, že výsledek je použitelný na obrazovce i v kupónu:
 *      1. 6–8 produktů,
 *      2. každý slug existuje v katalogu,
 *      3. žádné duplicity,
 *      4. aspoň 2 produkty z gut pilíře dané odpovědi na otázku o trávení —
 *         zdravotní část kvízu se musí propsat do výsledku vždy, ne jen
 *         když zbude místo.
 *
 * B) Zkontroluje přepínač variant: obě varianty existují, mají očekávaný
 *    počet otázek, unikátní id otázek i hodnoty odpovědí, a doporučení
 *    přežije i prázdné / nesmyslné odpovědi (starý odkaz, ruční zásah).
 *
 * Spuštění: `npx tsx scripts/check-kviz.ts` (nebo `npm run check`)
 */
import { GUT_PILIR, PRODUKTY } from "../src/lib/kviz";
import {
  VARIANTY,
  VYCHOZI_VARIANTA,
  doporucitProVariantu,
  druhaVarianta,
  jeVarianta,
  nazevVarianty,
  varianta,
  type Odpovedi,
  type VariantaDef,
} from "../src/lib/kviz-varianty";

const MIN = 6;
const MAX = 8;
const MIN_Z_GUT = 2;

/** Kolik otázek která varianta musí mít — pojistka proti tichému ořezání. */
const OCEKAVANY_POCET_OTAZEK: Record<string, number> = {
  mikrobiom: 3,
  profil: 9,
};

const SLUGY_V_KATALOGU = new Set(PRODUKTY.map((p) => p.slug));

const chyby: string[] = [];
function chyba(zprava: string): void {
  chyby.push(zprava);
}

/* -------------------------------------------------------------------------- */
/* A) Všechny kombinace odpovědí                                               */
/* -------------------------------------------------------------------------- */

/** Postupně vygeneruje kartézský součin odpovědí varianty (bez držení v paměti). */
function* kombinace(v: VariantaDef): Generator<Odpovedi> {
  const otazky = v.otazky;
  const pozice = new Array<number>(otazky.length).fill(0);

  for (;;) {
    const odpovedi: Odpovedi = {};
    otazky.forEach((o, i) => {
      odpovedi[o.id] = o.moznosti[pozice[i]].hodnota;
    });
    yield odpovedi;

    let i = otazky.length - 1;
    while (i >= 0) {
      pozice[i] += 1;
      if (pozice[i] < otazky[i].moznosti.length) break;
      pozice[i] = 0;
      i -= 1;
    }
    if (i < 0) return;
  }
}

/**
 * `kde` je funkce, ne řetězec: popis kombinace se skládá až při chybě.
 * U 138 tisíc průchodů by řetězení řetězců stálo víc než celý výpočet.
 */
function zkontrolovatVysledek(
  kde: () => string,
  odpovedi: Odpovedi,
  slugy: string[],
): void {
  if (slugy.length < MIN || slugy.length > MAX) {
    chyba(`${kde()}: ${slugy.length} produktů, čekáme ${MIN}–${MAX}`);
  }

  let mimoKatalog = 0;
  const videne = new Set<string>();
  for (const s of slugy) {
    if (!SLUGY_V_KATALOGU.has(s)) mimoKatalog += 1;
    videne.add(s);
  }
  if (mimoKatalog > 0) {
    chyba(`${kde()}: ${mimoKatalog}× slug mimo katalog — ${slugy.join(", ")}`);
  }
  if (videne.size !== slugy.length) {
    chyba(`${kde()}: duplicity — ${slugy.join(", ")}`);
  }

  // Gut pilíř drží otázka o trávení; ta je v obou variantách pod `q2`.
  const gut = GUT_PILIR[odpovedi.q2 as keyof typeof GUT_PILIR];
  if (!gut) {
    chyba(`${kde()}: neznámá odpověď na trávení — ${odpovedi.q2}`);
    return;
  }
  let zGut = 0;
  for (const s of gut) if (videne.has(s)) zGut += 1;
  if (zGut < MIN_Z_GUT) {
    chyba(
      `${kde()}: jen ${zGut} z gut pilíře (čekáme ≥${MIN_Z_GUT}) — ${slugy.join(", ")}`,
    );
  }
}

const pocty: string[] = [];

for (const v of VARIANTY) {
  let kombinaci = 0;
  const chybPred = chyby.length;

  for (const odpovedi of kombinace(v)) {
    kombinaci += 1;
    const slugy = doporucitProVariantu(v.id, odpovedi).map((p) => p.slug);
    zkontrolovatVysledek(
      () => `${v.id}: ${v.otazky.map((o) => odpovedi[o.id]).join(" / ")}`,
      odpovedi,
      slugy,
    );
  }

  const ocekavano = OCEKAVANY_POCET_OTAZEK[v.id];
  if (ocekavano !== undefined && v.otazky.length !== ocekavano) {
    chyba(
      `${v.id}: ${v.otazky.length} otázek, čekáme ${ocekavano} (změna zadání?)`,
    );
  }

  pocty.push(
    `${v.id} ${kombinaci}/${kombinaci}${chyby.length > chybPred ? " ✗" : ""}`,
  );
}

/* -------------------------------------------------------------------------- */
/* B) Přepínač variant                                                         */
/* -------------------------------------------------------------------------- */

if (VARIANTY.length !== 2) {
  chyba(`přepínač: čekáme 2 varianty, je jich ${VARIANTY.length}`);
}

const idcka = VARIANTY.map((v) => v.id);
if (new Set(idcka).size !== idcka.length) {
  chyba(`přepínač: duplicitní id variant — ${idcka.join(", ")}`);
}

for (const id of idcka) {
  if (!jeVarianta(id)) chyba(`přepínač: jeVarianta('${id}') je false`);
  if (varianta(id).id !== id) chyba(`přepínač: varianta('${id}') vrací jinou`);
  if (druhaVarianta(id) === id) {
    chyba(`přepínač: druhaVarianta('${id}') vrací tu samou`);
  }
  if (!nazevVarianty(id)) chyba(`přepínač: varianta '${id}' nemá název`);
}

if (!jeVarianta(VYCHOZI_VARIANTA)) {
  chyba(`přepínač: VYCHOZI_VARIANTA '${VYCHOZI_VARIANTA}' není platná varianta`);
}

// Neznámý vstup nesmí vyhodit výjimku ani vrátit nic — spadne na výchozí.
for (const nesmysl of ["", "profil2", "MIKROBIOM", "../../etc/passwd"]) {
  if (jeVarianta(nesmysl)) chyba(`přepínač: jeVarianta('${nesmysl}') je true`);
  if (varianta(nesmysl).id !== VYCHOZI_VARIANTA) {
    chyba(`přepínač: varianta('${nesmysl}') nespadla na výchozí`);
  }
}

for (const v of VARIANTY) {
  const ids = v.otazky.map((o) => o.id);
  if (new Set(ids).size !== ids.length) {
    chyba(`${v.id}: duplicitní id otázek — ${ids.join(", ")}`);
  }
  if (v.otazky.length === 0) chyba(`${v.id}: varianta nemá žádné otázky`);
  if (!v.nazev || !v.popis || !v.hook) chyba(`${v.id}: chybí text v přepínači`);

  for (const o of v.otazky) {
    if (o.moznosti.length < 2) {
      chyba(`${v.id}/${o.id}: méně než 2 možnosti`);
    }
    const hodnoty = o.moznosti.map((m) => m.hodnota);
    if (new Set(hodnoty).size !== hodnoty.length) {
      chyba(`${v.id}/${o.id}: duplicitní hodnoty — ${hodnoty.join(", ")}`);
    }
    if (o.moznosti.some((m) => !m.text || !m.emoji)) {
      chyba(`${v.id}/${o.id}: možnost bez textu nebo emoji`);
    }
  }

  // Prázdné i nesmyslné odpovědi musí dát pořád použitelný výsledek —
  // přepínač variant stav odpovědí resetuje a stará URL může přinést cokoli.
  for (const [popis, odpovedi] of [
    ["prázdné odpovědi", {} as Odpovedi],
    [
      "nesmyslné odpovědi",
      Object.fromEntries(v.otazky.map((o) => [o.id, "xxx"])) as Odpovedi,
    ],
  ] as const) {
    const vysledek = doporucitProVariantu(v.id, odpovedi);
    if (vysledek.length < MIN || vysledek.length > MAX) {
      chyba(
        `${v.id}: ${popis} → ${vysledek.length} produktů, čekáme ${MIN}–${MAX}`,
      );
    }
    if (vysledek.some((p) => !SLUGY_V_KATALOGU.has(p.slug))) {
      chyba(`${v.id}: ${popis} → slug mimo katalog`);
    }
  }
}

/* -------------------------------------------------------------------------- */

if (chyby.length > 0) {
  console.error(`✗ check-kviz: ${chyby.length} chyb`);
  for (const c of chyby.slice(0, 40)) console.error(`  · ${c}`);
  if (chyby.length > 40) console.error(`  · … a dalších ${chyby.length - 40}`);
  process.exit(1);
}

console.log(
  `✓ check-kviz: ${pocty.join(" · ")} kombinací OK ` +
    `(${MIN}–${MAX} produktů, unikátní, z katalogu, ≥${MIN_Z_GUT} z gut pilíře) ` +
    `+ přepínač variant`,
);
