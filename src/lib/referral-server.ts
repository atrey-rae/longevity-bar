/**
 * Serverová část referral kódů — přidělení kódu a počítadlo pozvaných.
 *
 * Vše jde přes service-role klienta: `profiles` i `quiz_leads` jsou zavřené
 * RLS. Modul se NIKDY nesmí dostat do klientského bundlu (viz pojistka níže),
 * stejně jako `lib/healing-credit.ts`.
 *
 * VŠECHNY funkce jsou fail-soft: když migrace 008 ještě neproběhla nebo je
 * databáze mimo, vrací `null` / `0` a `/darek` spadne na statické QR. Sekce
 * „Dárek přátelům“ nesmí kvůli referralu zhasnout.
 */

import { normalizovatReferralKod, vygenerovatReferralKod } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase/admin";

if (typeof window !== "undefined") {
  throw new Error("lib/referral-server.ts je serverový modul — nesmí do klienta.");
}

/** Kolik nových kódů se zkusí, než to vzdáme (kolize unikátního indexu). */
const POKUSU = 5;

/**
 * Vrátí referral kód přihlášeného zákazníka; při prvním zavolání ho založí.
 *
 * `null` znamená „referral teď nejede“ — chybějící sloupec (migrace 008),
 * výpadek databáze i smazaný profil. Volající pak ukáže statické QR.
 */
export async function zajistitReferralKod(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      // Nejčastěji „column profiles.referral_code does not exist“ — migrace 008
      // ještě neběžela. Není to chyba hosta, jen dočasně žádné osobní QR.
      console.warn("[referral] kód se nepodařilo přečíst:", error.message);
      return null;
    }

    const stavajici = normalizovatReferralKod(data?.referral_code ?? null);
    if (stavajici) return stavajici;

    for (let pokus = 1; pokus <= POKUSU; pokus += 1) {
      const kod = vygenerovatReferralKod();

      // `.is("referral_code", null)` = zápis jen tehdy, když kód pořád chybí.
      // Souběžný požadavek tak nikdy nepřepíše už přidělený kód.
      const { data: radek, error: chybaZapisu } = await admin
        .from("profiles")
        .update({ referral_code: kod })
        .eq("id", userId)
        .is("referral_code", null)
        .select("referral_code")
        .maybeSingle();

      if (chybaZapisu) {
        // 23505 = kolize unikátního indexu, zkusíme jiný kód.
        if (chybaZapisu.code === "23505") continue;
        console.warn("[referral] kód se nepodařilo uložit:", chybaZapisu.message);
        return null;
      }

      const zapsany = normalizovatReferralKod(radek?.referral_code ?? null);
      if (zapsany) return zapsany;

      // Nula změněných řádků: kód mezitím přidělil jiný souběžný požadavek
      // (nebo profil neexistuje). Přečteme, co v profilu skutečně je.
      const { data: znovu } = await admin
        .from("profiles")
        .select("referral_code")
        .eq("id", userId)
        .maybeSingle();
      return normalizovatReferralKod(znovu?.referral_code ?? null);
    }

    console.warn(`[referral] ${POKUSU}× kolize kódu — host dostane statické QR.`);
    return null;
  } catch (e) {
    console.warn("[referral] databáze není dostupná:", e);
    return null;
  }
}

/**
 * Kolik kamarádů už prošlo kvízem s tímhle kódem.
 *
 * Vrací JEN počet — jména ani e-maily kamarádů se z `quiz_leads` nikam
 * nečtou, aby se z počítadla nedal poskládat cizí kontakt.
 */
export async function spocitatPozvane(kod: string | null): Promise<number> {
  const bezpecny = normalizovatReferralKod(kod);
  if (!bezpecny) return 0;

  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("quiz_leads")
      .select("id", { count: "exact", head: true })
      .eq("referral_code", bezpecny);

    if (error) {
      console.warn("[referral] počítadlo pozvaných selhalo:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.warn("[referral] počítadlo pozvaných selhalo:", e);
    return 0;
  }
}
