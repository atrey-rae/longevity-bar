import { NextResponse } from "next/server";

import { isAuthorizedHealingBridge } from "@/lib/healing-bridge";
import { getQuizPolicy, setQuizPolicy } from "@/lib/quiz-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  return isAuthorizedHealingBridge(request.headers.get("authorization"));
}

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

function serializePolicy(policy: Awaited<ReturnType<typeof getQuizPolicy>>) {
  return {
    quizLoginRequired: policy.loginRequired,
    updatedAt: policy.updatedAt,
    updatedBy: policy.updatedBy,
  };
}

export async function GET(request: Request) {
  if (!authorized(request)) return json({ error: "unauthorized" }, { status: 401 });
  return json(serializePolicy(await getQuizPolicy()));
}

export async function PUT(request: Request) {
  if (!authorized(request)) return json({ error: "unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "čekáme JSON objekt" }, { status: 400 });
  }
  const input = body as { quizLoginRequired?: unknown; actor?: unknown } | null;
  if (!input || typeof input.quizLoginRequired !== "boolean" || typeof input.actor !== "string" || !input.actor.trim()) {
    return json({ error: "chybí quizLoginRequired nebo actor" }, { status: 400 });
  }
  try {
    return json(serializePolicy(await setQuizPolicy(input.quizLoginRequired, input.actor)));
  } catch (error) {
    console.error("[healing-bridge] zápis quiz policy selhal:", error);
    return json({ error: "zápis se nepodařil" }, { status: 500 });
  }
}
