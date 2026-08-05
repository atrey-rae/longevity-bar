import { cache } from "react";

import { jeVarianta, VYCHOZI_VARIANTA, type KvizVarianta } from "./kviz-varianty";
import { createAdminClient } from "./supabase/admin";

/**
 * Politika kvízu a evidence dokončených variant (migrace 006).
 *
 * Server-only: všechno jde přes service-role klienta, tabulky nejsou
 * z prohlížeče čitelné (kromě vlastních dokončení pod RLS).
 *
 * ⚠️ Ukládá se jen identita + varianta. Odpovědi na zdravotní otázky
 * a průběžné skóre zůstávají navždy jen v prohlížeči hosta.
 */

export type QuizPolicy = {
  /** Vyžaduje kvíz přihlášení? */
  loginRequired: boolean;
  /** Doporučená varianta — jen předvolba přepínače, nic nevynucuje. */
  recommendedVariant: KvizVarianta;
  updatedAt: string | null;
  updatedBy: string | null;
};

/**
 * Když se politika nedá načíst, platí přísnější varianta (přihlášení ANO) —
 * stejná hodnota jako DEFAULT sloupce v migraci. Nepřihlášený host se pošle
 * na /prihlaseni; po přihlášení projde dál i při dalším výpadku, takže
 * nevzniká smyčka.
 */
export const VYCHOZI_POLICY: QuizPolicy = {
  loginRequired: true,
  recommendedVariant: VYCHOZI_VARIANTA,
  updatedAt: null,
  updatedBy: null,
};

/** `cache()` dedupuje volání v rámci jednoho requestu (stejně jako settings). */
export const getQuizPolicy = cache(async (): Promise<QuizPolicy> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("quiz_policy")
      .select("login_required, recommended_variant, updated_at, updated_by")
      .eq("id", true)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn("[kviz] politiku nelze načíst:", error.message);
      return VYCHOZI_POLICY;
    }

    return {
      loginRequired: data.login_required !== false,
      recommendedVariant: jeVarianta(data.recommended_variant)
        ? data.recommended_variant
        : VYCHOZI_VARIANTA,
      updatedAt: data.updated_at ?? null,
      updatedBy: data.updated_by ?? null,
    };
  } catch (e) {
    console.warn("[kviz] politiku nelze načíst:", e);
    return VYCHOZI_POLICY;
  }
});

/**
 * Přepnutí politiky (interní API pro Healing). Mění jen předané klíče,
 * `updated_at` razítkuje trigger v databázi.
 */
export async function nastavitQuizPolicy(zmena: {
  loginRequired?: boolean;
  recommendedVariant?: KvizVarianta;
  updatedBy: string;
}): Promise<QuizPolicy | null> {
  const admin = createAdminClient();

  // Upsert, ne update: kdyby řádek chyběl (čerstvá databáze, ruční zásah),
  // politika se založí, místo aby zápis tiše nic nezměnil.
  const { error } = await admin.from("quiz_policy").upsert(
    {
      id: true,
      ...(zmena.loginRequired === undefined
        ? {}
        : { login_required: zmena.loginRequired }),
      ...(zmena.recommendedVariant === undefined
        ? {}
        : { recommended_variant: zmena.recommendedVariant }),
      updated_by: zmena.updatedBy.slice(0, 120),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[kviz] politiku nelze uložit:", error.message);
    return null;
  }

  // Čerstvé čtení mimo `cache()` — potřebujeme hodnoty po zápisu i s auditem.
  const { data } = await admin
    .from("quiz_policy")
    .select("login_required, recommended_variant, updated_at, updated_by")
    .eq("id", true)
    .maybeSingle();

  if (!data) return null;
  return {
    loginRequired: data.login_required !== false,
    recommendedVariant: jeVarianta(data.recommended_variant)
      ? data.recommended_variant
      : VYCHOZI_VARIANTA,
    updatedAt: data.updated_at ?? null,
    updatedBy: data.updated_by ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Dokončené varianty                                                          */
/* -------------------------------------------------------------------------- */

/** Které varianty už přihlášený host dokončil. Při chybě raději nic. */
export async function dokonceneVarianty(
  userId: string,
): Promise<KvizVarianta[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("quiz_completions")
      .select("variant")
      .eq("user_id", userId);

    if (error || !data) {
      if (error) console.warn("[kviz] dokončení nelze načíst:", error.message);
      return [];
    }
    return data
      .map((r) => r.variant)
      .filter((v): v is KvizVarianta => jeVarianta(v));
  } catch (e) {
    console.warn("[kviz] dokončení nelze načíst:", e);
    return [];
  }
}

export type VysledekNaroku =
  /** Nárok zabrán — `id` slouží k uvolnění, když zbytek odeslání selže. */
  | { stav: "ok"; id: string | null }
  /** Tuhle variantu už identita dokončila. */
  | { stav: "duplicita" }
  /** Hlídat nejde (chybí identita i tajemství pro hash) — pouštíme dál. */
  | { stav: "bez-evidence" };

/**
 * Atomicky zabere „jedno dokončení na identitu a variantu".
 *
 * Souběh řeší unikátní index v databázi (migrace 006), ne čtení před zápisem:
 * dvě současně odeslané objednávky kupónu skončí tak, že druhá dostane
 * unique violation (23505) → `duplicita`.
 *
 * Volá se PŘED založením kupónu, aby duplicitní pokus nespálil kód.
 */
export async function zabratDokonceni(vstup: {
  userId: string | null;
  contactHash: string | null;
  varianta: KvizVarianta;
  bavic: string;
}): Promise<VysledekNaroku> {
  // Anonymní host bez hashe (chybí QUIZ_CONTACT_HMAC_SECRET) — ochrana proti
  // duplicitám je best-effort, takže ho nepouštíme k ledu, jen to logujeme.
  if (!vstup.userId && !vstup.contactHash) {
    console.warn(
      "[kviz] bez QUIZ_CONTACT_HMAC_SECRET nejde hlídat duplicitní anonymní dokončení",
    );
    return { stav: "bez-evidence" };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("quiz_completions")
      .insert({
        // Identity se vylučují (check v migraci): buď účet, nebo hash kontaktu.
        user_id: vstup.userId,
        contact_hash: vstup.userId ? null : vstup.contactHash,
        variant: vstup.varianta,
        bavic: vstup.bavic,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return { stav: "duplicita" };
      console.error("[kviz] dokončení nelze zapsat:", error.message);
      // Náš výpadek nesmí hosta připravit o kupón.
      return { stav: "bez-evidence" };
    }
    return { stav: "ok", id: data?.id ?? null };
  } catch (e) {
    console.error("[kviz] dokončení nelze zapsat:", e);
    return { stav: "bez-evidence" };
  }
}

/**
 * Uvolní zabraný nárok, když odeslání selhalo až po něm — jinak by host
 * zůstal zablokovaný na variantě, kterou reálně nedokončil.
 */
export async function uvolnitDokonceni(id: string | null): Promise<void> {
  if (!id) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("quiz_completions")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[kviz] nárok nelze uvolnit:", error.message);
    }
  } catch (e) {
    console.error("[kviz] nárok nelze uvolnit:", e);
  }
}
