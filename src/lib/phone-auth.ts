export const PIN_TTL_MS = 10 * 60 * 1000;
export const MAX_PIN_ATTEMPTS = 5;
export const PHONE_RATE_WINDOW_MS = 15 * 60 * 1000;
export const PHONE_RATE_MAX = 3;
export const IP_RATE_MAX = 20;

const DIGITS = /^\d+$/;

/** Normalizuje český i explicitní mezinárodní telefon do E.164. */
export function normalizeCzechPhone(value: string): string {
  let raw = value.trim().replace(/[\s().\/-]/g, "");
  if (raw.startsWith("00")) raw = `+${raw.slice(2)}`;
  const explicitPlus = raw.startsWith("+");
  const digits = explicitPlus ? raw.slice(1) : raw;
  if (!DIGITS.test(digits)) throw new TypeError("Telefon má neplatné znaky.");
  if (!explicitPlus && digits.length === 9) return `+420${digits}`;
  if (digits.length < 8 || digits.length > 15 || (!explicitPlus && digits.startsWith("0"))) {
    throw new TypeError("Telefon má neplatnou délku.");
  }
  return `+${digits}`;
}

function secureRandom(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0];
}

export function generateFourDigitCode(random: () => number = secureRandom): string {
  const value = Math.abs(Math.trunc(Number(random()) || 0)) % 10_000;
  return String(value).padStart(4, "0");
}

export function smsText(code: string): string {
  return `Tvuj kod pro Longevity Bar je ${code}. Tak ziskej co nejvic odmen! WILD&COCO`;
}

export function isInternalAuthEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith("@auth.longevity.invalid"));
}

export function isValidEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !isInternalAuthEmail(value);
}
