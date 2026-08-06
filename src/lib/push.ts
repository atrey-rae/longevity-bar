/**
 * Odesílání oznámení (Web Push).
 *
 * Tři pravidla, na kterých modul stojí:
 *
 *   1. SERVEROVÝ modul — nese PRIVÁTNÍ VAPID klíč a nesmí se dostat do
 *      klientského bundlu (stejná ruční pojistka jako v `lib/healing-credit.ts`).
 *   2. NIKDY NEHÁZÍ. Oznámení je doplněk, ne hlavní akce. Když se nepodaří
 *      odeslat, host o tom nesmí vědět a hlavní akce (razítko, objednávka)
 *      musí doběhnout. Proto všechny cesty vracejí souhrn, ne výjimku.
 *   3. MRTVÉ ODBĚRY SE UKLÍZEJÍ. Push služba na zrušený odběr odpoví 404/410 —
 *      takový řádek se rovnou maže, jinak by databáze rok co rok narůstala
 *      o zařízení, která už neexistují.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/push.ts nese privátní VAPID klíč a nesmí do klientského bundlu.",
  );
}

import webpush from "web-push";

import { DEFAULT_LANG, type Lang } from "./i18n/lang";
import { jePushNakonfigurovany } from "./push-config";
import { createAdminClient } from "./supabase/admin";

/** Kolik oznámení posíláme najednou. Víc = riziko rate limitu push služeb. */
const DAVKA = 50;

/** Komu se posílá. */
export type PushFiltr = "vsichni" | "prihlaseni";

export type Oznameni = {
  titulek: string;
  text: string;
  /** Relativní cesta v appce, kam oznámení vede. */
  url?: string;
  tag?: string;
};

export type VysledekOdeslani = {
  odeslano: number;
  smazano: number;
  selhalo: number;
};

/** Nastaví VAPID údaje. Vrací `false`, když konfigurace chybí. */
function pripravit(): boolean {
  if (!jePushNakonfigurovany()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

/** Bezpečná relativní cesta — do oznámení nikdy nepustíme cizí doménu. */
function bezpecnaUrl(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/";
  return url;
}

type Radek = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: string;
};

/** Rozdělí pole na dávky po `DAVKA` kusech. */
function davky<T>(pole: T[]): T[][] {
  const vysledek: T[][] = [];
  for (let i = 0; i < pole.length; i += DAVKA) {
    vysledek.push(pole.slice(i, i + DAVKA));
  }
  return vysledek;
}

/**
 * Pošle oznámení. NIKDY nehází — při jakémkoli problému vrací nuly.
 *
 * `text`/`titulek` můžou být buď řetězec (stejný pro všechny), nebo funkce
 * jazyka: host, který si appku přepnul do angličtiny, dostane anglické
 * oznámení, i když ho odesílá česká administrace.
 */
export async function poslatOznameni(vstup: {
  filtr: PushFiltr;
  /** Když je vyplněné, pošle se JEN těmhle uživatelům (automatická oznámení). */
  userIds?: string[];
  titulek: string | ((lang: Lang) => string);
  text: string | ((lang: Lang) => string);
  url?: string;
  tag?: string;
}): Promise<VysledekOdeslani> {
  const prazdny: VysledekOdeslani = { odeslano: 0, smazano: 0, selhalo: 0 };
  if (!pripravit()) return prazdny;

  try {
    const admin = createAdminClient();
    let dotaz = admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, lang");

    if (vstup.userIds) {
      if (vstup.userIds.length === 0) return prazdny;
      dotaz = dotaz.in("user_id", vstup.userIds);
    } else if (vstup.filtr === "prihlaseni") {
      dotaz = dotaz.not("user_id", "is", null);
    }

    const { data, error } = await dotaz;
    if (error || !data) {
      console.warn("[push] odběry se nepodařilo načíst:", error?.message);
      return prazdny;
    }

    const url = bezpecnaUrl(vstup.url);
    const vysledek: VysledekOdeslani = { odeslano: 0, smazano: 0, selhalo: 0 };
    const kSmazani: string[] = [];

    for (const davka of davky(data as Radek[])) {
      const vysledky = await Promise.allSettled(
        davka.map(async (radek) => {
          const lang: Lang = radek.lang === "en" ? "en" : DEFAULT_LANG;
          const telo = JSON.stringify({
            title: typeof vstup.titulek === "function" ? vstup.titulek(lang) : vstup.titulek,
            body: typeof vstup.text === "function" ? vstup.text(lang) : vstup.text,
            url,
            ...(vstup.tag ? { tag: vstup.tag } : {}),
          });
          try {
            await webpush.sendNotification(
              {
                endpoint: radek.endpoint,
                keys: { p256dh: radek.p256dh, auth: radek.auth },
              },
              telo,
            );
            return { id: radek.id, mrtvy: false };
          } catch (e) {
            // 404/410 = odběr už neexistuje. Není to chyba, je to úklid.
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) return { id: radek.id, mrtvy: true };
            throw e;
          }
        }),
      );

      for (const v of vysledky) {
        if (v.status === "rejected") {
          vysledek.selhalo += 1;
          continue;
        }
        if (v.value.mrtvy) kSmazani.push(v.value.id);
        else vysledek.odeslano += 1;
      }
    }

    if (kSmazani.length > 0) {
      const smazani = await admin
        .from("push_subscriptions")
        .delete()
        .in("id", kSmazani);
      if (!smazani.error) vysledek.smazano = kSmazani.length;
    }

    return vysledek;
  } catch (e) {
    // Oznámení nikdy neshodí volajícího — jen se zaloguje, že nedorazilo.
    console.warn("[push] odeslání selhalo:", e);
    return prazdny;
  }
}

/**
 * Fail-soft obal pro automatická oznámení uvnitř hlavních akcí.
 *
 * Připsání razítka ani objednávka z kreditu se NIKDY nesmí kvůli oznámení
 * zdržet ani spadnout — proto se výsledek nečeká a výjimka se polkne.
 */
export function poslatNaPozadi(vstup: Parameters<typeof poslatOznameni>[0]): void {
  void poslatOznameni(vstup).catch(() => undefined);
}
