import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import QuizVariantSelector from "@/components/QuizVariantSelector";
import { getT } from "@/lib/i18n/server";
import {
  PUBLIC_WEB_QUIZ_HOST,
  VSICHNI_HOSTE,
  najitBavice,
} from "@/lib/kviz";
import { getHostQuizVariant } from "@/lib/kviz-hosts";
import { prvni } from "@/lib/navigation";
import { completedQuizVariants, getQuizPolicy } from "@/lib/quiz-access";
import { REFERRAL_PARAM, normalizovatReferralKod, sReferralem } from "@/lib/referral";
import { getSessionUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.kviz.titulek };
}

/**
 * Devět bavičů (A1–I9) a tři samostatné vstupy — veřejný `web` z rozcestníku
 * Bar.app, týmový `tym` z QR záložky Healing.app a osobní `vit`. Seznam je
 * jediný (`VSICHNI_HOSTE`), aby nová adresa nikdy neexistovala v `najitBavice`
 * a zároveň chyběla mezi statickými parametry.
 */
export function generateStaticParams(): { bavic: string }[] {
  return VSICHNI_HOSTE.map((b) => ({ bavic: b.slug }));
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
 * vyžaduje telefonní login a návratová URL zachová baviče I referral kód.
 *
 * Parametr `?od=<KOD>` (osobní QR zákazníka ze sekce „Dárek přátelům“) se čte
 * na KAŽDÉM vstupu do kvízu, ne jen na `web` — QR kód si může půjčit kdokoli.
 * Neplatná hodnota se mlčky zahodí: host o referralu nikdy nesmí vědět, natož
 * kvůli němu dostat chybu.
 */
export default async function KvizPage({
  params,
  searchParams,
}: {
  params: Promise<{ bavic: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ bavic: slug }, sp] = await Promise.all([params, searchParams]);
  const bavic = najitBavice(slug);
  if (!bavic) notFound();

  const referralKod = normalizovatReferralKod(prvni(sp[REFERRAL_PARAM]));

  // `WEB` nemá řádek v `quiz_hosts` a nastavovat se nedá — veřejný rozcestník
  // ukazuje vždy tříotázkový microbiom. Všichni ostatní včetně týmového `TYM`
  // čtou variantu z `quiz_hosts` (fail-open na `DEFAULT_QUIZ_VARIANT`).
  const [policy, user, varianta] = await Promise.all([
    getQuizPolicy(),
    getSessionUser(),
    bavic.kod === PUBLIC_WEB_QUIZ_HOST.kod
      ? Promise.resolve("microbiom" as const)
      : getHostQuizVariant(bavic.kod),
  ]);
  if (policy.loginRequired && !user) {
    // Referral musí přežít i přihlášení, jinak by se kamarád po loginu vrátil
    // na kvíz bez `?od=` a pozvánka by se nikomu nepřipsala.
    const cil = sReferralem(`/kviz/${bavic.slug}`, referralKod);
    redirect(`/prihlaseni?next=${encodeURIComponent(cil)}`);
  }
  const completed = await completedQuizVariants(user?.id ?? null);

  return (
    <div className="obal">
      <QuizVariantSelector
        bavic={bavic}
        recommended={varianta}
        completed={completed}
        referralKod={referralKod}
      />
    </div>
  );
}
