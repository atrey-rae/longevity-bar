/**
 * Kontrola vážené matice kvízu varianty „profil“.
 *
 * Projde VŠECHNY kombinace odpovědí (3·3·4·3·3·4·3·2·2 = 15 552) a ověří, že
 * výsledek je použitelný na obrazovce i v kupónu:
 *   1. aspoň 1 produkt a nejvýš strop 8,
 *   2. každý slug existuje v katalogu (allowlist),
 *   3. žádné duplicity,
 *   4. aspoň 1 profil a všechna id jsou známá (P1–P10),
 *   5. jediný vítěz vrací přesně prvních osm kandidátů svého profilu,
 *   6. remíza vybírá deterministicky round-robin, aby pozdější vítězové nebyli
 *      vyhladověni produkty prvního profilu,
 *   7. funkce je deterministická (dva běhy stejného vstupu = stejný výsledek).
 *
 * Spuštění: `npx tsx scripts/check-kviz-profil.ts`
 */
import { PRODUKTY } from "../src/lib/kviz";
import { PROFIL_OTAZKY, PROFILY, vyhodnotitProfil } from "../src/lib/kviz-profil";

const MIN = 1;
const MAX = 8;

const SLUGY_V_KATALOGU = new Set(PRODUKTY.map((p) => p.slug));
const ZNAMA_ID = new Set(PROFILY.map((p) => p.id));

const OCEKAVANE_PROFILY: Record<string, { nazev: string; produkty: string[] }> = {
  P1: { nazev: "Domácí výroba kokosového jogurtu", produkty: ["DUZINA", "PYRE", "JOGURT1L", "VODA3", "MILK17", "SMET400", "MLEKO", "NEKTAR2", "SMET200"] },
  P2: { nazev: "Balíček raw kokosové vody", produkty: ["VODA1", "VODA2", "VODA3"] },
  P3: { nazev: "Balíček mladých kokosů", produkty: ["DUZINA", "PYRE", "VODA3", "VODA1", "VODA2", "NTR250", "KEFIR", "JOGURT1L"] },
  P4: { nazev: "Každodenní snídaňový balíček", produkty: ["CCG400", "PREM300", "CHIAVAN", "GRNSTR", "GRN250", "CHLEBAMA", "POMCOKO", "POMKESU", "CCGYC150", "CCG150", "CCGBB150", "PREM1000", "CHLEBSSM", "POMMACA", "POMNAT"] },
  P5: { nazev: "Balíček fermentovaných Cocofirů", produkty: ["NTR250", "MNG250", "BB250", "KEFIR", "KEFMNG", "SIXVNL", "SIXMNG"] },
  P6: { nazev: "Proteinové a probiotické shoty", produkty: ["CC250", "BL250", "SC250", "SIXCH", "SIXBL", "SIXVNL", "SIXMNG"] },
  P7: { nazev: "Cílené probiotické doplňky", produkty: ["SYMB", "SYMB30", "SYMBNOC", "HISTA60", "HISTA30"] },
  P8: { nazev: "Rostlinné obědy a večeře", produkty: ["TEMPLPN", "TEMPLNT", "TEMPHRACH", "BURGER", "NUGETKY", "NUGKOPR", "CHLEBAMA", "PESTO", "CHLEBSSM", "FOCACCIA", "KIMCHI", "GREENCHI", "FLOWERCHI", "GARLICCHI", "MAYO"] },
  P9: { nazev: "Symbiotický Cocoguard", produkty: ["CCG400", "PREM300", "CHIAVAN", "CCGYC150", "CCG150", "CCGBB150", "PREM1000", "JOGURT1L"] },
  P10: { nazev: "Výběr bez mléka a lepku", produkty: ["CHLEBAMA", "CCGYC150", "NTR250", "TEMPLPN", "KIMCHI", "MILK17", "MLEKO", "GRNSTR"] },
};

for (const profil of PROFILY) {
  const ocekavany = OCEKAVANE_PROFILY[profil.id];
  if (!ocekavany) {
    throw new Error(`Chybí očekávání pro ${profil.id}`);
  }
  if (profil.nazev !== ocekavany.nazev) {
    throw new Error(`${profil.id}: název „${profil.nazev}", čekáme „${ocekavany.nazev}"`);
  }
  if (profil.produkty.join(",") !== ocekavany.produkty.join(",")) {
    throw new Error(`${profil.id}: kandidátní mapa neodpovídá schválenému auditu`);
  }
  const top = profil.produkty.filter((slug) => SLUGY_V_KATALOGU.has(slug)).slice(0, MAX);
  const ocekavanyTop = ocekavany.produkty.slice(0, MAX);
  if (top.join(",") !== ocekavanyTop.join(",")) {
    throw new Error(`${profil.id}: single-profile top 8 nesedí`);
  }
}

/** Nezávislý round-robin přepočet vítězných profilů (P1→P10, do stropu). */
function ocekavaneProdukty(profilId: string[]): string[] {
  const vitezove = PROFILY.filter((profil) => profilId.includes(profil.id));
  if (vitezove.length === 1) {
    return vitezove[0].produkty
      .filter((slug) => SLUGY_V_KATALOGU.has(slug))
      .slice(0, MAX);
  }

  const vysledek: string[] = [];
  const pozice = new Array(vitezove.length).fill(0);
  let pokracovat = true;
  while (vysledek.length < MAX && pokracovat) {
    pokracovat = false;
    for (let i = 0; i < vitezove.length && vysledek.length < MAX; i += 1) {
      while (pozice[i] < vitezove[i].produkty.length) {
        const slug = vitezove[i].produkty[pozice[i]++];
        if (!SLUGY_V_KATALOGU.has(slug) || vysledek.includes(slug)) continue;
        vysledek.push(slug);
        pokracovat = true;
        break;
      }
    }
  }
  return vysledek;
}

const chyby: string[] = [];
let kombinaci = 0;
let remiz = 0;
let maxProduktu = 0;
let maxRemizy = 0;

const vybrane: number[] = [];

function projdi(q: number): void {
  if (q === PROFIL_OTAZKY.length) {
    kombinaci += 1;
    const kde = vybrane.join("-");
    const vysledek = vyhodnotitProfil(vybrane);
    const slugy = vysledek.produkty.map((p) => p.slug);

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

    if (vysledek.profilId.length < 1) {
      chyby.push(`${kde}: žádný profil`);
    }
    const neznama = vysledek.profilId.filter((id) => !ZNAMA_ID.has(id));
    if (neznama.length > 0) {
      chyby.push(`${kde}: neznámé profily — ${neznama.join(", ")}`);
    }

    // Sjednocení vítězů — platí i pro jediného vítěze, remízy pak jen počítáme.
    const ocekavane = ocekavaneProdukty(vysledek.profilId);
    if (slugy.join(",") !== ocekavane.join(",")) {
      chyby.push(
        `${kde}: sjednocení nesedí — [${slugy.join(", ")}] vs [${ocekavane.join(", ")}]`,
      );
    }

    if (vysledek.profilId.length > 1) {
      remiz += 1;
      maxRemizy = Math.max(maxRemizy, vysledek.profilId.length);
      for (const profilId of vysledek.profilId) {
        const kandidati = PROFILY.find((p) => p.id === profilId)?.produkty ?? [];
        if (kandidati.some((slug) => SLUGY_V_KATALOGU.has(slug)) &&
            !kandidati.some((slug) => slugy.includes(slug))) {
          chyby.push(`${kde}: vítěz ${profilId} nemá ve výsledku žádného kandidáta`);
        }
      }
    }
    maxProduktu = Math.max(maxProduktu, slugy.length);
    return;
  }

  for (let i = 0; i < PROFIL_OTAZKY[q].moznosti.length; i += 1) {
    vybrane[q] = i;
    projdi(q + 1);
  }
  vybrane.length = q;
}

projdi(0);

/* --- Determinismus --------------------------------------------------------- */
const vzorek = [0, 1, 2, 1, 0, 3, 2, 0, 0];
const a = vyhodnotitProfil(vzorek);
const b = vyhodnotitProfil(vzorek);
if (JSON.stringify(a) !== JSON.stringify(b)) {
  chyby.push(`determinismus: dva běhy [${vzorek.join(",")}] daly jiný výsledek`);
}

/* --- Neplatný vstup nesmí hodit výjimku ------------------------------------ */
for (const spatny of [[], [0], new Array(9).fill(99), [0, 0, 0, 0, 0, 0, 0, 0, -1]]) {
  const r = vyhodnotitProfil(spatny as number[]);
  if (r.profilId.length !== 0 || r.produkty.length !== 0) {
    chyby.push(`neplatný vstup [${(spatny as number[]).join(",")}] nevrátil prázdný výsledek`);
  }
}

if (chyby.length > 0) {
  console.error(`✗ check-kviz-profil: ${chyby.length} chyb z ${kombinaci} kombinací`);
  for (const c of chyby.slice(0, 40)) console.error(`  · ${c}`);
  if (chyby.length > 40) console.error(`  · … a dalších ${chyby.length - 40}`);
  process.exit(1);
}

console.log(
  `✓ check-kviz-profil: ${kombinaci}/${kombinaci} kombinací OK ` +
    `(${MIN}–${MAX} produktů, unikátní, z katalogu, profily P1–P10) · ` +
    `remíz ${remiz} (nejvíc ${maxRemizy} profilů) · max produktů ${maxProduktu} · determinismus OK`,
);
