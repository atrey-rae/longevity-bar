/**
 * Přehled přihlášených zákazníků pro interní report (zrcadlení do Google Sheetu).
 *
 * Čte se výhradně service-role klientem — `auth.users` i všechny tabulky jsou
 * jinak zavřené. Modul je serverový a NIKDY nesmí do klientského bundlu
 * (pojistka níže, stejný vzor jako `lib/healing-credit.ts`).
 *
 * Data se spojují v paměti: na festivalu jde o stovky řádků, takže jeden dotaz
 * na tabulku a `Map` je levnější i čitelnější než joiny přes PostgREST.
 */

import { isInternalAuthEmail } from "@/lib/phone-auth";
import { normalizovatReferralKod } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuizVariant } from "@/lib/types";

if (typeof window !== "undefined") {
  throw new Error("lib/report-users.ts je serverový modul — nesmí do klienta.");
}

/** Jeden řádek reportu = jeden účet v `auth.users`. */
export type ReportRadekUzivatele = {
  /** Kdy účet vznikl (ISO 8601, `auth.users.created_at`). */
  signup: string;
  jmeno: string | null;
  /** E.164 z `phone_identities`, jinak z profilu. */
  telefon: string | null;
  /** Skutečný kontaktní e-mail. Interní alias telefonního loginu = `null`. */
  email: string | null;
  /** Poslední přihlášení (ISO 8601), `null` když se ještě nepřihlásil. */
  posledni: string | null;
  /** Dokončené varianty kvízu, např. `["microbiom", "profil"]`. */
  kvizy: QuizVariant[];
  razitka: number;
  odmeny: { dostupne: number; vydane: number };
  /** Osobní referral kód (migrace 008), `null` dokud nebyl potřeba. */
  referral_code: string | null;
  /** Kolik kvízových leadů přišlo přes jeho osobní QR. */
  rozdane: number;
};

/** Supabase vrací max. 1000 účtů na stránku; víc než pár stovek nečekáme. */
const STRANKA = 1000;
/** Pojistka proti nekonečné smyčce, kdyby `listUsers` přestal vracet prázdno. */
const MAX_STRANEK = 10;

/** Prázdný řetězec i samé mezery se v reportu mají chovat jako `null`. */
function textNeboNull(hodnota: unknown): string | null {
  if (typeof hodnota !== "string") return null;
  const orezany = hodnota.trim();
  return orezany === "" ? null : orezany;
}

/** První e-mail, který není interní alias telefonního loginu. */
function kontaktniEmail(...kandidati: unknown[]): string | null {
  for (const kandidat of kandidati) {
    const email = textNeboNull(kandidat);
    if (email && !isInternalAuthEmail(email)) return email.toLowerCase();
  }
  return null;
}

/**
 * Sestaví report o všech uživatelích, seřazený podle data registrace.
 *
 * Chybějící sloupec `referral_code` (migrace 008 ještě neproběhla) report
 * nepoloží — `referral_code` a `rozdane` prostě zůstanou prázdné.
 */
export async function sestavitReportUzivatelu(): Promise<ReportRadekUzivatele[]> {
  const admin = createAdminClient();

  /* --- auth.users ---------------------------------------------------------- */
  const ucty: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[] = [];
  for (let stranka = 1; stranka <= MAX_STRANEK; stranka += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: stranka,
      perPage: STRANKA,
    });
    if (error) throw new Error(`auth.users: ${error.message}`);
    const davka = data?.users ?? [];
    for (const u of davka) {
      ucty.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (davka.length < STRANKA) break;
  }

  /* --- Tabulky ------------------------------------------------------------- */
  // `profiles` se čte přes `*`: kdyby sloupec `referral_code` ještě neexistoval,
  // vyjmenovaný select by spadl, kdežto `*` prostě vrátí zbytek.
  const [profilyRes, telefonyRes, razitkaRes, odmenyRes, kvizyRes] = await Promise.all([
    admin.from("profiles").select("*"),
    admin.from("phone_identities").select("phone_e164, user_id"),
    admin.from("stamps").select("user_id"),
    admin.from("rewards").select("user_id, state"),
    admin.from("quiz_completions").select("user_id, quiz_variant, status"),
  ]);

  for (const [tabulka, res] of [
    ["profiles", profilyRes],
    ["phone_identities", telefonyRes],
    ["stamps", razitkaRes],
    ["rewards", odmenyRes],
    ["quiz_completions", kvizyRes],
  ] as const) {
    if (res.error) throw new Error(`${tabulka}: ${res.error.message}`);
  }

  const profily = new Map(
    (profilyRes.data ?? []).map((p) => [p.id, p]),
  );
  const telefony = new Map(
    (telefonyRes.data ?? []).map((t) => [t.user_id, t.phone_e164]),
  );

  const razitka = new Map<string, number>();
  for (const radek of razitkaRes.data ?? []) {
    razitka.set(radek.user_id, (razitka.get(radek.user_id) ?? 0) + 1);
  }

  const odmeny = new Map<string, { dostupne: number; vydane: number }>();
  for (const radek of odmenyRes.data ?? []) {
    const soucet = odmeny.get(radek.user_id) ?? { dostupne: 0, vydane: 0 };
    if (radek.state === "redeemed") soucet.vydane += 1;
    else soucet.dostupne += 1;
    odmeny.set(radek.user_id, soucet);
  }

  const kvizy = new Map<string, Set<QuizVariant>>();
  for (const radek of kvizyRes.data ?? []) {
    if (radek.status !== "completed" || !radek.user_id) continue;
    const varianty = kvizy.get(radek.user_id) ?? new Set<QuizVariant>();
    varianty.add(radek.quiz_variant);
    kvizy.set(radek.user_id, varianty);
  }

  /* --- Rozdané kupóny přes osobní QR --------------------------------------- */
  // Jediné místo, které smí selhat bez pádu: před migrací 008 sloupec neexistuje.
  const rozdane = new Map<string, number>();
  const leadyRes = await admin.from("quiz_leads").select("referral_code");
  if (leadyRes.error) {
    console.warn(
      "[report] quiz_leads.referral_code se nepodařilo přečíst (migrace 008?):",
      leadyRes.error.message,
    );
  } else {
    for (const radek of leadyRes.data ?? []) {
      const kod = normalizovatReferralKod(radek.referral_code);
      if (!kod) continue;
      rozdane.set(kod, (rozdane.get(kod) ?? 0) + 1);
    }
  }

  /* --- Složení řádků -------------------------------------------------------- */
  const radky = ucty.map((ucet): ReportRadekUzivatele => {
    const profil = profily.get(ucet.id);
    const referralKod = normalizovatReferralKod(profil?.referral_code ?? null);

    return {
      signup: ucet.created_at,
      jmeno: textNeboNull(profil?.full_name),
      telefon: telefony.get(ucet.id) ?? textNeboNull(profil?.phone),
      email: kontaktniEmail(ucet.email, profil?.email),
      posledni: ucet.last_sign_in_at,
      kvizy: [...(kvizy.get(ucet.id) ?? [])].sort(),
      razitka: razitka.get(ucet.id) ?? 0,
      odmeny: odmeny.get(ucet.id) ?? { dostupne: 0, vydane: 0 },
      referral_code: referralKod,
      rozdane: referralKod ? (rozdane.get(referralKod) ?? 0) : 0,
    };
  });

  radky.sort((a, b) => a.signup.localeCompare(b.signup));
  return radky;
}
