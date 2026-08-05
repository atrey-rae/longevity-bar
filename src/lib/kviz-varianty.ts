/**
 * Dvě varianty kvízu a jejich společné rozhraní.
 *
 *   · `mikrobiom` — 3 otázky, „Odemkni potenciál svého mikrobiomu!" (původní kvíz)
 *   · `profil`    — 9 otázek, „Longevity profil"
 *
 * Host smí dokončit KAŽDOU variantu právě jednou (vynucuje server, viz
 * `lib/quiz-policy.ts`). Doporučená varianta z politiky je jen předvolba
 * v přepínači — druhá je vždy dostupná.
 *
 * ⚠️ Odpovědi ani průběžné skóre se nikam neodesílají: obě `doporucit`
 * funkce jsou čisté a běží v prohlížeči. Na server jde jen slug produktu,
 * který si host nakonec vybral.
 *
 * Modul je bez závislosti na Reactu i na Supabase — importují ho jak klientské
 * komponenty, tak kontrolní skripty.
 */
import {
  HOOK,
  OTAZKA_1,
  OTAZKA_1_TEXT,
  OTAZKA_2,
  OTAZKA_2_TEXT,
  OTAZKA_3,
  OTAZKA_3_TEXT,
  doporucitProdukty,
  type KvizProdukt,
  type Moznost,
  type OdpovedQ1,
  type OdpovedQ2,
  type OdpovedQ3,
} from "./kviz";
import {
  OTAZKA_4,
  OTAZKA_4_TEXT,
  OTAZKA_5,
  OTAZKA_5_TEXT,
  OTAZKA_6,
  OTAZKA_6_TEXT,
  OTAZKA_7,
  OTAZKA_7_TEXT,
  OTAZKA_8,
  OTAZKA_8_TEXT,
  OTAZKA_9,
  OTAZKA_9_TEXT,
  doporucitProfil,
  type OdpovedQ4,
  type OdpovedQ5,
  type OdpovedQ6,
  type OdpovedQ7,
  type OdpovedQ8,
  type OdpovedQ9,
} from "./kviz-profil";

export type KvizVarianta = "mikrobiom" | "profil";

/** Odpovědi indexované podle `OtazkaDef.id` — drží je jen prohlížeč. */
export type Odpovedi = Record<string, string>;

export type OtazkaDef = {
  /** Klíč v `Odpovedi`; zároveň stabilní identifikátor otázky. */
  id: string;
  text: string;
  moznosti: Moznost<string>[];
};

export type VariantaDef = {
  id: KvizVarianta;
  /** Název v přepínači variant. */
  nazev: string;
  emoji: string;
  /** Jednořádkový popis pod názvem — kolik otázek a co z toho host má. */
  popis: string;
  /** Titulek úvodní obrazovky (dva řádky, druhý je zvýrazněný). */
  titulek: [string, string];
  hook: string;
  otazky: OtazkaDef[];
  doporucit: (odpovedi: Odpovedi) => KvizProdukt[];
};

/* -------------------------------------------------------------------------- */
/* Pomocníci                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Vytáhne odpověď a ověří ji proti seznamu možností. Neznámou hodnotu (starý
 * odkaz, ručně upravený stav) nahradí první možností — kvíz tak nikdy
 * neskončí prázdnou obrazovkou.
 */
function odpoved<T extends string>(
  odpovedi: Odpovedi,
  id: string,
  moznosti: Moznost<T>[],
): T {
  const hodnota = odpovedi[id];
  const nalezena = moznosti.find((m) => m.hodnota === hodnota);
  return (nalezena ?? moznosti[0]).hodnota;
}

/* -------------------------------------------------------------------------- */
/* Definice variant                                                            */
/* -------------------------------------------------------------------------- */

const MIKROBIOM: VariantaDef = {
  id: "mikrobiom",
  nazev: "Mikrobiom",
  emoji: "🦠",
  popis: "3 otázky · 30 vteřin",
  // Titulek i hook schválil Atrey 4. 8. 2026 — neměnit bez jeho GO.
  titulek: ["Odemkni potenciál", "svého mikrobiomu!"],
  hook: HOOK,
  otazky: [
    { id: "q1", text: OTAZKA_1_TEXT, moznosti: OTAZKA_1 },
    { id: "q2", text: OTAZKA_2_TEXT, moznosti: OTAZKA_2 },
    { id: "q3", text: OTAZKA_3_TEXT, moznosti: OTAZKA_3 },
  ],
  doporucit: (o) =>
    doporucitProdukty(
      odpoved<OdpovedQ1>(o, "q1", OTAZKA_1),
      odpoved<OdpovedQ2>(o, "q2", OTAZKA_2),
      odpoved<OdpovedQ3>(o, "q3", OTAZKA_3),
    ),
};

const PROFIL: VariantaDef = {
  id: "profil",
  nazev: "Longevity profil",
  emoji: "🧬",
  popis: "9 otázek · 2 minuty",
  titulek: ["Sestav si svůj", "Longevity profil"],
  hook: "9 otázek, 2 minuty — projdeme trávení, energii, spánek i pohyb a složíme ti doporučení na míru. Sleva 21 % na konci.",
  otazky: [
    { id: "q1", text: OTAZKA_1_TEXT, moznosti: OTAZKA_1 },
    { id: "q2", text: OTAZKA_2_TEXT, moznosti: OTAZKA_2 },
    { id: "q3", text: OTAZKA_3_TEXT, moznosti: OTAZKA_3 },
    { id: "q4", text: OTAZKA_4_TEXT, moznosti: OTAZKA_4 },
    { id: "q5", text: OTAZKA_5_TEXT, moznosti: OTAZKA_5 },
    { id: "q6", text: OTAZKA_6_TEXT, moznosti: OTAZKA_6 },
    { id: "q7", text: OTAZKA_7_TEXT, moznosti: OTAZKA_7 },
    { id: "q8", text: OTAZKA_8_TEXT, moznosti: OTAZKA_8 },
    { id: "q9", text: OTAZKA_9_TEXT, moznosti: OTAZKA_9 },
  ],
  doporucit: (o) =>
    doporucitProfil({
      q1: odpoved<OdpovedQ1>(o, "q1", OTAZKA_1),
      q2: odpoved<OdpovedQ2>(o, "q2", OTAZKA_2),
      q3: odpoved<OdpovedQ3>(o, "q3", OTAZKA_3),
      q4: odpoved<OdpovedQ4>(o, "q4", OTAZKA_4),
      q5: odpoved<OdpovedQ5>(o, "q5", OTAZKA_5),
      q6: odpoved<OdpovedQ6>(o, "q6", OTAZKA_6),
      q7: odpoved<OdpovedQ7>(o, "q7", OTAZKA_7),
      q8: odpoved<OdpovedQ8>(o, "q8", OTAZKA_8),
      q9: odpoved<OdpovedQ9>(o, "q9", OTAZKA_9),
    }),
};

/** Pořadí = pořadí v přepínači variant. */
export const VARIANTY: VariantaDef[] = [MIKROBIOM, PROFIL];

export const VYCHOZI_VARIANTA: KvizVarianta = "mikrobiom";

export function jeVarianta(hodnota: unknown): hodnota is KvizVarianta {
  return (
    typeof hodnota === "string" && VARIANTY.some((v) => v.id === hodnota)
  );
}

/** Definice varianty; neznámý vstup spadne na výchozí (nikdy nevyhodí). */
export function varianta(id: string | null | undefined): VariantaDef {
  return VARIANTY.find((v) => v.id === id) ?? MIKROBIOM;
}

/** Název varianty do hlášek pro hosta („Tuhle už máš, zkus …"). */
export function nazevVarianty(id: KvizVarianta): string {
  return varianta(id).nazev;
}

/** Druhá varianta — tu si host může dát, i když tuhle už dokončil. */
export function druhaVarianta(id: KvizVarianta): KvizVarianta {
  return VARIANTY.find((v) => v.id !== id)?.id ?? VYCHOZI_VARIANTA;
}

export function doporucitProVariantu(
  id: KvizVarianta,
  odpovedi: Odpovedi,
): KvizProdukt[] {
  return varianta(id).doporucit(odpovedi);
}
