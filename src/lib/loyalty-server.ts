/**
 * SERVEROVÁ věrnostní logika — jediné místo, kde se zapisují razítka a odměny.
 *
 * Vše běží přes service-role klienta (obchází RLS) a všechna pravidla
 * (platnost denního tokenu, cooldown, denní limit, jedna otevřená odměna,
 * znehodnocení odměny výdejem) se vynucují TADY, nikdy na klientovi.
 */

import type { User } from "@supabase/supabase-js";

import {
  categoryForTierIndex,
  cooldownMinutesLeft,
  isDailyLimitReached,
  nextTierIndex,
  shouldCreateReward,
  summarize,
  type LoyaltySummary,
} from "./loyalty";
import { getSettings, type AppSettings } from "./settings";
import { createAdminClient } from "./supabase/admin";
import { pragueDateString, pragueDayRange } from "./time";
import type { Product, Reward } from "./types";

/** Kód porušení unikátního indexu v Postgresu. */
const UNIQUE_VIOLATION = "23505";

export interface LoyaltyState {
  userId: string;
  totalStamps: number;
  stampsToday: number;
  lastStampAt: string | null;
  rewards: Reward[];
  /** Nevyzvednutá odměna (ready | selected), nejvýše jedna. */
  openReward: Reward | null;
  openRewardProduct: Product | null;
  summary: LoyaltySummary;
  settings: AppSettings;
}

/* -------------------------------------------------------------------------- */
/* Profil                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Pojistka pro případ, že by v Supabase nebyl nainstalovaný trigger
 * `on_auth_user_created` (nebo uživatel vznikl dřív než trigger).
 */
export async function ensureProfile(user: User): Promise<void> {
  const admin = createAdminClient();
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
    },
    { onConflict: "id" },
  );
}

/* -------------------------------------------------------------------------- */
/* Stav věrnostní karty                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Načte kompletní stav uživatele a v případě potřeby založí novou odměnu.
 * Idempotentní — voláme z karty, výběru odměny i po výdeji, aby se stav
 * vždy sám dorovnal (i po ručním zásahu admina).
 */
export async function getLoyaltyState(userId: string): Promise<LoyaltyState> {
  const admin = createAdminClient();
  const settings = await getSettings();
  const today = pragueDateString();
  const { start, end } = pragueDayRange(today);

  const [totalRes, todayRes, lastRes, rewardsRes] = await Promise.all([
    admin
      .from("stamps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("stamps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
    admin
      .from("stamps")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("rewards")
      .select("*")
      .eq("user_id", userId)
      .order("tier_index", { ascending: true }),
  ]);

  const totalStamps = totalRes.count ?? 0;
  const stampsToday = todayRes.count ?? 0;
  const lastStampAt = lastRes.data?.created_at ?? null;
  let rewards: Reward[] = rewardsRes.data ?? [];

  // Případné založení nové odměny
  const created = await maybeCreateReward({
    userId,
    totalStamps,
    rewards,
    repeatCycle: settings.repeatCycle,
  });
  if (created) {
    const refreshed = await admin
      .from("rewards")
      .select("*")
      .eq("user_id", userId)
      .order("tier_index", { ascending: true });
    rewards = refreshed.data ?? rewards;
  }

  const openReward =
    rewards.find((r) => r.state === "ready" || r.state === "selected") ?? null;

  let openRewardProduct: Product | null = null;
  if (openReward?.product_id) {
    const { data } = await admin
      .from("products")
      .select("*")
      .eq("id", openReward.product_id)
      .maybeSingle();
    openRewardProduct = data ?? null;
  }

  return {
    userId,
    totalStamps,
    stampsToday,
    lastStampAt,
    rewards,
    openReward,
    openRewardProduct,
    summary: summarize(totalStamps, rewards.length, settings.repeatCycle),
    settings,
  };
}

async function maybeCreateReward(input: {
  userId: string;
  totalStamps: number;
  rewards: Reward[];
  repeatCycle: boolean;
}): Promise<Reward | null> {
  const { userId, totalStamps, rewards, repeatCycle } = input;
  const hasOpenReward = rewards.some(
    (r) => r.state === "ready" || r.state === "selected",
  );
  const summary = summarize(totalStamps, rewards.length, repeatCycle);

  if (
    !shouldCreateReward({
      available: summary.available,
      hasOpenReward,
      rewardsCount: rewards.length,
      repeatCycle,
    })
  ) {
    return null;
  }

  const tierIndex = nextTierIndex(rewards.length);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rewards")
    .insert({
      user_id: userId,
      tier_index: tierIndex,
      category: categoryForTierIndex(tierIndex),
      state: "ready",
    })
    .select("*")
    .single();

  if (error) {
    // Souběžný request už odměnu založil (unikátní index) — není to chyba.
    if (error.code === UNIQUE_VIOLATION) return null;
    throw new Error(`Nepodařilo se založit odměnu: ${error.message}`);
  }
  return data;
}

/* -------------------------------------------------------------------------- */
/* Připsání razítka (sken QR)                                                  */
/* -------------------------------------------------------------------------- */

export type ScanStatus =
  | "ok"
  | "cooldown"
  | "daily_limit"
  | "unknown_token"
  | "inactive_day"
  | "wrong_day"
  | "error";

export interface ScanResult {
  status: ScanStatus;
  /** Zbývající minuty cooldownu (status = cooldown). */
  minutesLeft?: number;
  /** Denní limit (status = daily_limit). */
  limit?: number;
  /** Datum dne z tokenu (status = wrong_day). */
  dayDate?: string;
  /** Vznikla připsáním razítka nová odměna? */
  newReward?: boolean;
  /** Stav po připsání. */
  state?: LoyaltyState;
}

/**
 * Připíše razítko za sken denního QR.
 *
 * Dvojité načtení stránky (refresh) neřešíme zvláštním mechanismem —
 * druhý pokus spadne do cooldownu a vrátí `cooldown`.
 */
export async function awardStamp(
  user: User,
  token: string,
): Promise<ScanResult> {
  const admin = createAdminClient();
  const settings = await getSettings();

  // 1) Platnost denního tokenu
  const { data: day, error: dayError } = await admin
    .from("event_days")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (dayError) return { status: "error" };
  if (!day) return { status: "unknown_token" };
  if (!day.active) return { status: "inactive_day" };

  const today = pragueDateString();
  if (day.date !== today) return { status: "wrong_day", dayDate: day.date };

  // 2) Profil musí existovat kvůli cizímu klíči
  await ensureProfile(user);

  // 3) Cooldown + denní limit
  const before = await getLoyaltyState(user.id);
  const minutesLeft = cooldownMinutesLeft(
    before.lastStampAt,
    new Date(),
    settings.cooldownMinutes,
  );
  if (minutesLeft > 0) {
    return { status: "cooldown", minutesLeft, state: before };
  }
  if (isDailyLimitReached(before.stampsToday, settings.dailyLimit)) {
    return { status: "daily_limit", limit: settings.dailyLimit, state: before };
  }

  // 4) Zápis razítka
  const { error: insertError } = await admin.from("stamps").insert({
    user_id: user.id,
    day_id: day.id,
    source: "qr",
  });
  if (insertError) return { status: "error" };

  // 5) Dorovnání stavu (případné založení odměny)
  const after = await getLoyaltyState(user.id);
  const newReward = after.rewards.length > before.rewards.length;

  return { status: "ok", newReward, state: after };
}

/* -------------------------------------------------------------------------- */
/* Výběr produktu                                                              */
/* -------------------------------------------------------------------------- */

export type SelectStatus =
  | "ok"
  | "no_reward"
  | "already_selected"
  | "bad_product"
  | "error";

export interface SelectResult {
  status: SelectStatus;
  rewardId?: string;
}

/** Zákazník si vybral konkrétní produkt k odměně. */
export async function selectRewardProduct(
  userId: string,
  productId: string,
): Promise<SelectResult> {
  const admin = createAdminClient();
  const state = await getLoyaltyState(userId);
  const reward = state.openReward;

  if (!reward) return { status: "no_reward" };
  if (reward.state === "selected") {
    return { status: "already_selected", rewardId: reward.id };
  }

  const { data: product } = await admin
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.active || product.category !== reward.category) {
    return { status: "bad_product" };
  }

  const { data: updated, error } = await admin
    .from("rewards")
    .update({
      product_id: product.id,
      state: "selected",
      selected_at: new Date().toISOString(),
    })
    .eq("id", reward.id)
    .eq("state", "ready") // ochrana proti souběhu
    .select("id")
    .maybeSingle();

  if (error) return { status: "error" };
  if (!updated) return { status: "already_selected", rewardId: reward.id };

  return { status: "ok", rewardId: reward.id };
}

/* -------------------------------------------------------------------------- */
/* Výdej odměny                                                                */
/* -------------------------------------------------------------------------- */

export type RedeemStatus =
  | "ok"
  | "already_redeemed"
  | "not_selected"
  | "not_found"
  | "bad_pin"
  | "error";

export interface RedeemResult {
  status: RedeemStatus;
}

/**
 * Výdej odměny (dlouhé podržení tlačítka u pokladny).
 * Odměna se znehodnotí prvním výdejem — druhý pokus vrátí `already_redeemed`.
 */
export async function redeemReward(
  userId: string,
  rewardId: string,
  pin?: string | null,
): Promise<RedeemResult> {
  const admin = createAdminClient();
  const settings = await getSettings();

  if (settings.staffPin && (pin ?? "").trim() !== settings.staffPin) {
    return { status: "bad_pin" };
  }

  const { data: reward, error } = await admin
    .from("rewards")
    .select("*")
    .eq("id", rewardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { status: "error" };
  if (!reward) return { status: "not_found" };
  if (reward.state === "redeemed") return { status: "already_redeemed" };
  if (reward.state !== "selected" || !reward.product_id) {
    return { status: "not_selected" };
  }

  const { data: updated, error: updateError } = await admin
    .from("rewards")
    .update({
      state: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_by: "customer",
    })
    .eq("id", reward.id)
    .eq("state", "selected")
    .select("id")
    .maybeSingle();

  if (updateError) return { status: "error" };
  if (!updated) return { status: "already_redeemed" };

  // Uvolnila se „přihrádka“ — pokud má zákazník naspořená razítka,
  // rovnou mu založíme další odměnu.
  await getLoyaltyState(userId);

  return { status: "ok" };
}

/* -------------------------------------------------------------------------- */
/* Produkty                                                                    */
/* -------------------------------------------------------------------------- */

/** Mapa produktů podle id (pro historii odměn a admin statistiky). */
export async function getProductsByIds(
  ids: (string | null)[],
): Promise<Map<string, Product>> {
  const cistaIds = Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string")),
  );
  if (cistaIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data } = await admin.from("products").select("*").in("id", cistaIds);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

/** Odměna konkrétního uživatele (kontrola vlastnictví). */
export async function getRewardForUser(
  userId: string,
  rewardId: string,
): Promise<{ reward: Reward; product: Product | null } | null> {
  const admin = createAdminClient();
  const { data: reward } = await admin
    .from("rewards")
    .select("*")
    .eq("id", rewardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!reward) return null;

  let product: Product | null = null;
  if (reward.product_id) {
    const { data } = await admin
      .from("products")
      .select("*")
      .eq("id", reward.product_id)
      .maybeSingle();
    product = data ?? null;
  }
  return { reward, product };
}

export async function listActiveProducts(
  category: Product["category"],
): Promise<Product[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select("*")
    .eq("category", category)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
}
