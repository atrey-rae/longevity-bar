import { createHmac } from "node:crypto";

import type { QuizVariant } from "@/lib/kviz";
import { createAdminClient } from "@/lib/supabase/admin";

const PENDING_TTL_MS = 15 * 60_000;

export type QuizPolicy = {
  loginRequired: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export async function getQuizPolicy(): Promise<QuizPolicy> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("quiz_settings")
      .select("quiz_login_required, updated_at, updated_by")
      .eq("singleton", true)
      .maybeSingle();
    if (error || !data) {
      console.warn("[quiz-policy] nastavení není dostupné; fail-closed login=ANO");
      return { loginRequired: true, updatedAt: null, updatedBy: null };
    }
    return {
      loginRequired: data.quiz_login_required !== false,
      updatedAt: data.updated_at ?? null,
      updatedBy: data.updated_by ?? null,
    };
  } catch {
    return { loginRequired: true, updatedAt: null, updatedBy: null };
  }
}

export async function setQuizPolicy(loginRequired: boolean, actor: string): Promise<QuizPolicy> {
  const updatedBy = actor.trim().slice(0, 200) || "Healing admin";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quiz_settings")
    .upsert({
      singleton: true,
      quiz_login_required: loginRequired,
      updated_by: updatedBy,
    }, { onConflict: "singleton" })
    .select("quiz_login_required, updated_at, updated_by")
    .single();
  if (error || !data) throw new Error("Nastavení kvízu se nepodařilo uložit.");
  return {
    loginRequired: data.quiz_login_required !== false,
    updatedAt: data.updated_at ?? null,
    updatedBy: data.updated_by ?? updatedBy,
  };
}

export async function completedQuizVariants(userId: string | null): Promise<QuizVariant[]> {
  if (!userId) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quiz_completions")
    .select("quiz_variant")
    .eq("user_id", userId)
    .eq("status", "completed");
  if (error) {
    console.warn("[quiz] dokončené varianty se nenačetly:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.quiz_variant)
    .filter((variant): variant is QuizVariant => variant === "microbiom" || variant === "profil");
}

function contactHash(email: string, phone: string): string {
  const pepper = process.env.BAR_AUTH_PEPPER;
  if (!pepper || pepper.length < 16) throw new Error("Quiz duplicate protection is not configured.");
  return createHmac("sha256", pepper)
    .update("quiz-completion:v1\u0000")
    .update(`${email.trim().toLowerCase()}\u0000${phone.trim()}`)
    .digest("hex");
}

export type QuizClaim = { ok: true; id: string } | { ok: false; reason: "completed" };

export async function claimQuizCompletion(input: {
  userId: string | null;
  email: string;
  phone: string;
  variant: QuizVariant;
  bavicCode: string;
}): Promise<QuizClaim> {
  const admin = createAdminClient();
  const anonymousHash = input.userId ? null : contactHash(input.email, input.phone);
  const staleBefore = new Date(Date.now() - PENDING_TTL_MS).toISOString();
  let stale = admin.from("quiz_completions").delete().eq("status", "pending").lt("created_at", staleBefore);
  stale = input.userId
    ? stale.eq("user_id", input.userId).eq("quiz_variant", input.variant)
    : stale.is("user_id", null).eq("contact_hash", anonymousHash!).eq("quiz_variant", input.variant);
  await stale;

  const { data, error } = await admin.from("quiz_completions").insert({
    user_id: input.userId,
    contact_hash: anonymousHash,
    quiz_variant: input.variant,
    bavic_code: input.bavicCode,
    status: "pending",
  }).select("id").single();
  if (error?.code === "23505") return { ok: false, reason: "completed" };
  if (error || !data) throw new Error("Dokončení kvízu se nepodařilo rezervovat.");
  return { ok: true, id: data.id };
}

export async function finishQuizCompletion(id: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("quiz_completions").update({
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (error || !data) throw new Error("Dokončení kvízu se nepodařilo potvrdit.");
}

export async function releaseQuizClaim(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("quiz_completions").delete().eq("id", id).eq("status", "pending");
}
