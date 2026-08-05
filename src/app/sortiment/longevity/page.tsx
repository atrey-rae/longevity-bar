import type { Metadata } from "next";
import Link from "next/link";

import {
  LONGEVITY_BAR_CATALOG,
  type CatalogCategory,
} from "@/lib/catalog-longevity";

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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-mango-400">
          Longevity Bar · festivalové menu
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl">Najdi si, na co máš právě chuť</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-kokos-50/75">
          Od čerstvé kokosové vody přes výběrovou kávu až po snídaňové bowls.
          Sortiment jsme poskládali tak, aby sis mohl dát rychlé osvěžení i celý
          chuťový rituál.
        </p>
        <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-mango-400 underline decoration-2 underline-offset-4">
          ← Zpět na rozcestník
        </Link>
      </header>

      <nav
        aria-label="Kategorie sortimentu"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
      >
        {CATEGORY_ORDER.map((category) => (
          <a
            key={category}
            href={`#${categoryId(category)}`}
            className="min-h-11 shrink-0 snap-start rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-kokos-50 transition hover:bg-white/20"
          >
            {category}
          </a>
        ))}
      </nav>

      {CATEGORY_ORDER.map((category) => {
        const items = LONGEVITY_BAR_CATALOG.filter(
          (item) => item.category === category,
        );

        return (
          <section key={category} id={categoryId(category)} className="scroll-mt-24 space-y-4">
            <div className="border-l-4 border-mango-400 pl-4">
              <h2 className="text-2xl text-kokos-50">{category}</h2>
              <p className="mt-1 text-sm text-kokos-50/65">
                {CATEGORY_SUBTITLE[category]}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/[0.09] shadow-karta"
                >
                  {item.imageUrl ? (
                    <div className="flex h-44 items-center justify-center overflow-hidden bg-kokos-100/[0.07] p-4 sm:h-52 sm:p-5">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={500}
                        className="max-h-full max-w-full object-contain transition duration-500 hover:scale-[1.025]"
                      />
                    </div>
                  ) : (
                    <div
                      aria-hidden
                      className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-laguna-500/70 via-laguna-700 to-inkoust"
                    >
                      <span className="absolute -bottom-8 -right-2 h-32 w-32 rounded-full border-[20px] border-mango-400/15" />
                      <span className="absolute left-5 top-5 text-[0.65rem] font-black uppercase tracking-[0.24em] text-mango-300">
                        WILD&amp;COCO selection
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 p-5">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="max-w-[18rem] text-xl font-black leading-tight text-kokos-50">
                          {item.name}
                        </h3>
                        {item.format && (
                          <span className="rounded-full bg-mango-400/15 px-3 py-1 text-xs font-black text-mango-300">
                            {item.format}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-kokos-50/78">
                        {item.description}
                      </p>
                    </div>

                    <ul className="space-y-2 border-t border-white/10 pt-4">
                      {item.usps.map((usp) => (
                        <li
                          key={usp}
                          className="flex gap-2.5 text-sm font-semibold leading-snug text-kokos-50/[0.88]"
                        >
                          <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-mango-400" />
                          <span>{usp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <div className="rounded-[1.75rem] border border-mango-400/35 bg-mango-400/10 p-5 text-center">
        <p className="text-lg font-black">Už máš svého favorita?</p>
        <p className="mt-1 text-sm text-kokos-50/70">
          Stav se za námi u baru a nech si poradit podle chuti.
        </p>
        <Link href="/odmeny" className="tlacitko-hlavni mt-4">
          Otevřít věrnostní kartu
        </Link>
      </div>
    </div>
  );
}

function categoryId(category: CatalogCategory): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
