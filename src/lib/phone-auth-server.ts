import { createHmac, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  IP_RATE_MAX,
  PHONE_RATE_MAX,
  PHONE_RATE_WINDOW_MS,
  PIN_TTL_MS,
  generateFourDigitCode,
  isInternalAuthEmail,
  normalizeCzechPhone,
  smsText,
} from "@/lib/phone-auth";

const OPTIMCALL_HOST_FALLBACK = "wildandcoco.optimcall.cz";

function pepper(): string {
  const value = process.env.BAR_AUTH_PEPPER;
  if (!value || value.length < 16) throw new Error("BAR_AUTH_PEPPER není nastavený.");
  return value;
}

export function hashSecret(scope: string, value: string): string {
  return createHmac("sha256", pepper()).update(`${scope}:${value}`).digest("hex");
}

export function hashIp(rawIp: string): string {
  return hashSecret("ip", rawIp || "unknown");
}

export function internalAliasForPhone(phone: string): string {
  const digest = hashSecret("alias:v1", phone).slice(0, 32);
  return `phone+${digest}@auth.longevity.invalid`;
}

type SmsFetch = typeof fetch;

export async function sendSms(phone: string, code: string, fetchImpl: SmsFetch = fetch): Promise<boolean> {
  const token = process.env.OPTIMCALL_TOKEN;
  const deviceId = process.env.OPTIMCALL_DEVICE_ID;
  if (token && deviceId) {
    const host = process.env.OPTIMCALL_TENANT_HOST || OPTIMCALL_HOST_FALLBACK;
    const credentials: { tenant: string; key: string; user?: string } = {
      tenant: host,
      key: token,
    };
    if (process.env.OPTIMCALL_USER) credentials.user = process.env.OPTIMCALL_USER;
    const response = await fetchImpl(`https://${host}/api/command`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        name: "SendSms",
        credentials,
        deviceId,
        to: [phone],
        message: smsText(code),
        requestSmsId: true,
      }),
    });
    if (!response.ok) return false;
    const reply = (await response.json()) as { name?: string };
    return reply?.name === "SmsSent";
  }

  // OptimCall token zůstává pouze ve Workeru Healing.app. Bar.app se k němu
  // připojí přes úzký server-to-server most chráněný sdíleným tajemstvím.
  const bridgeUrl = process.env.HEALING_SMS_BRIDGE_URL;
  const bridgeSecret = process.env.HEALING_BRIDGE_SECRET;
  if (!bridgeUrl || !bridgeUrl.startsWith("https://") || !bridgeSecret || bridgeSecret.length < 24) return false;
  const response = await fetchImpl(bridgeUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${bridgeSecret}`,
    },
    body: JSON.stringify({ phone, message: smsText(code) }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  const reply = (await response.json()) as { sent?: boolean };
  return reply?.sent === true;
}

export type RequestPhoneCodeResult = {
  accepted: true;
  challengeId: string | null;
  expiresAt: string | null;
};

/** Odpověď je záměrně stejná i při rate limitu či selhání SMS. */
export async function requestPhoneCode(rawPhone: string, rawIp: string): Promise<RequestPhoneCodeResult> {
  const phone = normalizeCzechPhone(rawPhone);
  const admin = createAdminClient();
  const now = Date.now();
  const windowStart = new Date(now - PHONE_RATE_WINDOW_MS).toISOString();
  const ipHash = hashIp(rawIp);
  const [phoneCount, ipCount] = await Promise.all([
    admin.from("phone_auth_challenges").select("id", { count: "exact", head: true }).eq("phone_e164", phone).gte("created_at", windowStart),
    admin.from("phone_auth_challenges").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", windowStart),
  ]);
  if ((phoneCount.count ?? 0) >= PHONE_RATE_MAX || (ipCount.count ?? 0) >= IP_RATE_MAX) {
    return { accepted: true, challengeId: null, expiresAt: null };
  }

  const code = generateFourDigitCode();
  const expiresAt = new Date(now + PIN_TTL_MS).toISOString();
  await admin
    .from("phone_auth_challenges")
    .update({ consumed_at: new Date(now).toISOString() })
    .eq("phone_e164", phone)
    .is("consumed_at", null);
  const inserted = await admin
    .from("phone_auth_challenges")
    .insert({
      phone_e164: phone,
      pin_hash: hashSecret(`pin:${phone}`, code),
      ip_hash: ipHash,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) return { accepted: true, challengeId: null, expiresAt: null };

  const sent = await sendSms(phone, code).catch(() => false);
  if (!sent) {
    await admin.from("phone_auth_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", inserted.data.id);
    return { accepted: true, challengeId: null, expiresAt: null };
  }
  return { accepted: true, challengeId: inserted.data.id, expiresAt };
}

async function resolveIdentity(phone: string): Promise<{ userId: string | null; email: string }> {
  const admin = createAdminClient();
  const identity = await admin.from("phone_identities").select("user_id").eq("phone_e164", phone).maybeSingle();
  if (identity.data?.user_id) {
    const user = await admin.auth.admin.getUserById(identity.data.user_id);
    const email = user.data.user?.email;
    if (email) return { userId: identity.data.user_id, email };
  }

  // profiles.phone je historicky nečisté a není unikátní; adoptujeme jen jedinou
  // jednoznačnou shodu po normalizaci. Dvě shody se nikdy neslučují odhadem.
  const profiles = await admin.from("profiles").select("id, phone, email").not("phone", "is", null);
  const matches = (profiles.data ?? []).filter((profile) => {
    try { return normalizeCzechPhone(profile.phone ?? "") === phone; } catch { return false; }
  });
  if (matches.length === 1) {
    const candidate = matches[0];
    const authUser = await admin.auth.admin.getUserById(candidate.id);
    const email = authUser.data.user?.email;
    if (email) return { userId: candidate.id, email };
    if (authUser.data.user) {
      const alias = internalAliasForPhone(phone);
      const updated = await admin.auth.admin.updateUserById(candidate.id, {
        email: alias,
        email_confirm: true,
      });
      if (!updated.error) return { userId: candidate.id, email: alias };
    }
  }
  if (matches.length > 1) {
    await admin.from("phone_identity_conflicts").insert({
      phone_e164: phone,
      matching_user_ids: matches.map((row) => row.id),
    });
  }
  return { userId: null, email: internalAliasForPhone(phone) };
}

export type VerifyPhoneCodeResult =
  | { ok: true; tokenHash: string; next: string }
  | { ok: false; reason: "invalid" | "expired" | "attempts" };

export async function verifyPhoneCode(input: {
  challengeId: string;
  rawPhone: string;
  code: string;
  next: string;
}): Promise<VerifyPhoneCodeResult> {
  const phone = normalizeCzechPhone(input.rawPhone);
  const admin = createAdminClient();
  if (!/^\d{4}$/.test(input.code)) return { ok: false, reason: "invalid" };
  const candidate = hashSecret(`pin:${phone}`, input.code);
  const consumed = await admin.rpc("consume_phone_auth_challenge", {
    p_id: input.challengeId,
    p_phone_e164: phone,
    p_pin_hash: candidate,
  });
  const challengeStatus = consumed.data;
  if (consumed.error || challengeStatus !== "ok") {
    const reason = challengeStatus === "expired" || challengeStatus === "attempts"
      ? challengeStatus
      : "invalid";
    return { ok: false, reason };
  }
  const resolved = await resolveIdentity(phone);
  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: resolved.email,
    options: { data: { phone_login: true } },
  });
  const authUserId = generated.data.user?.id;
  const tokenHash = generated.data.properties?.hashed_token;
  if (!authUserId || !tokenHash) return { ok: false, reason: "invalid" };
  if (resolved.userId && authUserId !== resolved.userId) return { ok: false, reason: "invalid" };
  const targetUserId = resolved.userId ?? authUserId;
  const identityWrite = await admin.from("phone_identities").upsert(
    { phone_e164: phone, user_id: targetUserId },
    { onConflict: "phone_e164" },
  ).select("user_id").single();
  if (identityWrite.error || identityWrite.data?.user_id !== targetUserId) {
    return { ok: false, reason: "invalid" };
  }
  await admin.from("profiles").upsert(
    { id: targetUserId, phone },
    { onConflict: "id" },
  );
  return { ok: true, tokenHash, next: input.next };
}

export async function isEmailVerified(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const profile = await admin.from("profiles").select("email, email_verified_at").eq("id", userId).maybeSingle();
  return Boolean(profile.data?.email && !isInternalAuthEmail(profile.data.email) && profile.data.email_verified_at);
}

export function newEmailToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Telefon přihlášeného uživatele v E.164 — identita, pod kterou ho zná
 * Healing.app (kredit hostů).
 *
 * Zdroj pravdy je `phone_identities`: řádek tam vzniká při ověření PINu a je
 * už normalizovaný. `profiles.phone` je jen záloha — historicky ho vyplňoval
 * i formulář na kartě, takže se před použitím musí normalizovat a při
 * neplatném tvaru se zahazuje.
 *
 * Jakékoli selhání vrací `null` (fail-closed) — volající pak kredit nenabídne.
 */
export async function getSessionPhoneE164(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const identity = await admin
      .from("phone_identities")
      .select("phone_e164")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (identity.data?.phone_e164) return identity.data.phone_e164;

    const profile = await admin
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .maybeSingle();
    if (!profile.data?.phone) return null;
    try {
      return normalizeCzechPhone(profile.data.phone);
    } catch {
      return null;
    }
  } catch (e) {
    console.warn("[kredit] telefon uživatele se nepodařilo načíst:", e);
    return null;
  }
}
