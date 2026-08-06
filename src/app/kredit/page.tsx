import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import KreditObjednavka from "@/components/KreditObjednavka";
import VydejKreditu from "@/components/VydejKreditu";
import ZiveHodiny from "@/components/ZiveHodiny";
import ZkusitZnovu from "@/components/ZkusitZnovu";
import ZrusitObjednavku from "@/components/ZrusitObjednavku";
import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import type { BarCreditObjednavka } from "@/lib/healing-credit";
import { getT } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/types";
import { VSTUPENKY_ID, predvyplneneZalohy } from "@/lib/kredit-ui";
import { getSessionUser } from "@/lib/supabase/server";
import { korun } from "@/lib/text";
import { formatCzechDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.kredit.titulek };
}

/**
 * Kredit hosta (typ HOST z Healing.app) na Longevity Baru.
 *
 * Zdroj pravdy je Healing.app — tady se jen zobrazuje, objednává a vydává.
 * Kdykoli bridge nedostupný nebo host kredit nemá, stránka to řekne rovnou
 * a nic nepředstírá (fail-closed, viz `lib/healing-credit.ts`).
 */
export default async function KreditPage() {
  const [{ lang, t }, user] = await Promise.all([getT(), getSessionUser()]);
  if (!user) redirect(`/prihlaseni?next=${encodeURIComponent("/kredit")}`);

  const { stav } = await barCreditProUzivatele(user.id);

  // „Nevíme“ se od „nemáš“ musí lišit. Když most mlčí, nesmí appka hostovi
  // tvrdit, že nárok nemá — nabídne opakování a cestu k obsluze.
  if (stav.dostupnost === "nedostupny") {
    return (
      <div className="obal space-y-5">
        <div className="karta space-y-3 text-center">
          <p className="text-5xl" aria-hidden>
            📡
          </p>
          <h1 className="text-stin">{t.kredit.nedostupnyNadpis}</h1>
          <p className="text-sm leading-relaxed text-kokos-50/80">
            {t.kredit.nedostupnyPopis}
          </p>
        </div>
        <ZkusitZnovu />
        <Link href="/" className="tlacitko-vedlejsi">
          {t.spolecne.zpetNaRozcestnik}
        </Link>
      </div>
    );
  }

  if (!stav.eligible || !stav.credit) {
    return (
      <div className="obal space-y-5">
        <div className="karta space-y-3 text-center">
          <p className="text-5xl" aria-hidden>
            🫙
          </p>
          <h1 className="text-stin">{t.kredit.zadnyNadpis}</h1>
          <p className="text-sm leading-relaxed text-kokos-50/80">
            {t.kredit.zadnyPopis}
          </p>
        </div>
        <Link href="/" className="tlacitko-vedlejsi">
          {t.spolecne.zpetNaRozcestnik}
        </Link>
      </div>
    );
  }

  const { credit, catalog, orders } = stav;
  const kCekani = orders.filter((objednavka) => objednavka.issuedAt === null);
  const vydane = orders.filter((objednavka) => objednavka.issuedAt !== null);

  return (
    <div className="obal space-y-5">
      <section className="rounded-[2rem] border border-white/15 bg-inkoust/[0.45] px-5 pb-6 pt-7 shadow-karta">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-mango-400">
          {t.kredit.eyebrow}
        </p>
        <p className="mt-3 text-[2.6rem] font-black leading-none tabular-nums text-kokos-50">
          {korun(credit.remaining)}
        </p>
        {/* Poměr utraceno : zbývá jedním pohledem — řádek pod ním ho jen
            pojmenuje čísly. Ryze dekorativní, proto `aria-hidden`. */}
        {credit.total > 0 && (
          <div
            aria-hidden
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full bg-mango-400"
              style={{
                width: `${Math.max(0, Math.min(100, (credit.remaining / credit.total) * 100))}%`,
              }}
            />
          </div>
        )}
        <p className="mt-2.5 text-sm font-semibold tabular-nums text-kokos-50/80">
          {t.kredit.zustatek(korun(credit.total), korun(credit.spent))}
        </p>
      </section>

      {/* `id` je kotva, na kterou po objednání odscrolluje `KreditObjednavka`.
          Bez ní host po stisku „Objednat“ zůstal viset dole u katalogu
          a nově vzniklou vstupenku nad sebou vůbec neviděl. */}
      {kCekani.length > 0 && (
        <section id={VSTUPENKY_ID} className="scroll-mt-20 space-y-4">
          <h2 className="px-1 text-center text-sm font-black uppercase tracking-widest text-mango-400">
            {kCekani.length === 1
              ? t.kredit.ukazObsluze
              : t.kredit.ukazObsluzeVice}
          </h2>
          {kCekani.map((objednavka) => (
            <Vstupenka key={objednavka.id} objednavka={objednavka} t={t} />
          ))}
        </section>
      )}

      {catalog.length > 0 && credit.remaining > 0 && (
        /* Bez vnější „karty“: řádky katalogu jsou samy karty a sklo ve skle
           z nich dělalo šedou kaši. Nadpis jede stejným štítkem jako sekce
           v kvízu i v katalozích — jeden systém napříč appkou. */
        <section className="space-y-3">
          {/* O stupeň silnější než „Už vydáno“: tohle je pozvánka k akci,
              historie je jen archiv. Rodina štítku zůstává stejná. */}
          <h2 className="stitek-sekce text-[0.78rem] text-kokos-50">
            {t.kredit.coSiDas}
          </h2>
          <KreditObjednavka katalog={catalog} zbyva={credit.remaining} />
        </section>
      )}

      {catalog.length > 0 && credit.remaining <= 0 && (
        <p className="karta text-center text-sm font-semibold text-kokos-50/80">
          {t.kredit.vycerpano}
        </p>
      )}

      {/* Historie je archiv, ne akce: sbalená, ať na obrazovce zůstane vidět
          živá vstupenka a výběr. Po rozkliknutí jen kompaktní řádky — rozpad
          položek patří na vstupenku, tady by z historie udělal zeď textu. */}
      {vydane.length > 0 && (
        <details className="karta">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-black uppercase tracking-[0.14em] text-kokos-50/80 transition hover:text-kokos-50">
            {t.kredit.historieNadpis}
            <span
              aria-hidden
              className="shrink-0 text-lg font-normal leading-none text-kokos-50/60"
            >
              ▾
            </span>
          </summary>
          <ul className="mt-3.5 space-y-2">
            {vydane.map((objednavka) => (
              <li
                key={objednavka.id}
                className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-2 text-sm first:border-0 first:pt-0"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-kokos-50/90">
                    {formatCzechDateTime(objednavka.issuedAt, lang)}
                  </span>
                  <span className="block text-xs tabular-nums text-kokos-50/60">
                    {t.kredit.historiePocet(pocetKusu(objednavka))}
                  </span>
                </span>
                <span className="shrink-0 font-black tabular-nums text-kokos-50/80">
                  {korun(objednavka.total)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Link href="/" className="tlacitko-vedlejsi">
        {t.spolecne.zpetNaRozcestnik}
      </Link>
    </div>
  );
}

/** Kolik kusů celkem objednávka nesla — jediné číslo, které historie potřebuje. */
function pocetKusu(objednavka: BarCreditObjednavka): number {
  return objednavka.items.reduce((celkem, radek) => celkem + radek.qty, 0);
}

/**
 * Živá vstupenka na výdej — stejný vzor jako u věrnostní odměny: běžící
 * hodiny a pruh dokazují obsluze, že nejde o screenshot.
 */
function Vstupenka({
  objednavka,
  t,
}: {
  objednavka: BarCreditObjednavka;
  t: Dict;
}) {
  return (
    <div className="zivy-preliv rounded-[2rem] p-1.5 shadow-karta">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-inkoust/90 px-5 py-7">
        <span
          className="animate-skenPruh pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/25 to-transparent"
          aria-hidden
        />
        <p className="relative text-center text-xs font-bold uppercase tracking-widest text-white/60">
          {t.kredit.objednavkaZKreditu}
        </p>
        <ul className="relative mt-3 space-y-1 text-center">
          {objednavka.items.map((radek) => (
            <li
              key={radek.id}
              className="text-xl font-black leading-tight text-white text-stin"
            >
              {radek.qty}× {radek.n}
            </li>
          ))}
        </ul>
        <p className="relative mt-2.5 text-center text-base font-black tabular-nums text-mango-400">
          {korun(objednavka.total)}
        </p>

        <div className="relative mt-6">
          <ZiveHodiny />
        </div>

        {/* Stejný předěl jako u věrnostní odměny: nahoře DŮKAZ pro obsluhu,
            pod linkou AKCE. Na /odmena je akce ve vlastní kartě — tady musí
            zůstat u své objednávky (může jich čekat víc), linku proto dělá
            oddělovač uvnitř lístku. */}
        <div className="relative mt-6 border-t border-white/10 pt-5">
          <VydejKreditu
            orderId={objednavka.id}
            vychoziZalohy={
              objednavka.deposits ?? predvyplneneZalohy(objednavka.items)
            }
          />
          <p className="mt-2.5 text-center text-xs leading-relaxed text-white/60">
            {t.kredit.jenObsluha}
          </p>

          {/* Únikový východ pro hosta, který si to rozmyslel. Záměrně BEZ
              plochy a barvy — vedle VYDAT nesmí působit jako rovnocenná
              volba, jinak by obsluha u pultu mačkala špatné tlačítko. */}
          <div className="mt-4">
            <ZrusitObjednavku orderId={objednavka.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
