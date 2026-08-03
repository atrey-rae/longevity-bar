import { redirect } from "next/navigation";

import { awardStamp, type ScanResult } from "@/lib/loyalty-server";
import { getSessionUser } from "@/lib/supabase/server";

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
    redirect(
      `/prihlaseni?next=${encodeURIComponent(`/scan/${encodeURIComponent(token)}`)}`,
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

  redirect(`/?${qs.toString()}`);
}
