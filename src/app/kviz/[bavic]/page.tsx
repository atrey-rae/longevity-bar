import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import KvizFlow from "@/components/KvizFlow";
import { najitBavice } from "@/lib/kviz";
import { jeVarianta } from "@/lib/kviz-varianty";
import { prvni } from "@/lib/navigation";
import { dokonceneVarianty, getQuizPolicy } from "@/lib/quiz-policy";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kvíz Longevity Baru",
};

/**
 * Stránka je dynamická (dřív se předgenerovalo šest statických variant):
 * politika přihlášení i seznam už dokončených variant se čtou za běhu,
 * a bez session by se nedaly rozhodnout. Neznámý bavič končí na 404 stejně
 * jako dřív — jen o to teď žádá `najitBavice`, ne `dynamicParams = false`.
 */
export const dynamic = "force-dynamic";

/**
 * Kvíz z QR kódu baviče fronty — `/kviz/<bavič>`.
 *
 * Politika kvízu (migrace 006, přepíná Healing):
 *   · `login_required = true`  → nepřihlášeného pošleme na phone-first
 *     /prihlaseni s `next` zpátky na TENTO QR (bavič se tím neztratí),
 *   · `login_required = false` → anonymní průchod, duplicity hlídá
 *     best-effort hash kontaktu v server action.
 *
 * `?varianta=` je jen předvolba přepínače (pro tištěné QR s doporučenou
 * variantou); host si vždy může vybrat tu druhou.
 */
export default async function KvizPage({
  params,
  searchParams,
}: {
  params: Promise<{ bavic: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { bavic: slug } = await params;
  const bavic = najitBavice(slug);
  if (!bavic) notFound();

  const sp = await searchParams;
  const zVarianty = prvni(sp.varianta);

  const [policy, user] = await Promise.all([getQuizPolicy(), getSessionUser()]);

  if (policy.loginRequired && !user) {
    // `next` skládáme sami ze slugu z katalogu — nikdy z uživatelského vstupu,
    // takže z něj nejde udělat odkaz mimo appku.
    const cesta = jeVarianta(zVarianty)
      ? `/kviz/${bavic.slug}?varianta=${zVarianty}`
      : `/kviz/${bavic.slug}`;
    redirect(`/prihlaseni?next=${encodeURIComponent(cesta)}`);
  }

  // Doporučená varianta: QR má přednost před politikou, obojí jen předvolí.
  const doporucena = jeVarianta(zVarianty)
    ? zVarianty
    : policy.recommendedVariant;

  const hotove = user ? await dokonceneVarianty(user.id) : [];

  return (
    <div className="obal">
      <KvizFlow
        bavic={bavic}
        doporucena={doporucena}
        hotove={hotove}
        prihlasen={Boolean(user)}
      />
    </div>
  );
}
