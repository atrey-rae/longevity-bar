import { cache } from "react";

import { createAdminClient } from "./supabase/admin";

export interface AppSettings {
  /** Minuty mezi dvěma razítky téhož uživatele. */
  cooldownMinutes: number;
  /** Max. razítek na uživatele za den (0 = bez limitu). */
  dailyLimit: number;
  /** Po 3. odměně začít znovu od tieru 1? */
  repeatCycle: boolean;
  /** E-maily s přístupem do /admin (lowercase). */
  adminEmails: string[];
  /** Volitelný PIN obsluhy pro výdej odměny (null = vypnuto). */
  staffPin: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  cooldownMinutes: 10,
  dailyLimit: 4,
  repeatCycle: true,
  adminEmails: [],
  staffPin: null,
};

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["true", "1", "ano", "yes"].includes(value.toLowerCase())) return true;
    if (["false", "0", "ne", "no"].includes(value.toLowerCase())) return false;
  }
  return fallback;
}

function toEmailList(value: unknown): string[] {
  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return raw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.length > 0);
}

/**
 * Načtení nastavení ze service-role klientem (tabulka settings není
 * pro klienta čitelná — obsahuje admin e-maily a PIN).
 * `cache()` dedupuje volání v rámci jednoho requestu.
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("settings").select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;

    const map = new Map<string, unknown>(data.map((r) => [r.key, r.value]));
    return {
      cooldownMinutes: Math.max(
        0,
        toNumber(map.get("cooldown_minutes"), DEFAULT_SETTINGS.cooldownMinutes),
      ),
      dailyLimit: Math.max(
        0,
        toNumber(map.get("daily_limit"), DEFAULT_SETTINGS.dailyLimit),
      ),
      repeatCycle: toBoolean(
        map.get("repeat_cycle"),
        DEFAULT_SETTINGS.repeatCycle,
      ),
      adminEmails: toEmailList(map.get("admin_emails")),
      staffPin:
        typeof map.get("staff_pin") === "string" &&
        (map.get("staff_pin") as string).trim() !== ""
          ? (map.get("staff_pin") as string).trim()
          : null,
    };
  } catch {
    // Chybějící konfigurace nesmí shodit build ani celý render.
    return DEFAULT_SETTINGS;
  }
});

/** Je e-mail v seznamu adminů? */
export function isAdminEmail(
  email: string | null | undefined,
  settings: AppSettings,
): boolean {
  if (!email) return false;
  return settings.adminEmails.includes(email.trim().toLowerCase());
}
