import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import QuizVariantSelector from "@/components/QuizVariantSelector";
import {
  BAVICI,
  PUBLIC_WEB_QUIZ_HOST,
  najitBavice,
} from "@/lib/kviz";
import { getHostQuizVariant } from "@/lib/kviz-hosts";
import { completedQuizVariants, getQuizPolicy } from "@/lib/quiz-access";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Odemkni potenciál svého mikrobiomu — kvíz",
};

/** Šest bavičů a samostatný veřejný vstup z rozcestníku Bar.app. */
export function generateStaticParams(): { bavic: string }[] {
  return [...BAVICI, PUBLIC_WEB_QUIZ_HOST].map((b) => ({ bavic: b.slug }));
}

export const dynamicParams = false;
export const dynamic = "force-dynamic";

/**
 * Znovu ověřit variantu nejpozději po 30 s — bez tohohle by šest stránek
 * zůstalo staticky vygenerovaných při buildu a přepnutí varianty v
 * `quiz_hosts` by se na festivalu neprojevilo bez redeploye.
 */
/**
 * Kvíz z QR kódu baviče fronty — `/kviz/<bavic>`.
 * Přístup řídí serverová politika v Supabase. Při ANO se před volbou varianty
 * vyžaduje telefonní login a návratová URL zachová baviče.
 */
export default async function KvizPage({
  params,
}: {
  params: Promise<{ bavic: string }>;
}) {
  const { bavic: slug } = await params;
  const bavic = najitBavice(slug);
  if (!bavic) notFound();

  const [policy, user, varianta] = await Promise.all([
    getQuizPolicy(),
    getSessionUser(),
    bavic.kod === PUBLIC_WEB_QUIZ_HOST.kod
      ? Promise.resolve("microbiom" as const)
      : getHostQuizVariant(bavic.kod),
  ]);
  if (policy.loginRequired && !user) {
    redirect(`/prihlaseni?next=${encodeURIComponent(`/kviz/${bavic.slug}`)}`);
  }
  const completed = await completedQuizVariants(user?.id ?? null);

  return (
    <div className="obal">
      <QuizVariantSelector bavic={bavic} recommended={varianta} completed={completed} />
    </div>
  );
}
