/**
 * Validace formuláře kvízu a stavba záznamu do `quiz_leads`.
 *
 * Oddělené od `app/kviz/actions.ts` proto, že soubor se `"use server"` smí
 * exportovat jen async funkce — čistá logika se tam nedá otestovat.
 *
 * `sestavitQuizLeadZaznam` je JEDINÉ místo, kde se skládá řádek pro databázi.
 * Jeho signatura nepřijímá odpovědi na otázky, takže se do Supabase strukturálně
 * nemají jak dostat (rozhodnutí 4. 8. 2026: zdravotní odpovědi zůstávají
 * v prohlížeči).
 */

import { getDict } from "./i18n";
import { normalizeLang, DEFAULT_LANG, type Lang } from "./i18n/lang";
import {
  DEFAULT_QUIZ_VARIANT,
  QUIZ_VARIANTS,
  najitBavice,
  najitProdukt,
  type Bavic,
  type KvizProdukt,
  type QuizVariant,
} from "./kviz";
import { REFERRAL_PARAM, normalizovatReferralKod } from "./referral";
import type { Database } from "./types";

export type KvizFormVstup = {
  bavic: Bavic;
  produkt: KvizProdukt;
  quizVariant: QuizVariant;
  jmeno: string;
  email: string;
  telefon: string;
  /** Kód z `?od=` — `null`, když chyběl nebo neprošel validací. */
  referralKod: string | null;
  /**
   * Jazyk, ve kterém host kvíz vyplnil. Řídí JEN jazyk kupónového e-mailu —
   * do `quiz_leads` se nezapisuje (viz `sestavitQuizLeadZaznam`).
   */
  lang: Lang;
};

export type VysledekParsovani =
  | { ok: true; data: KvizFormVstup }
  | { ok: false; zprava: string };

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** 9 číslic bez předvolby = české číslo (stejné pravidlo jako v `app/actions.ts`). */
export function normalizovatTelefon(vstup: string): string | null {
  const cislice = vstup.replace(/[\s()./-]/g, "");
  if (!/^\+?\d{9,15}$/.test(cislice)) return null;
  if (cislice.startsWith("+")) return cislice;
  return cislice.length === 9 ? `+420${cislice}` : `+${cislice}`;
}

/**
 * Varianta kvízu z formuláře. Na tomhle poli se NIKDY netvrdě nepadá:
 * chybějící, prázdná i nesmyslná hodnota spadne na `microbiom`, aby
 * zacachovaná stránka bez skrytého inputu dál fungovala.
 */
function variantaZFormulare(formData: FormData): QuizVariant {
  const hodnota = text(formData, "quiz_variant").toLowerCase();
  return QUIZ_VARIANTS.find((v) => v === hodnota) ?? DEFAULT_QUIZ_VARIANT;
}

/**
 * Zvaliduje formulář kvízu.
 *
 * Chybové texty se berou ze slovníku (`chyby.*`) — česká znění jsou v `i18n/cs`
 * doslova stejná jako dřív, refaktor nesmí návštěvníkovi změnit ani jedno slovo.
 * Jazyk se čte ze skrytého pole `lang`; když chybí nebo je nesmyslný, spadne na
 * češtinu, takže starší zacachovaný formulář dál funguje.
 */
export function parseKvizFormData(formData: FormData): VysledekParsovani {
  const lang = normalizeLang(text(formData, "lang")) ?? DEFAULT_LANG;
  const { chyby } = getDict(lang);

  const bavic = najitBavice(text(formData, "bavic"));
  const produkt = najitProdukt(text(formData, "produkt"));
  if (!bavic || !produkt) {
    return { ok: false, zprava: chyby.rozbiloSe };
  }

  const jmeno = text(formData, "jmeno").slice(0, 80);
  if (jmeno.length < 2) {
    return { ok: false, zprava: chyby.napisJmeno };
  }

  const email = text(formData, "email").toLowerCase().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, zprava: chyby.zkontrolujEmail };
  }

  const telefon = normalizovatTelefon(text(formData, "telefon"));
  if (!telefon) {
    return { ok: false, zprava: chyby.telefonNesedi };
  }

  return {
    ok: true,
    data: {
      bavic,
      produkt,
      quizVariant: variantaZFormulare(formData),
      jmeno,
      email,
      telefon,
      // Na referralu se NIKDY nepadá: nesmysl v `?od=` se tiše zahodí a kvíz
      // proběhne úplně stejně jako bez něj.
      referralKod: normalizovatReferralKod(formData.get(REFERRAL_PARAM)),
      lang,
    },
  };
}

/** Řádek pro `quiz_leads` — nic víc, nic míň. */
export function sestavitQuizLeadZaznam(input: {
  bavic: Bavic;
  produkt: KvizProdukt;
  quizVariant: QuizVariant;
  jmeno: string;
  email: string;
  telefon: string;
  kod: string;
  referralKod?: string | null;
}): Database["public"]["Tables"]["quiz_leads"]["Insert"] {
  // Kód se normalizuje ještě jednou — `sestavitQuizLeadZaznam` je jediná cesta
  // do databáze a nesmí věřit ani vlastnímu volajícímu.
  const referral = normalizovatReferralKod(input.referralKod ?? null);

  return {
    bavic: input.bavic.kod,
    product_slug: input.produkt.slug,
    product_name: input.produkt.nazev,
    coupon_code: input.kod,
    first_name: input.jmeno,
    email: input.email,
    phone: input.telefon,
    quiz_variant: input.quizVariant,
    // Klíč vzniká JEN u platného referralu — bez něj má řádek stejných osm
    // sloupců jako dřív (hlídá `scripts/check-quiz-lead-payload.ts`).
    ...(referral ? { referral_code: referral } : {}),
  };
}
