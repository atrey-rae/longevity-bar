/** Pomocníci pro české skloňování v UI. */

function tvar(n: number, jedno: string, dva: string, pet: string): string {
  const abs = Math.abs(Math.trunc(n));
  if (abs === 1) return jedno;
  if (abs >= 2 && abs <= 4) return dva;
  return pet;
}

/** 1 razítko · 3 razítka · 5 razítek */
export function razitka(n: number): string {
  return `${n} ${tvar(n, "razítko", "razítka", "razítek")}`;
}

/** 1 minutu · 3 minuty · 5 minut */
export function minuty(n: number): string {
  return `${n} ${tvar(n, "minutu", "minuty", "minut")}`;
}

/** 1 odměna · 3 odměny · 5 odměn */
export function odmeny(n: number): string {
  return `${n} ${tvar(n, "odměna", "odměny", "odměn")}`;
}

/** 1 zákazník · 3 zákazníci · 5 zákazníků */
export function zakaznici(n: number): string {
  return `${n} ${tvar(n, "zákazník", "zákazníci", "zákazníků")}`;
}

/**
 * Česká sazba pro UI — vymění obyčejnou mezeru za nezlomitelnou tam, kde by
 * zlom vypadal jako chyba („21 %“ na dvou řádcích, rozpadlé datum).
 * Text se tím NEMĚNÍ, jen se jinak láme.
 */
/** Nezlomitelná mezera (U+00A0). */
const NBSP = "\u00A0";

const KORUNY = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });

/** 250 Kč — s nezlomitelnou mezerou, ať se částka nikdy nerozpadne přes řádek. */
export function korun(castka: number): string {
  const cislo = Number.isFinite(castka) ? castka : 0;
  return `${KORUNY.format(Math.round(cislo))}${NBSP}Kč`;
}

export function sazba(text: string): string {
  return text
    .replace(/(\d)\s(%|‰|Kč|ml|kg|g|l|ks)(?![\p{L}])/gu, `$1${NBSP}$2`)
    .replace(/(\d{1,2}\.)\s(\d{1,2}\.)\s(\d{4})/g, `$1${NBSP}$2${NBSP}$3`);
}
