import { NextResponse } from "next/server";

import { vytvoritPozvanku } from "@/lib/invite-links";
import { jeAutorizovanyReport } from "@/lib/report-auth";
import { siteUrl } from "@/lib/supabase/env";

// `node:crypto` v `lib/healing-bridge.ts` i `lib/invite-links.ts` potřebuje
// Node runtime, ne Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Vyrobí osobní pozvánku pro hosta — server-to-server, volá Healing.app.
 *
 * Autorizace je STEJNÁ jako u ostatních interních rout (`jeAutorizovanyReport`):
 * `Authorization: Bearer …`, porovnání v konstantním čase, fail-closed když
 * secret na serveru chybí.
 *
 * Odpověď nese JEDINÝ výskyt plaintext tokenu v celém systému — dál už žije
 * jen hash. Proto se nikdy nesmí cachovat a token se nikdy neloguje.
 */
export async function POST(request: Request) {
  if (!jeAutorizovanyReport(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }

  let telo: unknown;
  try {
    telo = await request.json();
  } catch {
    telo = null;
  }
  const phone = (telo as { phone?: unknown } | null)?.phone;
  if (typeof phone !== "string" || phone.trim() === "") {
    return NextResponse.json(
      { error: "phone required" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    // `normalizeCzechPhone` hází `TypeError` na neplatném tvaru — chytáme ho
    // níž a vracíme 400, ne 500.
    const pozvanka = await vytvoritPozvanku(phone, siteUrl());
    if (!pozvanka) {
      return NextResponse.json(
        { error: "invite failed" },
        { status: 500, headers: NO_STORE },
      );
    }
    return NextResponse.json(pozvanka, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof TypeError) {
      return NextResponse.json(
        { error: "invalid phone" },
        { status: 400, headers: NO_STORE },
      );
    }
    // Do logu jde jen holá informace. Telefon ani token nikdy.
    console.error("[invite] vytvoření pozvánky selhalo.");
    return NextResponse.json(
      { error: "invite failed" },
      { status: 500, headers: NO_STORE },
    );
  }
}
