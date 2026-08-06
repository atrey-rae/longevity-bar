import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Konfety from "@/components/Konfety";
import VyberProduktuGrid from "@/components/VyberProduktuGrid";
import { getT } from "@/lib/i18n/server";
import { CATEGORY_EMOJI } from "@/lib/loyalty";
import { getLoyaltyState, listActiveProducts } from "@/lib/loyalty-server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.vyber.titulek };
}

export default async function VyberPage() {
  const [{ t }, user] = await Promise.all([getT(), getSessionUser()]);
  if (!user) redirect("/prihlaseni?next=/vyber");

  const stav = await getLoyaltyState(user.id);
  const odmena = stav.openReward;

  // Nemá nárok → zpět na kartu. Už vybráno → rovnou na vstupenku.
  if (!odmena) redirect("/odmeny");
  if (odmena.state === "selected") redirect(`/odmena/${odmena.id}`);

  const produkty = await listActiveProducts(odmena.category);

  return (
    <div className="obal space-y-5">
      <Konfety kusu={60} />

      <div className="text-center">
        <p className="text-6xl animate-plovouci" aria-hidden>
          {CATEGORY_EMOJI[odmena.category]}
        </p>
        <h1 className="mt-2 text-stin">{t.vyber.nadpis}</h1>
        <p className="mt-1 text-base font-semibold text-mango-400">
          {t.vernost.kategorieDlouhe[odmena.category]}
        </p>
      </div>

      <VyberProduktuGrid produkty={produkty} />

      <p className="text-center text-xs text-kokos-50/60">{t.vyber.poznamka}</p>

      <Link href="/odmeny" className="tlacitko-vedlejsi">
        {t.spolecne.zpetNaKartu}
      </Link>
    </div>
  );
}
