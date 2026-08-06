/**
 * Sdílené drobnosti kreditní obrazovky, které potřebuje SERVER i KLIENT.
 *
 * Schválně mimo `lib/healing-credit.ts` — ten nese sdílený secret a v klientském
 * bundlu vyhazuje výjimku. Tenhle modul je izomorfní a smí se importovat
 * odkudkoli.
 */

import { LONGEVITY_BAR_CATALOG, type CatalogCategory } from "./catalog-longevity";

/**
 * Id sekce s živými vstupenkami na `/kredit`.
 *
 * Server ho vykreslí na sekci, klient na něj po odeslání objednávky odscrolluje.
 * Kdyby se obě strany rozešly, host by po objednání zase nic neviděl — proto je
 * to konstanta na jednom místě a hlídá ji `check-darek-kredit.ts`.
 */
export const VSTUPENKY_ID = "kredit-vstupenky";

/** Kolik zálohovaných kelímků smí obsluha u jedné objednávky nanejvýš zadat. */
export const MAX_ZALOH = 20;

/** Kategorie festivalového katalogu, které se vydávají v zálohovaném kelímku. */
const NAPOJOVE_KATEGORIE: readonly CatalogCategory[] = [
  "Studené nápoje",
  "Káva & kakao",
];

/** Porovnávací klíč názvu — bez diakritiky, velikosti písmen a dvojitých mezer. */
function klic(nazev: string): string {
  return nazev
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const KATEGORIE_PODLE_NAZVU = new Map<string, CatalogCategory>(
  LONGEVITY_BAR_CATALOG.map((polozka) => [klic(polozka.name), polozka.category]),
);

/**
 * Předvyplněný počet záloh = kolik kusů z objednávky odchází v kelímku.
 *
 * Nápoj se pozná podle festivalového katalogu (`Studené nápoje`, `Káva & kakao`).
 * Když se ANI JEDNA položka objednávky v katalogu nenajde, nápoj poznat nejde —
 * pak se vrací celkový počet kusů, ať má obsluha z čeho ubírat. Jídlo a retail,
 * které se v katalogu najdou, se do záloh nepočítají.
 *
 * Je to jen NÁVRH. Poslední slovo má vždy pokladní, která číslo před výdejem
 * upraví.
 */
export function predvyplneneZalohy(
  items: readonly { n: string; qty: number }[],
): number {
  let napoje = 0;
  let celkem = 0;
  let poznanoAlesponJedno = false;

  for (const radek of items) {
    const kusu = Number.isFinite(radek.qty) ? Math.max(0, Math.trunc(radek.qty)) : 0;
    celkem += kusu;
    const kategorie = KATEGORIE_PODLE_NAZVU.get(klic(radek.n));
    if (kategorie === undefined) continue;
    poznanoAlesponJedno = true;
    if (NAPOJOVE_KATEGORIE.includes(kategorie)) napoje += kusu;
  }

  return Math.min(MAX_ZALOH, poznanoAlesponJedno ? napoje : celkem);
}

/**
 * Ořízne počet záloh na celé číslo 0–`MAX_ZALOH`.
 * `null` = hodnota nebyla poslána (starý klient) nebo nedává smysl.
 */
export function normalizovatZalohy(hodnota: unknown): number | null {
  if (hodnota === undefined || hodnota === null) return null;
  const cislo = typeof hodnota === "string" ? Number(hodnota) : hodnota;
  if (typeof cislo !== "number" || !Number.isInteger(cislo)) return null;
  if (cislo < 0 || cislo > MAX_ZALOH) return null;
  return cislo;
}
