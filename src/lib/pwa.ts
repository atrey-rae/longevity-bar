/**
 * Detekce prostředí PWA — jedno místo pro instalaci i pro oznámení.
 *
 * Obojí se ptá na totéž („běžíme z plochy?", „je to iOS?") a dvě kopie by se
 * rozešly. Funkce se smí volat JEN v prohlížeči (uvnitř efektu), na serveru
 * vracejí `false`.
 */

interface NavigatorSeStandalone extends Navigator {
  standalone?: boolean;
}

/** Běží appka z plochy (standalone), nebo v záložce prohlížeče? */
export function jeNaPlose(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorSeStandalone).standalone === true
  );
}

/** iPhone/iPad, včetně iPadu, který se tváří jako Mac. */
export function jeIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Umí tenhle prohlížeč Web Push TEĎKA?
 *
 * Na iOS je to ta podstatná past: Safari umí Web Push až od iOS 16.4 a POUZE
 * když je appka přidaná na plochu. V záložce Safari `PushManager` sice
 * existuje, ale `subscribe()` skončí chybou — proto se host na iOS musí
 * nejdřív dostat na plochu a teprve pak mu má smysl oznámení nabízet.
 */
export function umiPush(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  return true;
}

/** Potřebuje host na iOS nejdřív přidat appku na plochu? */
export function potrebujeNaPlochuKvuliPush(): boolean {
  return jeIos() && !jeNaPlose();
}

/**
 * Převod base64url VAPID klíče na `Uint8Array`, jak ho chce `subscribe()`.
 * (Prohlížeče stále nepřijímají řetězec.)
 */
export function klicDoPole(base64Url: string): Uint8Array<ArrayBuffer> {
  const doplnek = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + doplnek).replace(/-/g, "+").replace(/_/g, "/");
  const syrove = atob(base64);
  // Explicitní `ArrayBuffer` (ne jen délka): `applicationServerKey` nepřijímá
  // `Uint8Array` nad `SharedArrayBuffer`, což je jinak platný výchozí typ.
  const pole = new Uint8Array(new ArrayBuffer(syrove.length));
  for (let i = 0; i < syrove.length; i += 1) pole[i] = syrove.charCodeAt(i);
  return pole;
}
