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

import {
  DEFAULT_QUIZ_VARIANT,
  QUIZ_VARIANTS,
  najitBavice,
  najitProdukt,
  type Bavic,
  type KvizProdukt,
  type QuizVariant,
} from "./kviz";
import type { Database } from "./types";

export type KvizFormVstup = {
  bavic: Bavic;
  produkt: KvizProdukt;
  quizVariant: QuizVariant;
  jmeno: string;
  email: string;
  telefon: string;
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
 * Zvaliduje formulář kvízu. Chybové texty jsou schválně stejné jako dřív —
 * refaktor nesmí návštěvníkovi změnit ani jedno slovo.
 */
export function parseKvizFormData(formData: FormData): VysledekParsovani {
  const bavic = najitBavice(text(formData, "bavic"));
  const produkt = najitProdukt(text(formData, "produkt"));
  if (!bavic || !produkt) {
    return { ok: false, zprava: "Něco se rozbilo. Načti prosím QR kód znovu." };
  }

  const jmeno = text(formData, "jmeno").slice(0, 80);
  if (jmeno.length < 2) {
    return { ok: false, zprava: "Napiš nám prosím svoje křestní jméno." };
  }

  const email = text(formData, "email").toLowerCase().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, zprava: "Zkontroluj prosím e-mail — kupón ti na něj pošleme." };
  }

  const telefon = normalizovatTelefon(text(formData, "telefon"));
  if (!telefon) {
    return { ok: false, zprava: "Telefon nám nesedí. Zkus ho zadat znovu." };
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
}): Database["public"]["Tables"]["quiz_leads"]["Insert"] {
  return {
    bavic: input.bavic.kod,
    product_slug: input.produkt.slug,
    product_name: input.produkt.nazev,
    coupon_code: input.kod,
    first_name: input.jmeno,
    email: input.email,
    phone: input.telefon,
    quiz_variant: input.quizVariant,
  };
}
