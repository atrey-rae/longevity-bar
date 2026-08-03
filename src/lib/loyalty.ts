/**
 * ČISTÁ VĚRNOSTNÍ LOGIKA — bez závislosti na databázi, síti nebo Reactu.
 *
 * Pravidla (viz ZADANI.md §1 a §7):
 *  - 1 nákup = 1 razítko, 4 razítka = 1 odměna
 *  - kategorie odměny se odvozuje z pořadí odměny: tier_index % 3
 *      0 → cocofir, 1 → kokosová voda, 2 → drink
 *  - dostupná razítka = počet razítek − 4 × počet odměn
 *  - jakmile dostupná ≥ 4 a neexistuje odměna ve stavu ready/selected,
 *    server založí novou odměnu
 *  - po 3. odměně se cyklus buď opakuje (repeat_cycle = true),
 *    nebo končí poděkováním (repeat_cycle = false)
 */

import type { ProductCategory } from "./types";

/** Kolik razítek je potřeba na jednu odměnu. */
export const STAMPS_PER_TIER = 4;

/** Kolik tierů má jeden cyklus. */
export const TIER_COUNT = 3;

/** Kategorie v pořadí tierů. Index = tier_index % TIER_COUNT. */
export const CATEGORIES: readonly ProductCategory[] = [
  "cocofir",
  "coco_water",
  "drink",
] as const;

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  cocofir: "Cocofir 250 ml",
  coco_water: "Kokosová voda",
  drink: "Drink dle výběru",
};

export const CATEGORY_LABEL_LONG: Record<ProductCategory, string> = {
  cocofir: "Cocofir 250 ml — libovolná příchuť",
  coco_water: "Kokosová voda — libovolná varianta",
  drink: "Drink — libovolný nápoj z nabídky",
};

export const CATEGORY_EMOJI: Record<ProductCategory, string> = {
  cocofir: "🥥",
  coco_water: "💧",
  drink: "🍹",
};

/**
 * Kategorie odměny podle jejího pořadí u uživatele (0-based).
 * Funguje i pro záporná čísla (defenzivně).
 */
export function categoryForTierIndex(tierIndex: number): ProductCategory {
  const i = ((Math.trunc(tierIndex) % TIER_COUNT) + TIER_COUNT) % TIER_COUNT;
  return CATEGORIES[i];
}

/** Číslo tieru pro zobrazení (1–3). */
export function tierNumberForIndex(tierIndex: number): number {
  return (((Math.trunc(tierIndex) % TIER_COUNT) + TIER_COUNT) % TIER_COUNT) + 1;
}

/** Kolikátý cyklus (1-based) daná odměna patří. */
export function cycleForTierIndex(tierIndex: number): number {
  return Math.floor(Math.max(0, Math.trunc(tierIndex)) / TIER_COUNT) + 1;
}

/**
 * Dostupná (zatím „neproměněná“) razítka.
 * Každá založená odměna — i nevyzvednutá — spotřebovala 4 razítka.
 */
export function availableStamps(
  totalStamps: number,
  rewardsCount: number,
): number {
  return Math.max(0, totalStamps - STAMPS_PER_TIER * rewardsCount);
}

/** Kolik políček na aktuální kartě je zaplněných (0–4). */
export function filledSlots(available: number): number {
  return Math.max(0, Math.min(STAMPS_PER_TIER, available));
}

/** Kolik razítek zbývá do další odměny (0 = odměna je k dispozici). */
export function stampsToNextReward(available: number): number {
  return Math.max(0, STAMPS_PER_TIER - filledSlots(available));
}

/** Cyklus je u konce: 3 odměny hotové a opakování je vypnuté. */
export function isCycleFinished(
  rewardsCount: number,
  repeatCycle: boolean,
): boolean {
  return !repeatCycle && rewardsCount >= TIER_COUNT;
}

export interface RewardCreationInput {
  /** Dostupná razítka (viz availableStamps). */
  available: number;
  /** Existuje odměna ve stavu ready nebo selected? */
  hasOpenReward: boolean;
  /** Kolik odměn už uživatel celkem má (všechny stavy). */
  rewardsCount: number;
  /** settings.repeat_cycle */
  repeatCycle: boolean;
}

/** Má server právě teď založit novou odměnu? */
export function shouldCreateReward({
  available,
  hasOpenReward,
  rewardsCount,
  repeatCycle,
}: RewardCreationInput): boolean {
  if (hasOpenReward) return false;
  if (available < STAMPS_PER_TIER) return false;
  if (isCycleFinished(rewardsCount, repeatCycle)) return false;
  return true;
}

/** tier_index odměny, která by se právě zakládala. */
export function nextTierIndex(rewardsCount: number): number {
  return Math.max(0, Math.trunc(rewardsCount));
}

/** Kategorie odměny, kterou uživatel právě sbírá (příští odměna). */
export function upcomingCategory(rewardsCount: number): ProductCategory {
  return categoryForTierIndex(nextTierIndex(rewardsCount));
}

/**
 * Zbývající cooldown v minutách (zaokrouhleno nahoru).
 * 0 = razítko lze připsat.
 */
export function cooldownMinutesLeft(
  lastStampAt: Date | string | null,
  now: Date,
  cooldownMinutes: number,
): number {
  if (!lastStampAt || cooldownMinutes <= 0) return 0;
  const last =
    typeof lastStampAt === "string" ? new Date(lastStampAt) : lastStampAt;
  if (Number.isNaN(last.getTime())) return 0;
  const elapsedMs = now.getTime() - last.getTime();
  const cooldownMs = cooldownMinutes * 60_000;
  if (elapsedMs >= cooldownMs) return 0;
  return Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 60_000));
}

/** Je denní limit razítek vyčerpaný? (limit ≤ 0 = bez limitu) */
export function isDailyLimitReached(
  stampsToday: number,
  dailyLimit: number,
): boolean {
  if (dailyLimit <= 0) return false;
  return stampsToday >= dailyLimit;
}

/** Souhrn stavu pro UI. */
export interface LoyaltySummary {
  totalStamps: number;
  rewardsCount: number;
  available: number;
  filled: number;
  toNext: number;
  upcoming: ProductCategory;
  upcomingTierNumber: number;
  cycleFinished: boolean;
}

export function summarize(
  totalStamps: number,
  rewardsCount: number,
  repeatCycle: boolean,
): LoyaltySummary {
  const available = availableStamps(totalStamps, rewardsCount);
  return {
    totalStamps,
    rewardsCount,
    available,
    filled: filledSlots(available),
    toNext: stampsToNextReward(available),
    upcoming: upcomingCategory(rewardsCount),
    upcomingTierNumber: tierNumberForIndex(nextTierIndex(rewardsCount)),
    cycleFinished: isCycleFinished(rewardsCount, repeatCycle),
  };
}
