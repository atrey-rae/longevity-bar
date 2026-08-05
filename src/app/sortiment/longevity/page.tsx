import type { Metadata } from "next";
import Link from "next/link";

import {
  LONGEVITY_BAR_CATALOG,
  type CatalogCategory,
} from "@/lib/catalog-longevity";

import {
  HlavickaSekce,
  KotvyKategorii,
  StitkyUsp,
  kotva,
  monogram,
} from "../_ui";

export const metadata: Metadata = {
  title: "Sortiment Longevity Baru",
  description:
    "Nápoje, káva, jídlo a retail sortiment Longevity Baru na Healing Festivalu.",
};

const CATEGORY_ORDER: CatalogCategory[] = [
  "Studené nápoje",
  "Káva & kakao",
  "Přídavky",
  "Jídlo",
  "Retail",
];

const CATEGORY_SUBTITLE: Record<CatalogCategory, string> = {
  "Studené nápoje": "Vychlazené, fermentované i míchané přímo na baru",
  "Káva & kakao": "Výběrová káva a kakaové rituály v našem podání",
  Přídavky: "Malé botanické detaily, kterými si nápoj doladíš",
  Jídlo: "Snídaně, slané jídlo i sladká festivalová tečka",
  Retail: "Oblíbené produkty WILD&COCO, které si odneseš domů",
};

export default function LongevitySortimentPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-8 sm:space-y-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-mango-400">
          Longevity Bar · festivalové menu
        </p>
        <h1 className="mx-auto mt-3 max-w-md text-3xl sm:text-4xl">
          Najdi si, na co máš právě chuť
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-kokos-50/[0.76]">
          Od čerstvé kokosové vody přes výběrovou kávu až po snídaňové bowls.
          Sortiment jsme poskládali tak, aby sis mohl dát rychlé osvěžení i celý
          chuťový rituál.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-mango-400 underline decoration-2 underline-offset-4"
        >
          ← Zpět na rozcestník
        </Link>
      </header>

      <KotvyKategorii popisek="Kategorie sortimentu" kategorie={CATEGORY_ORDER} />

      {CATEGORY_ORDER.map((category) => {
        const items = LONGEVITY_BAR_CATALOG.filter(
          (item) => item.category === category,
        );

        return (
          <section
            key={category}
            id={kotva(category)}
            className="scroll-mt-32 space-y-4"
          >
            <HlavickaSekce
              nadpis={category}
              popis={CATEGORY_SUBTITLE[category]}
            />

            <div className="grid items-start gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="karta-produkt group">
                  {item.imageUrl && (
                    <div className="police-fotky">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={500}
                        className="fotka-produktu"
                      />
                      {item.format && (
                        <span className="stitek-format">{item.format}</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                    {item.imageUrl ? (
                      <h3 className="text-lg font-black leading-tight text-kokos-50 sm:text-xl">
                        {item.name}
                      </h3>
                    ) : (
                      <div className="flex items-start gap-3.5">
                        <span aria-hidden className="monogram">
                          {monogram(item.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black leading-tight text-kokos-50 sm:text-xl">
                            {item.name}
                          </h3>
                          {item.format && (
                            <span className="mt-1.5 inline-block rounded-full bg-mango-400/[0.16] px-2.5 py-0.5 text-[0.7rem] font-black text-mango-300">
                              {item.format}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-sm leading-relaxed text-kokos-50/[0.78]">
                      {item.description}
                    </p>

                    <StitkyUsp usps={item.usps} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <div className="rounded-3xl border border-mango-400/35 bg-mango-400/10 p-5 text-center sm:p-6">
        <p className="text-lg font-black">Už máš svého favorita?</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-kokos-50/[0.72]">
          Stav se za námi u baru a nech si poradit podle chuti.
        </p>
        <Link href="/odmeny" className="tlacitko-hlavni mt-5">
          Otevřít věrnostní kartu
        </Link>
      </div>
    </div>
  );
}
