/**
 * Nastavení varianty kvízu per bavič (tabulka `quiz_hosts`, migrace 004).
 *
 * Zdroj pravdy je Supabase; healing.app do něj sahá jen přes interní API
 * bar.app. Modul je serverový (service-role klient) — NEIMPORTOVAT do client
 * komponenty. Repo nemá balíček `server-only`, tak si stejnou pojistku (pád
 * hned při importu do prohlížeče, ne jen komentář) děláme ručně níž.
 */

import { DEFAULT_QUIZ_VARIANT, type QuizVariant } from "./kviz";
import { createAdminClient } from "./supabase/admin";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/kviz-hosts.ts používá service-role klienta a nesmí se dostat do client bundlu.",
  );
}

/**
 * Jakou variantu kvízu má bavič nastavenou.
 *
 * Jakékoli selhání (nespuštěná migrace, chybějící tabulka, výpadek sítě,
 * neznámý kód) končí fallbackem na `microbiom` — kvíz u stánku nesmí padnout
 * kvůli konfiguraci, která je jen preference baviče.
 */
export async function getHostQuizVariant(bavicKod: string): Promise<QuizVariant> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("quiz_hosts")
      .select("variant")
      .eq("code", bavicKod)
      .maybeSingle();

    if (error) {
      console.warn("[kviz] varianta baviče se nenačetla:", error.message);
      return DEFAULT_QUIZ_VARIANT;
    }
    return data?.variant === "profil" ? "profil" : DEFAULT_QUIZ_VARIANT;
  } catch (e) {
    console.warn("[kviz] quiz_hosts není dostupná:", e);
    return DEFAULT_QUIZ_VARIANT;
  }
}
