import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Konfety from "@/components/Konfety";
import VyberProduktuGrid from "@/components/VyberProduktuGrid";
import { CATEGORY_EMOJI, CATEGORY_LABEL_LONG } from "@/lib/loyalty";
import { getLoyaltyState, listActiveProducts } from "@/lib/loyalty-server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Vyber si odměnu" };

export default async function VyberPage() {
  const user = await getSessionUser();
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
        <h1 className="mt-2 text-stin">Vyhráváš! Vyber si:</h1>
        <p className="mt-1 text-base font-semibold text-mango-400">
          {CATEGORY_LABEL_LONG[odmena.category]}
        </p>
      </div>

      <VyberProduktuGrid produkty={produkty} />

      <p className="text-center text-xs text-kokos-50/60">
        Vybíráš jen z toho, co je právě skladem. Po výběru ukážeš obrazovku
        obsluze u pokladny.
      </p>

      <Link href="/odmeny" className="tlacitko-vedlejsi">
        Zpět na kartu
      </Link>
    </div>
  );
}
