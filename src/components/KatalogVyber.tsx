"use client";

import { KotvyKategorii, kotva } from "@/app/sortiment/_ui";
import { KATEGORIE_LABEL, type Kategorie, type KvizProdukt } from "@/lib/kviz";

/** Pořadí sekcí v katalogu — kopíruje pořadí skupin v `PRODUKTY`. */
const PORADI_KATEGORII: Kategorie[] = [
  "streva",
  "piti",
  "energie",
  "suplementy",
  "sladke",
  "slane",
  "vareni",
];

/**
 * Rozdělí katalog do sekcí podle PRVNÍ kategorie produktu — čistě zobrazovací
 * pomůcka, aby 66 dlaždic nebylo jedna nekonečná zeď. Doporučovací logika
 * v `lib/kviz.ts` ani `lib/kviz-profil.ts` se tím nemění.
 */
function seskupitPodleKategorie(
  produkty: KvizProdukt[],
): { kategorie: Kategorie; polozky: KvizProdukt[] }[] {
  return PORADI_KATEGORII.map((kategorie) => ({
    kategorie,
    polozky: produkty.filter((p) => p.kategorie[0] === kategorie),
  })).filter((s) => s.polozky.length > 0);
}

/**
 * Výběr produktu z celého sortimentu, členěný do sekcí podle kategorie.
 *
 * Sdílená komponenta obou kvízů: zkratky „už mám oblíbený produkt“ v mikrobiomové
 * variantě i rozbalení sortimentu ve variantě profilové. Dlaždice jedou v hustší
 * mřížce (`dlazdice-mala`), dotyková plocha zůstává přes 100 px.
 */
export default function KatalogVyber({
  produkty,
  vybrat,
}: {
  produkty: KvizProdukt[];
  vybrat: (produkt: KvizProdukt) => void;
}) {
  const skupiny = seskupitPodleKategorie(produkty);

  return (
    <div className="space-y-5">
      {/* Rozbalený sortiment je na mobilu přes 10 000 px. Bez kotev se v něm
          nedá vrátit ani doskočit — bere se proto stejný přilepený pás jako
          v /sortiment/*, ať je to napříč appkou jeden vzor. */}
      {skupiny.length > 1 && (
        <KotvyKategorii
          popisek="Kategorie sortimentu"
          kategorie={skupiny.map((s) => KATEGORIE_LABEL[s.kategorie])}
        />
      )}
      {skupiny.map((skupina) => (
        <div
          key={skupina.kategorie}
          id={kotva(KATEGORIE_LABEL[skupina.kategorie])}
          className="scroll-mt-32 space-y-2.5"
        >
          <p className="stitek-sekce">{KATEGORIE_LABEL[skupina.kategorie]}</p>
          <div className="grid grid-cols-2 gap-2.5">
            {skupina.polozky.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => vybrat(p)}
                className="dlazdice-mala"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {p.emoji}
                </span>
                <span className="text-[0.75rem] font-extrabold leading-[1.25] text-balance">
                  {p.nazev}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
