import type { Metadata } from "next";
import Link from "next/link";

import {
  LONGEVITY_BAR_CATALOG,
  type CatalogCategory,
} from "@/lib/catalog-longevity";
import { getT } from "@/lib/i18n/server";

import {
  HlavickaSekce,
  KotvyKategorii,
  StitkyUsp,
  kotva,
  monogram,
} from "../_ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.sortiment.longevity.titulek,
    description: t.sortiment.longevity.popisMeta,
  };
}

const CATEGORY_ORDER: CatalogCategory[] = [
  "Studené nápoje",
  "Káva & kakao",
  "Přídavky",
  "Jídlo",
  "Retail",
];

export default async function LongevitySortimentPage() {
  const { t } = await getT();
  const s = t.sortiment.longevity;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-8 sm:space-y-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-mango-400">
          {s.eyebrow}
        </p>
        <h1 className="mx-auto mt-3 max-w-md text-3xl sm:text-4xl">{s.nadpis}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-kokos-50/[0.76]">
          {s.podnadpis}
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-mango-400 underline decoration-2 underline-offset-4"
        >
          {s.zpet}
        </Link>
      </header>

      <KotvyKategorii
        popisek={t.sortiment.kategorieLabel}
        kategorie={CATEGORY_ORDER.map((category) => ({
          id: kotva(category),
          label: s.kategorie[category],
        }))}
      />

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
              nadpis={s.kategorie[category]}
              popis={s.podnadpisy[category]}
            />

            <div className="grid items-start gap-4 sm:grid-cols-2">
              {items.map((item) => {
                // Názvy produktů se nepřekládají — jsou to obchodní názvy.
                const texty = s.polozky[item.id];
                const format = texty?.format ?? item.format;

                return (
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
                        {format && (
                          <span className="stitek-format">{format}</span>
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
                            {format && (
                              <span className="mt-1.5 inline-block rounded-full bg-mango-400/[0.16] px-2.5 py-0.5 text-[0.7rem] font-black text-mango-300">
                                {format}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-sm leading-relaxed text-kokos-50/[0.78]">
                        {texty?.description ?? item.description}
                      </p>

                      <StitkyUsp usps={texty?.usps ?? item.usps} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="rounded-3xl border border-mango-400/35 bg-mango-400/10 p-5 text-center sm:p-6">
        <p className="text-lg font-black">{s.ctaNadpis}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-kokos-50/[0.72]">
          {s.ctaPopis}
        </p>
        <Link href="/odmeny" className="tlacitko-hlavni mt-5">
          {s.ctaTlacitko}
        </Link>
      </div>
    </div>
  );
}
