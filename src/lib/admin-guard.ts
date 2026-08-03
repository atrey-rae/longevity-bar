import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getSettings, isAdminEmail, type AppSettings } from "./settings";
import { getSessionUser } from "./supabase/server";

/**
 * Ochrana administrace — kontrola VŽDY na serveru proti settings.admin_emails.
 * Volat na začátku každé admin stránky i každé admin server action
 * (server actions jsou veřejné endpointy!).
 */
export async function requireAdmin(
  currentPath = "/admin",
): Promise<{ user: User; settings: AppSettings }> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/prihlaseni?next=${encodeURIComponent(currentPath)}`);
  }
  const settings = await getSettings();
  if (!isAdminEmail(user.email, settings)) {
    redirect("/?chyba=pristup");
  }
  return { user, settings };
}

/** Je aktuálně přihlášený uživatel admin? (pro zobrazení odkazu v patičce) */
export async function isCurrentUserAdmin(
  user: User | null,
): Promise<boolean> {
  if (!user) return false;
  const settings = await getSettings();
  return isAdminEmail(user.email, settings);
}
