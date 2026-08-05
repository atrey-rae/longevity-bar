/**
 * Sekce „Dárek přátelům“ — schválené texty a cíl QR kódu.
 *
 * Texty schválil Atrey 5. 8. 2026 a NEMĚNÍ se bez jeho pokynu (hlídá
 * `scripts/check-darek-kredit.ts`). Kromě `./referral` (čistý modul bez
 * importů) tu nic dalšího být nesmí, ať soubor projde i pod `tsx`.
 */

import { sReferralem } from "./referral";

/** Kam vede QR kód i odkaz pod ním — veřejný vstup do kvízu (host `WEB`). */
export const DAREK_KVIZ_URL = "https://bar.peaceandcoco.com/kviz/web";

/** Zobrazená podoba odkazu (bez schématu, ať se vejde na mobil). */
export const DAREK_KVIZ_ODKAZ_TEXT = "bar.peaceandcoco.com/kviz/web";

/**
 * Statické PNG v `public/`. Generuje se jednorázově příkazem
 * `npx --yes qrcode -o public/qr/kviz-web.png -w 480 "<DAREK_KVIZ_URL>"` —
 * QR se tak nemusí počítat v prohlížeči a funguje i bez JS.
 */
export const DAREK_QR_SOUBOR = "/qr/kviz-web.png";

export const DAREK_NADPIS =
  "Daruj kamarádům slevu 21 % na vybraný produkt, až do konce roku!";

export const DAREK_PODTEXT =
  "Ať si jejich mikrobiom výská radostí. Ať si načtou tento QR kód a vyplní kvíz :-)";

/* -------------------------------------------------------------------------- */
/* Osobní (sledovatelné) QR                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Adresa osobního QR přihlášeného zákazníka — `…/kviz/web?od=<KOD>`.
 * Bez kódu vrací původní statickou adresu, takže dárek funguje vždycky.
 */
export function darekKvizUrl(referralKod: string | null): string {
  return sReferralem(DAREK_KVIZ_URL, referralKod);
}

/** Zobrazená podoba osobního odkazu (bez schématu). */
export function darekKvizOdkazText(referralKod: string | null): string {
  return sReferralem(DAREK_KVIZ_ODKAZ_TEXT, referralKod);
}

/** Popisek nad osobním QR — ať host pozná, že je jeho a že se počítá. */
export const DAREK_OSOBNI_QR_TITULEK = "Tvůj osobní QR kód";

/** Výzva pro nepřihlášené: statické QR funguje, ale nic nesleduje. */
export const DAREK_PRIHLASENI_VYZVA =
  "Přihlas se a dostaneš vlastní QR kód — uvidíš, kolik kamarádů přes tebe dárek dostalo.";

/**
 * Počítadlo pod osobním QR. Ukazuje JEN číslo — jména ani e-maily kamarádů
 * se nikde nezobrazují.
 */
export function darekPocitadloText(pozvanych: number): string {
  if (pozvanych <= 0) {
    return "Tvým QR kódem zatím neprošel nikdo. Buď první, kdo kamarádům udělá radost!";
  }
  if (pozvanych === 1) return "Tvým QR kódem už prošel 1 kamarád. Díky!";
  if (pozvanych <= 4) {
    return `Tvým QR kódem už prošli ${pozvanych} kamarádi. Díky!`;
  }
  return `Tvým QR kódem už prošlo ${pozvanych} kamarádů. Díky!`;
}
