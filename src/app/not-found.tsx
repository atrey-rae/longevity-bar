import Link from "next/link";

import { getT } from "@/lib/i18n/server";

export default async function NenalezenoPage() {
  const { t } = await getT();

  return (
    <div className="obal space-y-5 text-center">
      <p className="text-7xl" aria-hidden>
        🥥
      </p>
      <h1>{t.nenalezeno.nadpis}</h1>
      <p className="text-base text-kokos-50/80">{t.nenalezeno.popis}</p>
      {/* Tlačítko míří na rozcestník, tak se tak musí i jmenovat — „Zpět na
          kartu“ u odkazu na „/“ slibovalo věrnostní kartu a vedlo jinam. */}
      <Link href="/" className="tlacitko-hlavni">
        {t.spolecne.zpetNaRozcestnik}
      </Link>
    </div>
  );
}
