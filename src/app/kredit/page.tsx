import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import KreditObjednavka from "@/components/KreditObjednavka";
import VydatTlacitko from "@/components/VydatTlacitko";
import ZiveHodiny from "@/components/ZiveHodiny";
import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import type { BarCreditObjednavka } from "@/lib/healing-credit";
import { getSessionUser } from "@/lib/supabase/server";
import { korun } from "@/lib/text";
import { formatCzechDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kredit na Longevity Baru" };

/**
 * Kredit hosta (typ HOST z Healing.app) na Longevity Baru.
 *
 * Zdroj pravdy je Healing.app — tady se jen zobrazuje, objednává a vydává.
 * Kdykoli bridge nedostupný nebo host kredit nemá, stránka to řekne rovnou
 * a nic nepředstírá (fail-closed, viz `lib/healing-credit.ts`).
 */
export default async function KreditPage() {
  const user = await getSessionUser();
  if (!user) redirect(`/prihlaseni?next=${encodeURIComponent("/kredit")}`);

  const { stav } = await barCreditProUzivatele(user.id);

  if (!stav.eligible || !stav.credit) {
    return (
      <div className="obal space-y-5">
        <div className="karta space-y-3 text-center">
          <p className="text-5xl" aria-hidden>
            🫙
          </p>
          <h1 className="text-stin">Kredit tu na tebe nečeká</h1>
          <p className="text-sm leading-relaxed text-kokos-50/80">
            Kredit na Longevity Baru mají hosté festivalu, kterým ho přidělil
            tým v Healing appce. Když si myslíš, že tam tvůj je, ozvi se
            obsluze u baru.
          </p>
        </div>
        <Link href="/" className="tlacitko-vedlejsi">
          Zpět na rozcestník
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
          Kredit na Longevity Baru
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
          zbývá z {korun(credit.total)} · utraceno {korun(credit.spent)}
        </p>
      </section>

      {kCekani.length > 0 && (
        <section className="space-y-4">
          <h2 className="px-1 text-center text-sm font-black uppercase tracking-widest text-mango-400">
            {kCekani.length === 1
              ? "Ukaž obsluze u baru"
              : "Ukaž obsluze u baru (čeká víc objednávek)"}
          </h2>
          {kCekani.map((objednavka) => (
            <Vstupenka key={objednavka.id} objednavka={objednavka} />
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
          <h2 className="stitek-sekce text-[0.78rem] text-kokos-50">Co si dáš?</h2>
          <KreditObjednavka katalog={catalog} zbyva={credit.remaining} />
        </section>
      )}

      {catalog.length > 0 && credit.remaining <= 0 && (
        <p className="karta text-center text-sm font-semibold text-kokos-50/80">
          Kredit máš vyčerpaný. Díky, že jsi ho utratil u nás!
        </p>
      )}

      {vydane.length > 0 && (
        <section className="karta space-y-2.5">
          <h2 className="stitek-sekce">Už vydáno</h2>
          <ul className="space-y-2">
            {vydane.map((objednavka) => (
              <li
                key={objednavka.id}
                className="flex items-start justify-between gap-3 border-t border-white/10 pt-2 text-sm first:border-0 first:pt-0"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-kokos-50">
                    {shrnutiPolozek(objednavka)}
                  </span>
                  <span className="block text-xs text-kokos-50/60">
                    {formatCzechDateTime(objednavka.issuedAt)}
                  </span>
                </span>
                <span className="shrink-0 font-black tabular-nums text-kokos-50/80">
                  {korun(objednavka.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/" className="tlacitko-vedlejsi">
        Zpět na rozcestník
      </Link>
    </div>
  );
}

/** „2× Kokosová voda · 1× Cocofir“ — bez cen, ty jsou v součtu. */
function shrnutiPolozek(objednavka: BarCreditObjednavka): string {
  if (objednavka.items.length === 0) return "Objednávka z kreditu";
  return objednavka.items.map((radek) => `${radek.qty}× ${radek.n}`).join(" · ");
}

/**
 * Živá vstupenka na výdej — stejný vzor jako u věrnostní odměny: běžící
 * hodiny a pruh dokazují obsluze, že nejde o screenshot.
 */
function Vstupenka({ objednavka }: { objednavka: BarCreditObjednavka }) {
  return (
    <div className="zivy-preliv rounded-[2rem] p-1.5 shadow-karta">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-inkoust/90 px-5 py-7">
        <span
          className="animate-skenPruh pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/25 to-transparent"
          aria-hidden
        />
        <p className="relative text-center text-xs font-bold uppercase tracking-widest text-white/60">
          Objednávka z kreditu
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
          <VydatTlacitko
            endpoint="/api/kredit/vydat"
            telo={{ orderId: objednavka.id }}
          />
          <p className="mt-2.5 text-center text-xs leading-relaxed text-white/60">
            Tlačítko mačká jen obsluha. Když ho zmáčkneš sám, objednávka se
            odepíše z kreditu.
          </p>
        </div>
      </div>
    </div>
  );
}
