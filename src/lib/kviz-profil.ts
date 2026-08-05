/**
 * Kvíz bavičů fronty, varianta „profil“ — devět otázek a vážená matice.
 *
 * Váhy jsou přepis Google Sheetu `1QU_uDoq0bVLJvnaxTIXYQf4HJN8Q0Ctlqlpzbm5DEG4`
 * (viz `tasks/2026-08-04-quiz-v2-healing-dashboard/SOURCE_QUIZ_MATRIX.md`).
 * Čísla NEUPRAVOVAT bez nové verze zdrojového Sheetu — texty otázek se leštit
 * dají, váhy ne.
 *
 * Výsledek je produktová inspirace, nikdy zdravotní tvrzení: názvy profilů jsou
 * produktové kategorie, ne diagnózy. Skóre i odpovědi zůstávají v prohlížeči,
 * server dostane až variantu kvízu a produkt, který si zákazník vybral.
 */

import { najitProdukt, type KvizProdukt } from "./kviz";

/** Strop dlaždic na výsledkové obrazovce (mřížka 2 × 4 na mobilu). */
const MAX_PRODUKTU = 8;

export type ProfilMoznost = {
  text: string;
  emoji: string;
  /** Skóre pro P1–P10 ve stejném pořadí jako `PROFILY`. Může být negativní. */
  vahy: number[];
};

export type ProfilOtazka = {
  text: string;
  moznosti: ProfilMoznost[];
};

export const PROFIL_HOOK =
  "9 otázek, minuta — najdi si svou WILD&COCO rutinu a odnes si slevu 21 % na produkt, který si vybereš.";

/** Povinná disclaimer věta na výsledkové obrazovce. */
export const PROFIL_DISCLAIMER =
  "Tohle je produktová inspirace, ne zdravotní doporučení.";

export const PROFIL_OTAZKY: ProfilOtazka[] = [
  {
    text: "Jaký máš vztah k vaření?",
    moznosti: [
      { text: "Ráda/rád experimentuju a vařím doma", emoji: "👩‍🍳", vahy: [3, 0, 2, 0, 0, 0, 0, 3, 0, 0] },
      { text: "Chci to rychlé a praktické", emoji: "⚡", vahy: [0, 3, 0, 2, 0, 0, 0, 0, 0, 2] },
      { text: "Nejradši hotové a chutné", emoji: "🍽️", vahy: [0, 0, 0, 0, 3, 3, 0, 0, 0, 2] },
    ],
  },
  {
    text: "Jak vypadá tvůj denní životní styl?",
    moznosti: [
      { text: "Hodně se hýbu", emoji: "🏃", vahy: [0, 3, 0, 0, 0, 3, 0, 0, 0, 0] },
      { text: "Řeším stres, chci větší odolnost", emoji: "😮‍💨", vahy: [0, 0, 0, 0, 0, 0, 0, 3, 0, 2] },
      { text: "Zdravé stravování a prevence", emoji: "🥗", vahy: [2, 0, 3, 0, 0, 0, 0, 2, 0, 2] },
    ],
  },
  {
    text: "Jaké chutě máš nejraději?",
    moznosti: [
      { text: "Svěží lehké nápoje", emoji: "🥥", vahy: [0, 3, 3, 0, 0, 0, 0, 0, 0, 0] },
      { text: "Výrazné fermentované chutě", emoji: "🌶️", vahy: [3, 0, 0, 0, 3, 0, 0, 0, 3, 0] },
      { text: "Jídlo bez lepku a mléka", emoji: "🌾", vahy: [0, 0, 0, 0, 0, 0, 0, 3, 0, 4] },
      { text: "Vydatné snídaně", emoji: "🥣", vahy: [0, 0, 0, 3, 0, 0, 0, 0, 3, 0] },
    ],
  },
  {
    text: "Jak funguje tvoje trávení?",
    moznosti: [
      { text: "Bez potíží, chci dlouhodobou podporu", emoji: "👍", vahy: [2, 2, 2, 1, 1, 1, 0, 1, 2, 0] },
      { text: "Občas citlivé", emoji: "😐", vahy: [2, 2, 2, 3, 0, 0, 3, 0, 0, 2] },
      { text: "Velmi citlivé", emoji: "🌶️", vahy: [0, 0, 0, 0, 0, 0, 4, 2, 0, 2] },
    ],
  },
  {
    text: "Jak plánuješ jídlo?",
    moznosti: [
      { text: "Každý den chci novou inspiraci", emoji: "✨", vahy: [3, 0, 0, 0, 0, 0, 0, 3, 0, 2] },
      { text: "Rychlé řešení na celý týden", emoji: "📅", vahy: [0, 2, 2, 2, 2, 2, 0, 0, 2, 0] },
      { text: "Hlavně obědy a večeře, snídani řeším rychle", emoji: "🍲", vahy: [0, 0, 0, 0, 0, 0, 0, 3, 0, 3] },
    ],
  },
  {
    text: "Co hledáš ve stravě nejvíc?",
    moznosti: [
      { text: "Chutné novinky", emoji: "😋", vahy: [0, 0, 0, 0, 3, 0, 0, 2, 0, 2] },
      { text: "Maximum benefitů a prevence", emoji: "🛡️", vahy: [0, 0, 2, 0, 0, 0, 3, 0, 2, 0] },
      { text: "Alternativy bez lepku a mléka", emoji: "🌾", vahy: [0, 0, 0, 2, 0, 0, 0, 3, 0, 4] },
      { text: "Praktickou výživu pro hektický život", emoji: "🏃‍♀️", vahy: [0, 3, 0, 0, 0, 3, 0, 0, 0, 0] },
    ],
  },
  {
    text: "Jak často máš fermentované potraviny?",
    moznosti: [
      { text: "Denně a moc ráda/rád", emoji: "😍", vahy: [3, 0, 0, 0, 3, 0, 0, 0, 3, 0] },
      { text: "Občas", emoji: "🙂", vahy: [0, 0, 0, 2, 0, 0, 2, 0, 0, 2] },
      { text: "Skoro nikdy, ale chci začít", emoji: "🌱", vahy: [0, 2, 2, 0, 0, 0, 0, 0, 0, 0] },
    ],
  },
  {
    text: "Jak se cítíš po jídle?",
    moznosti: [
      { text: "Bývám unavená/ý, ospalá/ý, mám žízeň nebo hlad", emoji: "😴", vahy: [0, 3, 3, 0, 3, 3, 3, 0, 0, 0] },
      { text: "Nic z toho", emoji: "🙅", vahy: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ],
  },
  {
    text: "Reaguješ na některá jídla?",
    moznosti: [
      {
        text: "Po některých jídlech mívám bolesti hlavy, trávicí potíže, kůži nebo únavu",
        emoji: "🤕",
        vahy: [-2, 0, 0, -2, -3, 0, 4, 3, -2, 3],
      },
      { text: "Nic z toho", emoji: "🙅", vahy: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ],
  },
];

export type Profil = {
  /** „P1“ … „P10“ — index v poli odpovídá indexu ve váhových vektorech. */
  id: string;
  /** Produktová kategorie, ne diagnóza. */
  nazev: string;
  produkty: string[];
};

/**
 * Schválené mapování profil → produktoví kandidáti (Atrey, 4. 8. 2026).
 * Prvních osm kandidátů je prioritní výsledková sada pro jediného vítěze;
 * další položky rozšiřují výběr při remíze.
 */
export const PROFILY: Profil[] = [
  { id: "P1", nazev: "Domácí výroba kokosového jogurtu", produkty: ["DUZINA", "PYRE", "JOGURT1L", "VODA3", "MILK17", "SMET400", "MLEKO", "NEKTAR2", "SMET200"] },
  { id: "P2", nazev: "Balíček raw kokosové vody", produkty: ["VODA1", "VODA2", "VODA3"] },
  { id: "P3", nazev: "Balíček mladých kokosů", produkty: ["DUZINA", "PYRE", "VODA3", "VODA1", "VODA2", "NTR250", "KEFIR", "JOGURT1L"] },
  { id: "P4", nazev: "Každodenní snídaňový balíček", produkty: ["CCG400", "PREM300", "CHIAVAN", "GRNSTR", "GRN250", "CHLEBAMA", "POMCOKO", "POMKESU", "CCGYC150", "CCG150", "CCGBB150", "PREM1000", "CHLEBSSM", "POMMACA", "POMNAT"] },
  { id: "P5", nazev: "Balíček fermentovaných Cocofirů", produkty: ["NTR250", "MNG250", "BB250", "KEFIR", "KEFMNG", "SIXVNL", "SIXMNG"] },
  { id: "P6", nazev: "Proteinové a probiotické shoty", produkty: ["CC250", "BL250", "SC250", "SIXCH", "SIXBL", "SIXVNL", "SIXMNG"] },
  { id: "P7", nazev: "Cílené probiotické doplňky", produkty: ["SYMB", "SYMB30", "SYMBNOC", "HISTA60", "HISTA30"] },
  { id: "P8", nazev: "Rostlinné obědy a večeře", produkty: ["TEMPLPN", "TEMPLNT", "TEMPHRACH", "BURGER", "NUGETKY", "NUGKOPR", "CHLEBAMA", "PESTO", "CHLEBSSM", "FOCACCIA", "KIMCHI", "GREENCHI", "FLOWERCHI", "GARLICCHI", "MAYO"] },
  { id: "P9", nazev: "Symbiotický Cocoguard", produkty: ["CCG400", "PREM300", "CHIAVAN", "CCGYC150", "CCG150", "CCGBB150", "PREM1000", "JOGURT1L"] },
  // Konzervativní top 8: širší automatizace čeká na explicitní dietní flagy
  // ověřené z aktuálních etiket, ne jen na marketingové názvy produktů.
  { id: "P10", nazev: "Výběr bez mléka a lepku", produkty: ["CHLEBAMA", "CCGYC150", "NTR250", "TEMPLPN", "KIMCHI", "MILK17", "MLEKO", "GRNSTR"] },
];

/** Počet profilů = délka každého váhového vektoru — odvozeno, ne opsáno. */
const POCET_PROFILU = PROFILY.length;

/**
 * Kontrola při načtení modulu: špatná délka váhového vektoru by se jinak
 * projevila jako tichý `NaN` ve skóre (viz `vyhodnotitProfil`) a kvíz by
 * přestal umět vybrat vítěze — radši spadnout hned při startu appky.
 */
for (const otazka of PROFIL_OTAZKY) {
  for (const moznost of otazka.moznosti) {
    if (moznost.vahy.length !== POCET_PROFILU) {
      throw new Error(
        `kviz-profil: otázka „${otazka.text}" má možnost „${moznost.text}" ` +
          `s ${moznost.vahy.length} váhami, čekáno ${POCET_PROFILU}.`,
      );
    }
  }
}

export type VysledekProfilu = {
  /** Všechny profily s nejvyšším skóre, v pořadí P1→P10. */
  profilId: string[];
  produkty: KvizProdukt[];
};

/**
 * Sečte váhy devíti zvolených odpovědí a vrátí produkty profilů s nejvyšším
 * skóre. Čistá a deterministická funkce — stejný vstup dá vždy stejný výstup.
 *
 * Remíza se neláme náhodou ani „ber první“: vrací se VŠECHNY profily s maximem
 * a kandidáti se vybírají round-robin v pořadí P1→P10. Díky tomu první profil
 * nezaplní celý strop osmi dlaždic a každý vítěz dostane prostor. Duplicity a
 * slugy mimo katalog se zahodí.
 *
 * Neplatný vstup (jiná délka než 9, index mimo rozsah otázky, necelé číslo)
 * vrací prázdný výsledek, nevyhazuje výjimku — UI z něj nesmí spadnout.
 */
export function vyhodnotitProfil(vybraneIndexy: number[]): VysledekProfilu {
  const prazdny: VysledekProfilu = { profilId: [], produkty: [] };
  if (vybraneIndexy.length !== PROFIL_OTAZKY.length) return prazdny;

  const skore = new Array<number>(POCET_PROFILU).fill(0);
  for (let q = 0; q < PROFIL_OTAZKY.length; q += 1) {
    const index = vybraneIndexy[q];
    const moznost = Number.isInteger(index)
      ? PROFIL_OTAZKY[q].moznosti[index]
      : undefined;
    if (!moznost) return prazdny;
    for (let p = 0; p < POCET_PROFILU; p += 1) {
      skore[p] += moznost.vahy[p];
    }
  }

  const maximum = Math.max(...skore);
  const vitezove = PROFILY.filter((_, p) => skore[p] === maximum);

  // Jediný vítěz dostane jednoduše svých prvních osm platných kandidátů.
  if (vitezove.length === 1) {
    const produkty = vitezove[0].produkty
      .map((slug) => najitProdukt(slug))
      .filter((produkt): produkt is KvizProdukt => Boolean(produkt))
      .slice(0, MAX_PRODUKTU);
    return { profilId: [vitezove[0].id], produkty };
  }

  const produkty: KvizProdukt[] = [];
  const videne = new Set<string>();
  const pozice = new Array(vitezove.length).fill(0);
  let pokracovat = true;

  while (produkty.length < MAX_PRODUKTU && pokracovat) {
    pokracovat = false;
    for (let i = 0; i < vitezove.length && produkty.length < MAX_PRODUKTU; i += 1) {
      while (pozice[i] < vitezove[i].produkty.length) {
        const slug = vitezove[i].produkty[pozice[i]++];
        if (videne.has(slug)) continue;
        const produkt = najitProdukt(slug);
        if (!produkt) continue;
        videne.add(slug);
        produkty.push(produkt);
        pokracovat = true;
        break;
      }
    }
  }

  return { profilId: vitezove.map((p) => p.id), produkty };
}
