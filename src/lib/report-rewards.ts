/**
 * Přehled VYDANÝCH věrnostních odměn pro interní report (evidence + Sheet).
 *
 * Sesterský modul k `lib/report-users.ts` a drží se stejných pravidel: čte se
 * service-role klientem (RLS pouští uživateli jen jeho vlastní řádky), spojuje
 * se v paměti (stovky řádků na festival) a NIKDY nesmí do klientského bundlu.
 *
 * POZOR na názvosloví: tabulka `rewards` nemá sloupec `issued_at`. Výdej odměny
 * je v migraci 001 modelovaný stavem `state = 'redeemed'` a časem `redeemed_at`
 * (`issued_at` nese až objednávka z kreditu, což je jiná věc — Healing.app).
 * Report tedy filtruje `state = 'redeemed'` a `redeemed_at is not null`.
 */

import { CATEGORY_LABEL } from "@/lib/loyalty";
import { normalizeCzechPhone } from "@/lib/phone-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductCategory } from "@/lib/types";

if (typeof window !== "undefined") {
  throw new Error("lib/report-rewards.ts je serverový modul — nesmí do klienta.");
}

/** Jeden řádek reportu = jedna vydaná odměna. */
export type ReportRadekOdmeny = {
  /** Kdy byla odměna vydána (ISO 8601, `rewards.redeemed_at`). */
  vydano: string;
  /** `profiles.full_name`, prázdné jméno se chová jako `null`. */
  jmeno: string | null;
  /**
   * Telefon v E.164. Zdroj pravdy je `phone_identities` (normalizované už při
   * ověření PINu), `profiles.phone` je záloha — historicky ho plnil formulář
   * na kartě, takže se normalizuje a při nečitelném tvaru se zahodí.
   */
  telefon: string | null;
  /** Název produktu; když produkt mezitím zmizel, padá na popisek kategorie. */
  produkt: string;
  /** Strojová hodnota enumu `product_category` — stabilní napříč změnami copy. */
  kategorie: ProductCategory;
};

/** Prázdný řetězec i samé mezery se v reportu mají chovat jako `null`. */
function textNeboNull(hodnota: unknown): string | null {
  if (typeof hodnota !== "string") return null;
  const orezany = hodnota.trim();
  return orezany === "" ? null : orezany;
}

/** Telefon v E.164, nebo `null` — do evidence nepatří půlka čísla. */
function telefonE164(...kandidati: unknown[]): string | null {
  for (const kandidat of kandidati) {
    const hodnota = textNeboNull(kandidat);
    if (!hodnota) continue;
    try {
      return normalizeCzechPhone(hodnota);
    } catch {
      // Nečitelný tvar zkusíme přeskočit — možná ho unese další zdroj.
    }
  }
  return null;
}

/**
 * Vydané odměny seřazené od nejstaršího výdeje.
 *
 * Chyba kterékoli tabulky je výjimka: report je evidence, a neúplná evidence
 * je horší než žádná. Route ji převede na 500 bez detailu.
 */
export async function sestavitReportOdmen(): Promise<ReportRadekOdmeny[]> {
  const admin = createAdminClient();

  const [odmenyRes, profilyRes, telefonyRes, produktyRes] = await Promise.all([
    admin
      .from("rewards")
      .select("user_id, category, product_id, redeemed_at")
      .eq("state", "redeemed")
      .not("redeemed_at", "is", null)
      .order("redeemed_at", { ascending: true }),
    admin.from("profiles").select("id, full_name, phone"),
    admin.from("phone_identities").select("user_id, phone_e164"),
    admin.from("products").select("id, name"),
  ]);

  for (const [tabulka, res] of [
    ["rewards", odmenyRes],
    ["profiles", profilyRes],
    ["phone_identities", telefonyRes],
    ["products", produktyRes],
  ] as const) {
    if (res.error) throw new Error(`${tabulka}: ${res.error.message}`);
  }

  const profily = new Map((profilyRes.data ?? []).map((p) => [p.id, p]));
  const telefony = new Map(
    (telefonyRes.data ?? []).map((t) => [t.user_id, t.phone_e164]),
  );
  const produkty = new Map((produktyRes.data ?? []).map((p) => [p.id, p.name]));

  const radky: ReportRadekOdmeny[] = [];
  for (const odmena of odmenyRes.data ?? []) {
    // `.not("redeemed_at", "is", null)` hlídá databáze, tohle je pojistka pro
    // typy — bez času výdeje by řádek stejně neměl v evidenci co dělat.
    const vydano = textNeboNull(odmena.redeemed_at);
    if (!vydano) continue;

    const profil = profily.get(odmena.user_id);
    const kategorie = odmena.category as ProductCategory;

    radky.push({
      vydano,
      jmeno: textNeboNull(profil?.full_name),
      telefon: telefonE164(telefony.get(odmena.user_id), profil?.phone),
      produkt:
        (odmena.product_id ? textNeboNull(produkty.get(odmena.product_id)) : null) ??
        CATEGORY_LABEL[kategorie],
      kategorie,
    });
  }

  // Řazení dělá už databáze; opakujeme ho v paměti, aby pořadí nezáviselo na
  // tom, jestli PostgREST dotaz projde přesně takhle (a kvůli stabilitě testu).
  radky.sort((a, b) => a.vydano.localeCompare(b.vydano));
  return radky;
}
