/**
 * Přijme jen QR adresu této aplikace s jediným neprázdným segmentem tokenu.
 * Platnost tokenu a dne nadále ověřuje výhradně serverová awardStamp().
 */
export function parseLoyaltyScanTarget(
  raw: string,
  currentOrigin: string,
): string | null {
  try {
    const expectedOrigin = new URL(currentOrigin).origin;
    const url = new URL(raw.trim());

    if (url.origin !== expectedOrigin || url.search || url.hash) return null;

    const match = /^\/scan\/([^/]+)$/.exec(url.pathname);
    if (!match) return null;

    const token = decodeURIComponent(match[1]);
    if (!token || token.includes("/") || token.includes("\\")) return null;

    return `/scan/${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}
