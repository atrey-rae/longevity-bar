"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-guard";
import { availableStamps } from "@/lib/loyalty";
import { getLoyaltyState } from "@/lib/loyalty-server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server actions administrace.
 *
 * POZOR: server actions jsou veřejné endpointy — oprávnění se proto
 * ověřuje uvnitř KAŽDÉ akce (`requireAdmin`), ne jen v layoutu.
 */

function novyToken(): string {
  return randomBytes(12).toString("base64url");
}

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/* -------------------------------------------------------------------------- */
/* Festivalové dny                                                             */
/* -------------------------------------------------------------------------- */

export async function vytvoritDen(formData: FormData): Promise<void> {
  await requireAdmin("/admin/dny");
  const date = text(formData, "date");
  const label = text(formData, "label");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

  const admin = createAdminClient();
  await admin.from("event_days").insert({
    date,
    label: label || null,
    token: novyToken(),
    active: true,
  });

  revalidatePath("/admin/dny");
}

export async function prepnoutDen(formData: FormData): Promise<void> {
  await requireAdmin("/admin/dny");
  const id = text(formData, "id");
  const aktivni = text(formData, "aktivni") === "1";
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("event_days").update({ active: aktivni }).eq("id", id);

  revalidatePath("/admin/dny");
}

export async function regenerovatToken(formData: FormData): Promise<void> {
  await requireAdmin("/admin/dny");
  const id = text(formData, "id");
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("event_days").update({ token: novyToken() }).eq("id", id);

  revalidatePath("/admin/dny");
  revalidatePath(`/admin/dny/${id}/tisk`);
}

export async function smazatDen(formData: FormData): Promise<void> {
  await requireAdmin("/admin/dny");
  const id = text(formData, "id");
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("event_days").delete().eq("id", id);

  revalidatePath("/admin/dny");
}

/* -------------------------------------------------------------------------- */
/* Produkty                                                                    */
/* -------------------------------------------------------------------------- */

export async function prepnoutProdukt(formData: FormData): Promise<void> {
  await requireAdmin("/admin/produkty");
  const id = text(formData, "id");
  const aktivni = text(formData, "aktivni") === "1";
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("products").update({ active: aktivni }).eq("id", id);

  revalidatePath("/admin/produkty");
}

/* -------------------------------------------------------------------------- */
/* Ruční korekce u uživatele                                                   */
/* -------------------------------------------------------------------------- */

function cestaUzivatele(email: string): string {
  return `/admin/uzivatele?email=${encodeURIComponent(email)}`;
}

export async function pridatRazitko(formData: FormData): Promise<void> {
  const { user } = await requireAdmin("/admin/uzivatele");
  const userId = text(formData, "userId");
  const email = text(formData, "email");
  if (!userId) return;

  const admin = createAdminClient();
  await admin.from("stamps").insert({
    user_id: userId,
    source: "admin",
    note: `ručně přidal ${user.email ?? "admin"}`,
  });

  // Dorovnání stavu (případné založení odměny)
  await getLoyaltyState(userId);

  revalidatePath(cestaUzivatele(email));
  revalidatePath("/admin");
}

export async function odebratRazitko(formData: FormData): Promise<void> {
  await requireAdmin("/admin/uzivatele");
  const userId = text(formData, "userId");
  const email = text(formData, "email");
  if (!userId) return;

  const admin = createAdminClient();

  // Smaž nejnovější razítko
  const { data: posledni } = await admin
    .from("stamps")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!posledni) return;
  await admin.from("stamps").delete().eq("id", posledni.id);

  // Pokud tím spadl počet razítek pod nárok, zruš ještě nevybranou odměnu
  const [{ count }, { data: odmeny }] = await Promise.all([
    admin
      .from("stamps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("rewards")
      .select("*")
      .eq("user_id", userId)
      .order("tier_index", { ascending: true }),
  ]);

  const vsechny = odmeny ?? [];
  const zbyva = availableStamps(count ?? 0, vsechny.length);
  const nevybrana = [...vsechny]
    .reverse()
    .find((r) => r.state === "ready" && r.product_id === null);

  if (zbyva < 0 && nevybrana) {
    await admin.from("rewards").delete().eq("id", nevybrana.id);
  }

  revalidatePath(cestaUzivatele(email));
  revalidatePath("/admin");
}

export async function oznacitVydano(formData: FormData): Promise<void> {
  await requireAdmin("/admin/uzivatele");
  const rewardId = text(formData, "rewardId");
  const userId = text(formData, "userId");
  const email = text(formData, "email");
  if (!rewardId) return;

  const admin = createAdminClient();
  await admin
    .from("rewards")
    .update({
      state: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_by: "admin",
    })
    .eq("id", rewardId)
    .neq("state", "redeemed");

  if (userId) await getLoyaltyState(userId);

  revalidatePath(cestaUzivatele(email));
  revalidatePath("/admin");
}

export async function vratitVyber(formData: FormData): Promise<void> {
  await requireAdmin("/admin/uzivatele");
  const rewardId = text(formData, "rewardId");
  const email = text(formData, "email");
  if (!rewardId) return;

  const admin = createAdminClient();
  await admin
    .from("rewards")
    .update({ state: "ready", product_id: null, selected_at: null })
    .eq("id", rewardId)
    .eq("state", "selected");

  revalidatePath(cestaUzivatele(email));
  revalidatePath("/admin");
}
