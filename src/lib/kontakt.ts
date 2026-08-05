import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Normalizace kontaktu a jeho pseudonymizace.
 *
 * Serverové funkce — importovat jen v server actions, route handlerech
 * a v kontrolních skriptech (`node:crypto`).
 */

/**
 * Telefon do kanonického tvaru `+420601123456`.
 *
 * 9 číslic bez předvolby bereme jako české číslo. `null` = nepoužitelný vstup.
 * Stejné pravidlo jako v `app/actions.ts` — kdyby se měnilo, musí se změnit
 * na obou místech, jinak přestanou sedět hashe kontaktů.
 */
export function normalizovatTelefon(vstup: string): string | null {
  const cislice = vstup.trim().replace(/[\s()./-]/g, "");
  if (!/^\+?\d{9,15}$/.test(cislice)) return null;
  if (cislice.startsWith("+")) return cislice;
  return cislice.length === 9 ? `+420${cislice}` : `+${cislice}`;
}

/** E-mail do kanonického tvaru (trim + lowercase). `null` = neplatný. */
export function normalizovatEmail(vstup: string): string | null {
  const cisty = vstup.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cisty)) return null;
  return cisty;
}

/**
 * Pseudonym kontaktu pro ochranu proti duplicitám u anonymního kvízu.
 *
 * HMAC-SHA256 z normalizovaného e-mailu a telefonu — do databáze se tak nikdy
 * nedostane holý kontakt jako klíč a bez tajemství nejde hash zpětně dopočítat
 * ze seznamu e-mailů.
 *
 * Vrací `null`, když:
 *   · chybí `QUIZ_CONTACT_HMAC_SECRET` (ochrana je best-effort — bez tajemství
 *     se raději neuloží nic, než aby vznikl slabý hash), nebo
 *   · kontakt neprojde normalizací.
 *
 * Volající musí `null` brát jako „duplicity neumíme hlídat" a pustit hosta dál.
 */
export function hashKontaktu(email: string, telefon: string): string | null {
  const tajemstvi = process.env.QUIZ_CONTACT_HMAC_SECRET;
  if (!tajemstvi || tajemstvi.trim() === "") return null;

  const cistyEmail = normalizovatEmail(email);
  const cistyTelefon = normalizovatTelefon(telefon);
  if (!cistyEmail || !cistyTelefon) return null;

  return createHmac("sha256", tajemstvi.trim())
    .update(`${cistyEmail}|${cistyTelefon}`)
    .digest("hex");
}

/**
 * Porovnání tajemství v konstantním čase (bearer token interního API).
 * Délky se porovnávají napřed — `timingSafeEqual` na různě dlouhých bufferech
 * vyhazuje výjimku.
 */
export function shodujeSeTajemstvi(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
