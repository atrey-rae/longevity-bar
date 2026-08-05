import { redirect } from "next/navigation";

import { awardStamp, type ScanResult } from "@/lib/loyalty-server";
import { postLoginDestinationForDayQr } from "@/lib/scan-entry";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";
import { pragueDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Sken denního QR kódu.
 *
 * Nepřihlášený uživatel jde na přihlášení a po návratu se sem vrátí,
 * takže se mu razítko připíše hned po přihlášení.
 *
 * Dvojí načtení (refresh) neřešíme extra mechanismem — druhý pokus
 * spadne do cooldownu a zobrazí „Razítko už máš, další za X min“.
 */
export default async function SkenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getSessionUser();

  if (!user) {
    const admin = createAdminClient();
    const { data: day } = await admin
      .from("event_days")
      .select("active, date")
      .eq("token", token)
      .maybeSingle();
    const next = postLoginDestinationForDayQr(token, day, pragueDateString());
    redirect(
      `/prihlaseni?next=${encodeURIComponent(next)}`,
    );
  }

  let vysledek: ScanResult;
  try {
    vysledek = await awardStamp(user, token);
  } catch {
    vysledek = { status: "error" };
  }

  const qs = new URLSearchParams({ sken: vysledek.status });
  if (vysledek.minutesLeft) qs.set("min", String(vysledek.minutesLeft));
  if (vysledek.limit) qs.set("limit", String(vysledek.limit));
  if (vysledek.dayDate) qs.set("den", vysledek.dayDate);
  if (vysledek.newReward) qs.set("vyhra", "1");

  redirect(`/odmeny?${qs.toString()}`);
}
