/**
 * Ošetření parametru `next` — musí jít o relativní cestu v rámci appky,
 * jinak by šlo appku zneužít jako open redirect.
 */
export function bezpecnyNext(
  value: string | string[] | undefined | null,
  fallback = "/",
): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return fallback;
  if (!v.startsWith("/")) return fallback;
  if (v.startsWith("//")) return fallback;
  return v;
}

/** První hodnota z parametru URL. */
export function prvni(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
