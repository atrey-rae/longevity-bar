/**
 * Práce s časem v časové zóně festivalu (Europe/Prague).
 * Server běží na Vercelu v UTC — „dnešek“ se musí počítat vždy pražsky,
 * jinak by se den QR tokenu přepnul o půlnoci UTC (tj. ve 2:00 ráno v ČR).
 */

export const TZ = "Europe/Prague";

/** Posun zóny vůči UTC v ms pro daný okamžik (kladný pro ČR). */
function tzOffsetMs(instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/** Datum v Praze jako `YYYY-MM-DD`. */
export function pragueDateString(instant: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(instant); // en-CA → YYYY-MM-DD
}

/** UTC okamžik pražské půlnoci daného dne. */
export function pragueDayStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  let ts = guess - tzOffsetMs(new Date(guess));
  ts = guess - tzOffsetMs(new Date(ts)); // druhá iterace kvůli přechodu času
  return new Date(ts);
}

/** Posun kalendářního data (`YYYY-MM-DD`) o N dní. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Rozsah pražského dne jako UTC okamžiky (start včetně, end mimo). */
export function pragueDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: pragueDayStart(dateStr),
    end: pragueDayStart(addDays(dateStr, 1)),
  };
}

/**
 * Locale pro `Intl` podle jazyka rozhraní. Angličtina jede na `en-GB`: den
 * napřed a 24hodinový čas, tedy stejné pořadí jako české formáty — host u baru
 * nemusí přepínat hlavu mezi „8. 14.“ a „14. 8.“.
 */
const LOCALE: Record<string, string> = { cs: "cs-CZ", en: "en-GB" };

function locale(lang: string | undefined): string {
  return LOCALE[lang ?? "cs"] ?? "cs-CZ";
}

/** „14. 8. 2026“ */
export function formatCzechDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

/** „pátek 14. 8. 2026“ */
export function formatCzechDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "UTC",
    weekday: "long",
  }).format(dt);
  return `${weekday} ${formatCzechDate(dateStr)}`;
}

/**
 * „14. 8. 2026 18:42“ v pražském čase.
 *
 * `lang` je volitelný a výchozí `"cs"`, aby administrace i starší volání
 * zůstaly beze změny; zákaznické obrazovky ho předávají podle zvoleného jazyka.
 */
export function formatCzechDateTime(
  value: string | Date | null,
  lang: string = "cs",
): string {
  if (!value) return "—";
  const dt = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

/** Datum bez času podle jazyka rozhraní — „14. 8. 2026“ / „14/08/2026“. */
export function formatDate(dateStr: string, lang: string = "cs"): string {
  if (lang === "cs") return formatCzechDate(dateStr);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** „18:42“ v pražském čase. */
export function formatCzechTime(value: string | Date | null): string {
  if (!value) return "—";
  const dt = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}
