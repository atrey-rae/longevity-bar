/**
 * Varianta kvízu „Longevity profil" — 9 otázek.
 *
 * Delší sourozenec tříotázkového „Mikrobiomu": prvních 6 otázek sdílí
 * (priorita → trávení → snídaně), dalších 6 doplňuje obrázek o energii, spánek,
 * pohyb, signály těla, návyky a hodnotu jídla.
 *
 * ⚠️ Odpovědi jsou zdravotní údaje: žijí VÝHRADNĚ v prohlížeči hosta.
 * Tento modul je čistá funkce bez jakéhokoli zápisu — na server jde nakonec
 * jen slug vybraného produktu, nikdy odpovědi ani průběžné skóre.
 *
 * Doporučení je deterministické (žádná náhoda), aby šlo celé projet
 * `scripts/check-kviz.ts`.
 */
import {
  AKCENT_PILIR,
  FORMAT_PILIR,
  GUT_PILIR,
  PRODUKTY,
  najitProdukt,
  type KvizProdukt,
  type Moznost,
  type OdpovedQ1,
  type OdpovedQ2,
  type OdpovedQ3,
} from "./kviz";

/* -------------------------------------------------------------------------- */
/* Otázky 4–9                                                                  */
/* -------------------------------------------------------------------------- */

export type OdpovedQ4 = "stabilni" | "dopoledne" | "rozjezd" | "vycerpani";
export type OdpovedQ5 = "tvrde" | "budim" | "malo";
export type OdpovedQ6 = "denne" | "parkrat" | "sedave";
export type OdpovedQ7 = "imunita" | "zanety" | "kuze" | "prevence";
export type OdpovedQ8 = "kava" | "sladke" | "nic";
export type OdpovedQ9 = "chut" | "slozeni" | "rychlost" | "ritual";

export const OTAZKA_4_TEXT = "Jak ti šlape energie během dne?";
export const OTAZKA_4: Moznost<OdpovedQ4>[] = [
  { hodnota: "stabilni", emoji: "😌", text: "Stabilně od rána do večera" },
  { hodnota: "dopoledne", emoji: "🌅", text: "Dopoledne skvěle, odpoledne pád" },
  { hodnota: "rozjezd", emoji: "🐌", text: "Ráno se rozjíždím dlouho" },
  { hodnota: "vycerpani", emoji: "🪫", text: "Spíš vyčerpaně — potřebuju dobít" },
];

export const OTAZKA_5_TEXT = "A jak se ti spí?";
export const OTAZKA_5: Moznost<OdpovedQ5>[] = [
  { hodnota: "tvrde", emoji: "😴", text: "Tvrdě, vstávám odpočatý/á" },
  { hodnota: "budim", emoji: "🌙", text: "V noci se budím" },
  { hodnota: "malo", emoji: "⏰", text: "Spím málo — není kdy" },
];

export const OTAZKA_6_TEXT = "Kolik pohybu máš v běžném týdnu?";
export const OTAZKA_6: Moznost<OdpovedQ6>[] = [
  { hodnota: "denne", emoji: "🏃", text: "Skoro každý den" },
  { hodnota: "parkrat", emoji: "🚶", text: "Párkrát týdně" },
  { hodnota: "sedave", emoji: "🛋️", text: "Většinou sedím" },
];

export const OTAZKA_7_TEXT = "Co ti tělo hlásí nejčastěji?";
export const OTAZKA_7: Moznost<OdpovedQ7>[] = [
  { hodnota: "imunita", emoji: "🛡️", text: "Chytám každou virózu" },
  { hodnota: "zanety", emoji: "🔥", text: "Záněty, otoky, ztuhlost" },
  { hodnota: "kuze", emoji: "✨", text: "Kůže a vlasy" },
  { hodnota: "prevence", emoji: "💚", text: "Nic zásadního — jedu preventivně" },
];

export const OTAZKA_8_TEXT = "Jak to máš s kávou a sladkým?";
export const OTAZKA_8: Moznost<OdpovedQ8>[] = [
  { hodnota: "kava", emoji: "☕", text: "Káva je můj rituál" },
  { hodnota: "sladke", emoji: "🍫", text: "Sladké mě chytá odpoledne" },
  { hodnota: "nic", emoji: "🌿", text: "Ani jedno mi nechybí" },
];

export const OTAZKA_9_TEXT = "Na čem ti u jídla nejvíc záleží?";
export const OTAZKA_9: Moznost<OdpovedQ9>[] = [
  { hodnota: "chut", emoji: "😋", text: "Aby to bylo fakt dobré" },
  { hodnota: "slozeni", emoji: "🔍", text: "Čisté složení" },
  { hodnota: "rychlost", emoji: "⚡", text: "Aby to bylo hned" },
  { hodnota: "ritual", emoji: "🕯️", text: "Rituál a klid u jídla" },
];

/* -------------------------------------------------------------------------- */
/* Pilíře otázek 4–9 — doplňkové, dorovnávají talíř                            */
/* -------------------------------------------------------------------------- */

const ENERGIE_PILIR: Record<OdpovedQ4, string[]> = {
  stabilni: ["SYMB", "PREM300", "NTR250"],
  dopoledne: ["ESSDNM", "PROTEIN", "SIXCH"],
  rozjezd: ["JECMEN", "ESSDNM", "CACAO"],
  vycerpani: ["PROTEIN", "ESSDNM", "JECMEN"],
};

const SPANEK_PILIR: Record<OdpovedQ5, string[]> = {
  tvrde: ["NTR250", "CCG400"],
  budim: ["CACAO", "JECMEN", "SYMB"],
  malo: ["ESSDNM", "PROTEIN"],
};

const POHYB_PILIR: Record<OdpovedQ6, string[]> = {
  denne: ["PROTEIN", "SC250", "BURGER"],
  parkrat: ["SIXCH", "BL250", "TEMPLNT"],
  sedave: ["JECMEN", "GREENCHI", "VODA3"],
};

/**
 * Signály těla. `zanety` míří na Histabiotics stejně jako „citlivé trávení"
 * v gut pilíři — věcný pár, neměnit bez konzultace.
 */
const SIGNAL_PILIR: Record<OdpovedQ7, string[]> = {
  imunita: ["SYMB30", "CCG400", "KIMCHI"],
  zanety: ["HISTA60", "GREENCHI", "JECMEN"],
  kuze: ["CHIAVAN", "PREM300", "OLEJ"],
  prevence: ["SYMB", "PREM300", "VODA2"],
};

const NAVYK_PILIR: Record<OdpovedQ8, string[]> = {
  kava: ["ESSDNM", "MLEKO", "CACAO"],
  sladke: ["POMCOKO", "GRN250", "CC250"],
  nic: ["VODA1", "GREENCHI", "PESTO"],
};

const HODNOTA_PILIR: Record<OdpovedQ9, string[]> = {
  chut: ["MNG250", "GRNSTR", "POMKESU"],
  slozeni: ["PREM300", "NTR250", "DUZINA"],
  rychlost: ["SIXVNL", "SIXMNG", "CCGYC150"],
  ritual: ["CACAO", "PREM1000", "FOCACCIA"],
};

/* -------------------------------------------------------------------------- */
/* Doporučení                                                                  */
/* -------------------------------------------------------------------------- */

export type OdpovediProfil = {
  q1: OdpovedQ1;
  q2: OdpovedQ2;
  q3: OdpovedQ3;
  q4: OdpovedQ4;
  q5: OdpovedQ5;
  q6: OdpovedQ6;
  q7: OdpovedQ7;
  q8: OdpovedQ8;
  q9: OdpovedQ9;
};

const MIN_DOPORUCENI = 6;
const MAX_DOPORUCENI = 8;

/** Kolik produktů z gut pilíře jde do výsledku vždy, bez ohledu na skóre. */
const POVINNE_Z_GUT = 2;

/**
 * Váha pilíře = kolik bodů dostane jeho PRVNÍ produkt. Každá další pozice
 * v pilíři má o bod méně, takže se uvnitř pilíře zachová kurátorské pořadí.
 * Pilíře se sčítají — produkt, na který ukáže víc odpovědí, jde nahoru.
 */
const VAHA = {
  gut: 30,
  format: 24,
  akcent: 18,
  signal: 14,
  energie: 12,
  navyk: 10,
  hodnota: 9,
  spanek: 8,
  pohyb: 7,
} as const;

/** Pořadí produktu v katalogu — deterministický rozstřel při shodě skóre. */
const PORADI_V_KATALOGU = new Map(PRODUKTY.map((p, i) => [p.slug, i]));

/**
 * Doporučí 6–8 unikátních produktů z devíti odpovědí — deterministicky.
 *
 * Zdravotní část má přednost: první dva produkty gut pilíře (dle otázky
 * o trávení) jsou ve výsledku vždy, teprve zbytek se dopočítá skóre.
 */
export function doporucitProfil(odpovedi: OdpovediProfil): KvizProdukt[] {
  const skore = new Map<string, number>();
  const pridat = (slugy: string[], vaha: number): void => {
    slugy.forEach((slug, i) => {
      skore.set(slug, (skore.get(slug) ?? 0) + Math.max(1, vaha - i));
    });
  };

  pridat(GUT_PILIR[odpovedi.q2], VAHA.gut);
  pridat(FORMAT_PILIR[odpovedi.q3], VAHA.format);
  pridat(AKCENT_PILIR[odpovedi.q1], VAHA.akcent);
  pridat(SIGNAL_PILIR[odpovedi.q7], VAHA.signal);
  pridat(ENERGIE_PILIR[odpovedi.q4], VAHA.energie);
  pridat(NAVYK_PILIR[odpovedi.q8], VAHA.navyk);
  pridat(HODNOTA_PILIR[odpovedi.q9], VAHA.hodnota);
  pridat(SPANEK_PILIR[odpovedi.q5], VAHA.spanek);
  pridat(POHYB_PILIR[odpovedi.q6], VAHA.pohyb);

  const vybrane: KvizProdukt[] = [];
  const pouzite = new Set<string>();
  const vlozit = (slug: string): void => {
    if (pouzite.has(slug) || vybrane.length >= MAX_DOPORUCENI) return;
    const produkt = najitProdukt(slug);
    if (!produkt) return;
    pouzite.add(slug);
    vybrane.push(produkt);
  };

  // 1) Zdravotní jádro — vždy ve výsledku.
  for (const slug of GUT_PILIR[odpovedi.q2].slice(0, POVINNE_Z_GUT)) vlozit(slug);

  // 2) Zbytek podle skóre; při shodě rozhoduje pořadí v katalogu.
  const podleSkore = [...skore.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const poradiA = PORADI_V_KATALOGU.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
    const poradiB = PORADI_V_KATALOGU.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
    return poradiA - poradiB;
  });
  for (const [slug] of podleSkore) vlozit(slug);

  // 3) Pojistka pro případ, že by někdo pilíře přepsal na hodně překryvné sady.
  for (const produkt of PRODUKTY) {
    if (vybrane.length >= MIN_DOPORUCENI) break;
    vlozit(produkt.slug);
  }

  return vybrane;
}
