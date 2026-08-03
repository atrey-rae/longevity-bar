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
