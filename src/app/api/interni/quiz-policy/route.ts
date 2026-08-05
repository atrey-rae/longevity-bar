import { NextResponse } from "next/server";

import { overitInterniToken } from "@/lib/interni-auth";
import { jeVarianta } from "@/lib/kviz-varianty";
import {
  getQuizPolicy,
  nastavitQuizPolicy,
  type QuizPolicy,
} from "@/lib/quiz-policy";

/**
 * Interní API politiky kvízu — čte a přepíná ho týmová appka Healing.
 *
 *   GET  /api/interni/quiz-policy   → aktuální politika
 *   PUT  /api/interni/quiz-policy   → přepnutí (částečné, jen předané klíče)
 *
 * Autorizace: `Authorization: Bearer <HEALING_API_TOKEN>`.
 *
 * ⚠️ Endpoint pracuje VÝHRADNĚ s konfigurací kvízu. Nevrací žádné odpovědi
 * hostů ani skóre — ty v databázi vůbec nejsou (viz migrace 006).
 */

export const dynamic = "force-dynamic";

type Telo = {
  loginRequired?: unknown;
  recommendedVariant?: unknown;
  updatedBy?: unknown;
};

/** Jednotný tvar odpovědi — dashboard Healingu si ho čte z obou metod. */
function odpoved(policy: QuizPolicy): NextResponse {
  return NextResponse.json(
    {
      quizLoginRequired: policy.loginRequired,
      recommendedVariant: policy.recommendedVariant,
      updatedAt: policy.updatedAt,
      updatedBy: policy.updatedBy,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

function chyba(status: number, zprava: string): NextResponse {
  return NextResponse.json(
    { chyba: zprava },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const autorizace = overitInterniToken(request);
  if (!autorizace.ok) return chyba(autorizace.status, autorizace.zprava);

  return odpoved(await getQuizPolicy());
}

export async function PUT(request: Request): Promise<NextResponse> {
  const autorizace = overitInterniToken(request);
  if (!autorizace.ok) return chyba(autorizace.status, autorizace.zprava);

  let telo: Telo;
  try {
    telo = (await request.json()) as Telo;
  } catch {
    return chyba(400, "Tělo požadavku není platný JSON.");
  }
  if (typeof telo !== "object" || telo === null) {
    return chyba(400, "Tělo požadavku musí být objekt.");
  }

  if (
    telo.loginRequired !== undefined &&
    typeof telo.loginRequired !== "boolean"
  ) {
    return chyba(400, "`loginRequired` musí být boolean.");
  }
  if (
    telo.recommendedVariant !== undefined &&
    !jeVarianta(telo.recommendedVariant)
  ) {
    return chyba(400, "`recommendedVariant` musí být 'mikrobiom' nebo 'profil'.");
  }
  if (telo.loginRequired === undefined && telo.recommendedVariant === undefined) {
    return chyba(400, "Není co měnit — pošli `loginRequired` nebo `recommendedVariant`.");
  }

  const updatedBy =
    typeof telo.updatedBy === "string" && telo.updatedBy.trim() !== ""
      ? telo.updatedBy.trim()
      : "healing-api";

  const nova = await nastavitQuizPolicy({
    loginRequired: telo.loginRequired as boolean | undefined,
    recommendedVariant: jeVarianta(telo.recommendedVariant)
      ? telo.recommendedVariant
      : undefined,
    updatedBy,
  });

  if (!nova) return chyba(500, "Politiku se nepodařilo uložit.");
  return odpoved(nova);
}
