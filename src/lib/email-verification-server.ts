import { createAdminClient } from "@/lib/supabase/admin";
import { hashSecret, newEmailToken } from "@/lib/phone-auth-server";
import { isInternalAuthEmail, isValidEmail } from "@/lib/phone-auth";

const RESEND_AFTER_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const CONFIRMATION_TEXT = "Ahoj! Vítej ve věrnostním programu Longevity baru. Jsi ready na naše odměny? Pokud ano, aktivuj svůj účet zde.";

export type EmailStatus = {
  email: string | null;
  verified: boolean;
  lastSentAt: string | null;
};

export async function getEmailStatus(userId: string): Promise<EmailStatus> {
  const admin = createAdminClient();
  const profile = await admin.from("profiles").select("email, email_verified_at, last_activation_email_at").eq("id", userId).maybeSingle();
  const email = profile.data?.email;
  return {
    email: email && !isInternalAuthEmail(email) ? email : null,
    verified: Boolean(email && !isInternalAuthEmail(email) && profile.data?.email_verified_at),
    lastSentAt: profile.data?.last_activation_email_at ?? null,
  };
}

async function sendViaResend(email: string, activationUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Longevity Bar <no-reply@wildandcoco.com>",
      to: [email],
      subject: "Aktivuj si odměny v Longevity Baru",
      text: CONFIRMATION_TEXT.replace("zde", activationUrl),
      html: `<p>Ahoj! Vítej ve věrnostním programu Longevity baru. Jsi ready na naše odměny? Pokud ano, aktivuj svůj účet <a href="${activationUrl}">zde</a>.</p>`,
    }),
  });
  return response.ok;
}

export async function sendActivationEmail(userId: string, rawEmail: string): Promise<{ accepted: boolean; throttled?: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  if (!isValidEmail(email) || isInternalAuthEmail(email)) throw new TypeError("Zadej platný e-mail.");
  const admin = createAdminClient();
  const status = await getEmailStatus(userId);
  const lastSent = status.lastSentAt ? Date.parse(status.lastSentAt) : 0;
  // Limit platí na účet, ne na adresu. Jinak by šlo střídáním adres rozesílat
  // neomezené množství zpráv přes veřejný onboarding.
  if (lastSent && Date.now() - lastSent < RESEND_AFTER_MS) {
    return { accepted: true, throttled: true };
  }

  const token = newEmailToken();
  const now = new Date();
  const cutoff = new Date(now.getTime() - RESEND_AFTER_MS).toISOString();
  if (status.email !== email) {
    await admin.from("profiles").upsert({
      id: userId,
      email,
      email_verified_at: null,
    }, { onConflict: "id" });
  }
  // Atomický claim zabraňuje dvěma souběžným reward requestům odeslat e-mail
  // zároveň.
  const claim = await admin
    .from("profiles")
    .update({ last_activation_email_at: now.toISOString() })
    .eq("id", userId)
    .or(`last_activation_email_at.is.null,last_activation_email_at.lt.${cutoff}`)
    .select("id")
    .maybeSingle();
  if (!claim.data) return { accepted: true, throttled: true };

  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS).toISOString();
  await admin.from("email_activation_tokens").update({ consumed_at: now.toISOString() }).eq("user_id", userId).is("consumed_at", null);
  const inserted = await admin.from("email_activation_tokens").insert({
    user_id: userId,
    email,
    token_hash: hashSecret("email-token", token),
    expires_at: expiresAt,
  }).select("id").single();
  if (inserted.error || !inserted.data) {
    await admin.from("profiles").update({ last_activation_email_at: status.lastSentAt }).eq("id", userId).eq("last_activation_email_at", now.toISOString());
    throw new Error("Aktivační e-mail se nepodařilo připravit.");
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const sent = await sendViaResend(email, `${base}/aktivovat-email?token=${encodeURIComponent(token)}`).catch(() => false);
  if (!sent) {
    await Promise.all([
      admin.from("email_activation_tokens").update({ consumed_at: new Date().toISOString() }).eq("id", inserted.data.id),
      admin.from("profiles").update({ last_activation_email_at: status.lastSentAt }).eq("id", userId).eq("last_activation_email_at", now.toISOString()),
    ]);
    throw new Error("Aktivační e-mail se nepodařilo odeslat.");
  }
  return { accepted: true };
}

export async function activateEmail(rawToken: string): Promise<boolean> {
  if (!rawToken || rawToken.length > 200) return false;
  const admin = createAdminClient();
  const tokenHash = hashSecret("email-token", rawToken);
  const token = await admin.from("email_activation_tokens").select("id, user_id, email, expires_at, consumed_at").eq("token_hash", tokenHash).maybeSingle();
  const row = token.data;
  if (!row || row.consumed_at || Date.parse(row.expires_at) <= Date.now()) return false;
  const consumedAt = new Date().toISOString();
  const consumed = await admin.from("email_activation_tokens").update({ consumed_at: consumedAt }).eq("id", row.id).is("consumed_at", null).select("id").maybeSingle();
  if (!consumed.data) return false;
  await admin.from("profiles").update({ email: row.email, email_verified_at: consumedAt }).eq("id", row.user_id);
  return true;
}

/** Serverový guard všech reward mutací; po 10 min pošle aktivaci nejvýše jednou. */
export async function requireVerifiedEmailForReward(userId: string): Promise<{ allowed: boolean; resent: boolean }> {
  const status = await getEmailStatus(userId);
  if (status.verified) return { allowed: true, resent: false };
  const lastSent = status.lastSentAt ? Date.parse(status.lastSentAt) : 0;
  if (status.email && (!lastSent || Date.now() - lastSent >= RESEND_AFTER_MS)) {
    try {
      await sendActivationEmail(userId, status.email);
      return { allowed: false, resent: true };
    } catch {
      return { allowed: false, resent: false };
    }
  }
  return { allowed: false, resent: false };
}
