/**
 * Sledovatelné osobní QR — referral kód zákazníka.
 *
 * Zákazník si v sekci „Dárek přátelům“ ukáže QR, které vede na
 * `…/kviz/web?od=<KOD>`. Kód je jediná stopa, podle které se pozná, od koho
 * kamarád kupón dostal — do `quiz_leads` se z něj neukládá nic dalšího a
 * kamarád se nikdy nedozví, komu se počítadlo zvýšilo.
 *
 * Modul je ZÁMĚRNĚ bez importů (běží i pod `tsx` v kontrolních skriptech) a
 * čistě synchronní — všechno kolem databáze je v `lib/referral-server.ts`.
 */

/**
 * Abeceda kódu: A–Z a 2–9 bez znaků, které si lidi pletou (`I`, `O`, `0`, `1`).
 * Přesně 32 znaků, takže `bajt % 32` je rovnoměrné rozdělení bez zkreslení.
 */
export const REFERRAL_ABECEDA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Délka nově generovaného kódu (32^8 ≈ 1,1·10^12 možností). */
export const REFERRAL_DELKA = 8;

/** Rozsah, který se ještě přijme z URL — starší i budoucí délky kódů. */
export const REFERRAL_MIN_DELKA = 4;
export const REFERRAL_MAX_DELKA = 12;

/** Název parametru v URL. Česky, ať je odkaz čitelný: `?od=ABCD2345`. */
export const REFERRAL_PARAM = "od";

/**
 * Delší vstup se ani nezkouší normalizovat — brání tomu, aby se `toUpperCase()`
 * pouštěl na megabajtový řetězec z podvrženého odkazu.
 */
const MAX_VSTUP = 64;

const PLATNY_KOD = new RegExp(
  `^[A-HJ-NP-Z2-9]{${REFERRAL_MIN_DELKA},${REFERRAL_MAX_DELKA}}$`,
);

/**
 * Očistí kód z URL, formuláře nebo databáze.
 *
 * Vrací `null` úplně na všechno, co neodpovídá abecedě a délce — SQL injection,
 * diakritiku, emoji, dlouhé řetězce i pole. Volající pak referral prostě
 * ignoruje; host o tom nesmí vidět ani chybu (kvíz musí projít i s rozbitým
 * odkazem od kamaráda).
 */
export function normalizovatReferralKod(vstup: unknown): string | null {
  if (typeof vstup !== "string") return null;
  if (vstup.length > MAX_VSTUP) return null;
  const kod = vstup.trim().toUpperCase();
  return PLATNY_KOD.test(kod) ? kod : null;
}

/**
 * Nový náhodný kód. `crypto.getRandomValues` je ve Web Crypto API i v Node 18+,
 * takže funguje na Vercelu i pod `tsx`. Kolizi řeší unikátní index v databázi
 * a opakovaný pokus v `lib/referral-server.ts`.
 */
export function vygenerovatReferralKod(): string {
  const bajty = crypto.getRandomValues(new Uint8Array(REFERRAL_DELKA));
  let kod = "";
  for (const bajt of bajty) {
    kod += REFERRAL_ABECEDA[bajt % REFERRAL_ABECEDA.length];
  }
  return kod;
}

/**
 * Přilepí `?od=<KOD>` na základní adresu kvízu.
 *
 * Bez kódu (nepřihlášený host, migrace 008 ještě neproběhla) vrací adresu
 * beze změny — statické QR tak zůstává platné.
 */
export function sReferralem(zakladniUrl: string, kod: string | null): string {
  const bezpecny = normalizovatReferralKod(kod);
  if (!bezpecny) return zakladniUrl;
  const oddelovac = zakladniUrl.includes("?") ? "&" : "?";
  return `${zakladniUrl}${oddelovac}${REFERRAL_PARAM}=${bezpecny}`;
}
