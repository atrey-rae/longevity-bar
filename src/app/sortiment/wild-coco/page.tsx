import type { Metadata } from "next";
import Link from "next/link";

import {
  WILD_COCO_CATALOG,
  type WildCocoCatalogCategory,
} from "@/lib/catalog-wild-coco";

import { HlavickaSekce, KotvyKategorii, StitkyUsp, kotva } from "../_ui";

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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-8 sm:space-y-8">
      <header className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-inkoust/[0.55] px-5 py-7 text-center shadow-karta sm:px-10 sm:py-10">
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
          <h1 className="mx-auto mt-3 max-w-md text-3xl leading-tight sm:text-4xl">
            Vezmi si chuť Longevity Baru domů
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-kokos-50/[0.76]">
            Vybrali jsme produktové rodiny, ke kterým se vracíme každý den — od
            fermentovaného mladého kokosu přes rostlinná jídla až po kokosovou
            spíž. Každý produkt otevřeš přímo v oficiálním e-shopu.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-mango-400 underline decoration-2 underline-offset-4"
          >
            ← Zpět na rozcestník
          </Link>
        </div>
      </header>

      <KotvyKategorii
        popisek="Kategorie produktů WILD&COCO"
        kategorie={CATEGORY_ORDER}
      />

      {CATEGORY_ORDER.map((category) => {
        const items = WILD_COCO_CATALOG.filter(
          (item) => item.category === category,
        );

        return (
          <section
            key={category}
            id={kotva(category)}
            className="scroll-mt-32 space-y-4"
          >
            <HlavickaSekce nadpis={category} popis={CATEGORY_COPY[category]} />

            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="karta-produkt group h-full">
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="police-fotky"
                    aria-label={`${item.name} — otevřít v e-shopu`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      width={780}
                      height={942}
                      className="fotka-produktu"
                    />
                    <span aria-hidden className="stitek-police">
                      {item.category}
                    </span>
                  </a>

                  <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                    <h3 className="text-lg font-black leading-tight text-kokos-50 sm:text-xl">
                      {item.name}
                    </h3>

                    <p className="text-sm leading-relaxed text-kokos-50/[0.78]">
                      {item.description}
                    </p>

                    <StitkyUsp usps={item.usps} dole />

                    <a
                      href={item.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-sm font-black uppercase tracking-[0.04em] text-kokos-50 transition hover:border-kokos-50 hover:bg-kokos-50 hover:text-inkoust active:translate-y-0.5"
                    >
                      <span>Prohlédnout v e-shopu</span>
                      <span aria-hidden className="text-lg text-mango-400">
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

      <aside className="rounded-3xl border border-mango-400/35 bg-gradient-to-br from-mango-400/15 to-zapad-500/10 p-5 text-center sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-mango-400">
          Nevíš, čím začít?
        </p>
        <h2 className="mt-2">Najdi svůj produkt podle chuti</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-kokos-50/[0.72]">
          Rychlý mikrobiomový kvíz ti ukáže produkty, které by tě mohly bavit.
        </p>
        <Link href="/kviz/web" className="tlacitko-hlavni mt-5">
          Spustit kvíz
        </Link>
      </aside>
    </div>
  );
}
