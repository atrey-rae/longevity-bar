import { NextResponse, type NextRequest } from "next/server";

import { normalizeLang } from "@/lib/i18n/lang";
import { getT } from "@/lib/i18n/server";
import { jePushNakonfigurovany } from "@/lib/push-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Endpoint push služby musí být https adresa, nic jiného sem nepatří. */
function platnyEndpoint(hodnota: unknown): string | null {
  if (typeof hodnota !== "string" || hodnota.length > 1000) return null;
  try {
    const url = new URL(hodnota);
    return url.protocol === "https:" ? hodnota : null;
  } catch {
    return null;
  }
}

/** Šifrovací klíč prohlížeče — base64url rozumné délky. */
function platnyKlic(hodnota: unknown, maxDelka: number): string | null {
  if (typeof hodnota !== "string") return null;
  const klic = hodnota.trim();
  if (klic.length === 0 || klic.length > maxDelka) return null;
  return /^[A-Za-z0-9_=-]+$/.test(klic) ? klic : null;
}

/**
 * Zapnutí oznámení pro jedno zařízení.
 *
 * Odběr smí založit i NEPŘIHLÁŠENÝ host (prohlíží si sortiment, vyplnil kvíz).
 * Když přihlášený je, řádek se rovnou spáruje s jeho účtem — a při dalším
 * volání ze stejného zařízení se spáruje zpětně (`onConflict: endpoint`),
 * takže se host nemusí odhlašovat a znovu přihlašovat, aby mu chodila
 * osobní oznámení.
 *
 * Bez VAPID konfigurace se odběry vůbec nepřijímají — jinak by v databázi
 * ležela zařízení, kterým nemá kdo poslat oznámení.
 */
export async function POST(request: NextRequest) {
  const { lang, t } = await getT();
  if (!jePushNakonfigurovany()) {
    return NextResponse.json(
      { status: "vypnuto" },
      { status: 503, headers: NO_STORE },
    );
  }

  let telo: unknown;
  try {
    telo = await request.json();
  } catch {
    telo = null;
  }
  const vstup = telo as
    | { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; lang?: unknown }
    | null;

  const endpoint = platnyEndpoint(vstup?.endpoint);
  const p256dh = platnyKlic(vstup?.keys?.p256dh, 200);
  const auth = platnyKlic(vstup?.keys?.auth, 100);
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { status: "chyba", zprava: t.chyby.neplatnyPozadavek },
      { status: 400, headers: NO_STORE },
    );
  }

  const user = await getSessionUser();
  const jazyk = normalizeLang(vstup?.lang) ?? lang;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth,
        lang: jazyk,
        user_id: user?.id ?? null,
        failed_at: null,
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      console.warn("[push] odběr se nepodařilo uložit:", error.message);
      return NextResponse.json(
        { status: "chyba", zprava: t.chyby.zapisSelhal },
        { status: 500, headers: NO_STORE },
      );
    }
    return NextResponse.json({ status: "ok" }, { headers: NO_STORE });
  } catch (e) {
    console.warn("[push] odběr se nepodařilo uložit:", e);
    return NextResponse.json(
      { status: "chyba", zprava: t.chyby.zapisSelhal },
      { status: 500, headers: NO_STORE },
    );
  }
}
