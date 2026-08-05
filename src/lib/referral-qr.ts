/**
 * Vykreslení osobního QR kódu na serveru.
 *
 * Osobní QR nejde předgenerovat do `public/` jako statické `kviz-web.png` —
 * každý zákazník má v URL svůj kód. Počítá se proto v server komponentě
 * `/darek` a do prohlížeče letí hotový `data:` URI. Balík `qrcode` se tím
 * NIKDY nedostane do klientského bundlu (hlídá `scripts/check-referral.ts`).
 */

import { toDataURL } from "qrcode";

if (typeof window !== "undefined") {
  throw new Error("lib/referral-qr.ts je serverový modul — nesmí do klienta.");
}

/** Stejná hrana jako statické `public/qr/kviz-web.png`. */
export const QR_VELIKOST = 480;

/**
 * PNG data URI s QR kódem, nebo `null` když se vykreslení nepovede.
 *
 * Fail-soft: `/darek` pak ukáže statické QR na `/kviz/web`, což je pořád
 * funkční dárek — jen bez sledování.
 */
export async function qrDataUrl(url: string): Promise<string | null> {
  try {
    return await toDataURL(url, {
      width: QR_VELIKOST,
      margin: 2,
      // `M` zvládne ~15 % poškození — dost na promáčklý mobil ve slunci,
      // a QR zůstane řídké i s delší URL než u statického kódu.
      errorCorrectionLevel: "M",
      color: { dark: "#0b201dff", light: "#ffffffff" },
    });
  } catch (e) {
    console.warn("[referral] QR se nepodařilo vykreslit:", e);
    return null;
  }
}
