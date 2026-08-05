import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Konfety from "@/components/Konfety";
import VydatTlacitko from "@/components/VydatTlacitko";
import ZiveHodiny from "@/components/ZiveHodiny";
import { CATEGORY_EMOJI, CATEGORY_LABEL } from "@/lib/loyalty";
import { getRewardForUser } from "@/lib/loyalty-server";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/supabase/server";
import { formatCzechDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tvoje odměna" };

export default async function OdmenaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/prihlaseni?next=${encodeURIComponent(`/odmena/${id}`)}`);

  const data = await getRewardForUser(user.id, id);
  if (!data) notFound();

  const { reward, product } = data;

  // Ještě není vybráno → pošli na výběr.
  if (reward.state === "ready") redirect("/vyber");

  const nazev = product?.name ?? CATEGORY_LABEL[reward.category];
  const emoji = product?.emoji ?? CATEGORY_EMOJI[reward.category];

  /* ---------------------------------------------------------------- */
  /* Už vydáno                                                         */
  /* ---------------------------------------------------------------- */
  if (reward.state === "redeemed") {
    return (
      <div className="obal space-y-6">
        <Konfety kusu={36} />
        <div className="karta-svetla text-center">
          <p className="text-7xl" aria-hidden>
            ✅
          </p>
          <h1 className="mt-2 text-inkoust">Vydáno</h1>
          <p className="mt-1 text-lg font-bold text-inkoust/80">{nazev}</p>
          <p className="mt-2 text-sm text-inkoust/60">
            {formatCzechDateTime(reward.redeemed_at)}
          </p>
        </div>

        <Link href="/odmeny" className="tlacitko-hlavni">
          Chci dál sbírat odměny
        </Link>

        <p className="text-center text-sm text-kokos-50/70">
          Díky za nákup! Další razítko dostaneš u pokladny při dalším nákupu.
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Vstupenka na odměnu                                               */
  /* ---------------------------------------------------------------- */
  const settings = await getSettings();

  return (
    <div className="obal space-y-5">
      <div className="text-center">
        <h1 className="text-stin">Ukaž u pokladny</h1>
        <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-mango-400">
          Obsluha ověří živou obrazovku
        </p>
      </div>

      {/* Vstupenka — živý přeliv, běžící pruh a hodiny = důkaz, že nejde
          o screenshot. */}
      <div className="zivy-preliv rounded-[2rem] p-1.5 shadow-karta">
        <div className="relative overflow-hidden rounded-[1.6rem] bg-inkoust/90 px-5 py-7">
          {/* běžící světelný pruh */}
          <span
            className="animate-skenPruh pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/25 to-transparent"
            aria-hidden
          />
          {/* pulsující kruhy okolo emoji */}
          <div className="relative flex justify-center">
            <span
              className="animate-pulsRing absolute h-24 w-24 rounded-full border-4 border-mango-400"
              aria-hidden
            />
            <span className="relative text-7xl" aria-hidden>
              {emoji}
            </span>
          </div>

          <p className="relative mt-5 text-center text-3xl font-black leading-tight text-white text-stin">
            {nazev}
          </p>
          {product?.description && (
            <p className="relative mt-1 text-center text-sm font-semibold uppercase tracking-widest text-white/70">
              {product.description}
            </p>
          )}

          <div className="relative mt-6">
            <ZiveHodiny />
          </div>

          <p className="relative mt-5 text-center text-xs font-bold uppercase tracking-widest text-white/60">
            Odměna zdarma · Longevity Bar
          </p>
        </div>
      </div>

      <div className="karta space-y-3">
        <p className="text-center text-sm font-semibold text-kokos-50/85">
          Obsluha vydá produkt a{" "}
          <strong className="text-mango-400">podrží 3 s</strong> tlačítko níže.
        </p>
        <VydatTlacitko
          rewardId={reward.id}
          vyzadujePin={settings.staffPin !== null}
        />
        <p className="text-center text-xs text-kokos-50/60">
          Tlačítko mačká jen obsluha. Když ho zmáčkneš sám, o odměnu přijdeš.
        </p>
      </div>

      <Link href="/odmeny" className="tlacitko-vedlejsi">
        Zpět na kartu
      </Link>
    </div>
  );
}
