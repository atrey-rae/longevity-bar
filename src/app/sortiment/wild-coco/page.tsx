import type { Metadata } from "next";
import Link from "next/link";

import {
  WILD_COCO_CATALOG,
  type WildCocoCatalogCategory,
} from "@/lib/catalog-wild-coco";

export const metadata: Metadata = {
  title: "Sortiment WILD&COCO",
  description:
    "Kurátorovaný výběr fermentovaných kokosových produktů, rostlinného jídla a wellbeing sortimentu WILD&COCO.",
};

const CATEGORY_ORDER: WildCocoCatalogCategory[] = [
  "Fermentovaný kokos",
  "Nápoje",
  "Wellbeing",
  "Granoly & kakao",
  "Pomazánky",
  "Slané jídlo",
  "Kokosová spíž",
];

const CATEGORY_COPY: Record<WildCocoCatalogCategory, string> = {
  "Fermentovaný kokos": "Naše cesta začíná u mladého kokosu a času, který dostane k fermentaci.",
  Nápoje: "Čisté kokosové osvěžení pro chvíle, kdy chceš jednoduchost bez kompromisu.",
  Wellbeing: "Promyšlené formáty, které snadno zapadnou do tvé každodenní rutiny.",
  "Granoly & kakao": "Křupavé snídaně a hluboká kakaová chuť pro pomalé i rychlé momenty.",
  Pomazánky: "Hedvábné textury, prémiové suroviny a lžička, kterou se nechce odkládat.",
  "Slané jídlo": "Fermentovaná zelenina a rostlinné základy pro plnohodnotné domácí jídlo.",
  "Kokosová spíž": "Kokosové základy, se kterými dostaneš krémovost do sladkého i slaného vaření.",
};

export default function WildCocoSortimentPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-9 px-4 pb-8">
      <header className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-white/15 bg-inkoust/[0.55] px-5 py-8 text-center shadow-karta sm:px-10 sm:py-10">
        <span
          aria-hidden
          className="absolute -right-14 -top-16 h-52 w-52 rounded-full border-[34px] border-mango-400/10"
        />
        <span
          aria-hidden
          className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-laguna-400/10 blur-3xl"
        />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-mango-400">
            WILD&amp;COCO · living food
          </p>
          <h1 className="mx-auto mt-3 max-w-xl text-3xl leading-tight sm:text-4xl">
            Vezmi si chuť Longevity Baru domů
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-kokos-50/[0.76]">
            Vybrali jsme produktové rodiny, ke kterým se vracíme každý den — od
            fermentovaného mladého kokosu přes rostlinná jídla až po kokosovou
            spíž. Každý produkt otevřeš přímo v oficiálním e-shopu.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-mango-400 underline decoration-2 underline-offset-4"
          >
            ← Zpět na rozcestník
          </Link>
        </div>
      </header>

      <nav
        aria-label="Kategorie produktů WILD&COCO"
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

      {CATEGORY_ORDER.map((category, categoryIndex) => {
        const items = WILD_COCO_CATALOG.filter(
          (item) => item.category === category,
        );

        return (
          <section
            key={category}
            id={categoryId(category)}
            className="scroll-mt-24 space-y-4"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="mt-0.5 text-3xl font-black tabular-nums text-mango-400/35"
              >
                {String(categoryIndex + 1).padStart(2, "0")}
              </span>
              <div className="border-l-2 border-mango-400 pl-4">
                <h2 className="text-2xl text-kokos-50">{category}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-kokos-50/65">
                  {CATEGORY_COPY[category]}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/[0.09] shadow-karta"
                >
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-44 items-center justify-center overflow-hidden bg-kokos-100/[0.07] p-4 sm:h-52 sm:p-5"
                    aria-label={`${item.name} — otevřít v e-shopu`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      width={780}
                      height={942}
                      className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-[1.025]"
                    />
                  </a>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-mango-400">
                      {item.category}
                    </p>
                    <h3 className="mt-1.5 text-xl font-black leading-tight text-kokos-50">
                      {item.name}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-kokos-50/[0.78]">
                      {item.description}
                    </p>

                    <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {item.usps.map((usp) => (
                        <li
                          key={usp}
                          className="flex gap-2.5 text-sm font-semibold leading-snug text-kokos-50/[0.88]"
                        >
                          <span
                            aria-hidden
                            className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-mango-400"
                          />
                          <span>{usp}</span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href={item.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex min-h-12 w-full items-center justify-between rounded-2xl bg-kokos-50 px-4 py-3 text-sm font-black uppercase tracking-[0.04em] text-inkoust transition hover:bg-mango-400 active:translate-y-0.5"
                    >
                      <span>Prohlédnout v e-shopu</span>
                      <span aria-hidden className="text-lg">
                        ↗
                      </span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <aside className="rounded-[1.75rem] border border-mango-400/35 bg-gradient-to-br from-mango-400/15 to-zapad-500/10 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-mango-400">
          Nevíš, čím začít?
        </p>
        <h2 className="mt-2">Najdi svůj produkt podle chuti</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-kokos-50/70">
          Rychlý mikrobiomový kvíz ti ukáže produkty, které by tě mohly bavit.
        </p>
        <Link href="/kviz/web" className="tlacitko-hlavni mt-5">
          Spustit kvíz
        </Link>
      </aside>
    </div>
  );
}

function categoryId(category: WildCocoCatalogCategory): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
