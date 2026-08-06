"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { odeslatKvizLead, type VysledekKuponu } from "@/app/kviz/actions";
import KatalogVyber from "@/components/KatalogVyber";
import Konfety from "@/components/Konfety";
import { useLang, useT } from "@/lib/i18n/client";
import type { Dict } from "@/lib/i18n/types";
import { sazba } from "@/lib/text";
import {
  ESHOP_URL,
  OTAZKA_1,
  OTAZKA_2,
  OTAZKA_3,
  PRAZDNY_KONTAKT,
  PRODUKTY,
  doporucitProdukty,
  type Bavic,
  type KvizProdukt,
  type Moznost,
  type OdpovedQ1,
  type OdpovedQ2,
  type OdpovedQ3,
  type PredvyplnenyKontakt,
} from "@/lib/kviz";

type Krok = "uvod" | "q1" | "q2" | "q3" | "vyber" | "formular";

const PREDCHOZI: Record<Exclude<Krok, "uvod">, Krok> = {
  q1: "uvod",
  q2: "q1",
  q3: "q2",
  vyber: "q3",
  formular: "vyber",
};

const POCET_OTAZEK = 3;

/**
 * Kvíz „Odemkni potenciál svého mikrobiomu“ — tři klepnutí, výběr produktu,
 * kontakt, kupón. Celý stav žije v prohlížeči; server se volá až při odeslání
 * kontaktu.
 *
 * Otázky a odpovědi se berou ze slovníku (`t.kviz.q1…q3`), zatímco `hodnota`
 * odpovědi zůstává z `lib/kviz.ts` — doporučovací logika je tak na jazyku
 * nezávislá a kontrolní skripty ji dál testují nad českými konstantami.
 */
export default function KvizFlow({
  bavic,
  referralKod = null,
  predvyplneni = PRAZDNY_KONTAKT,
}: {
  bavic: Bavic;
  /** Ověřený kód z `?od=` — putuje skrytým polem do server action. */
  referralKod?: string | null;
  /** Kontakt přihlášeného hosta — jen výchozí hodnota, ne zámek. */
  predvyplneni?: PredvyplnenyKontakt;
}) {
  const t = useT();
  const lang = useLang();
  const [krok, setKrok] = useState<Krok>("uvod");
  const [q1, setQ1] = useState<OdpovedQ1 | null>(null);
  const [q2, setQ2] = useState<OdpovedQ2 | null>(null);
  const [doporucene, setDoporucene] = useState<KvizProdukt[]>([]);
  const [produkt, setProdukt] = useState<KvizProdukt | null>(null);
  // Zkratka „už mám oblíbený produkt“ — přeskočí zbytek otázek na celý katalog.
  const [oblibeny, setOblibeny] = useState(false);
  const [oblibenyZ, setOblibenyZ] = useState<Krok>("q1");

  const [jmeno, setJmeno] = useState("");
  // Přihlášený host už nám telefon i ověřený e-mail dal — přepisovat je může,
  // ale opisovat je z hlavy u stánku nemusí.
  const [email, setEmail] = useState(predvyplneni.email);
  const [telefon, setTelefon] = useState(predvyplneni.telefon);

  const [vysledek, akce, ceka] = useActionState<VysledekKuponu | null, FormData>(
    odeslatKvizLead,
    null,
  );

  function odpovedetQ3(hodnota: OdpovedQ3) {
    // Sem se dá dostat jen přes q1 a q2, přesto raději pojistka.
    if (!q1 || !q2) return setKrok("q1");
    setOblibeny(false);
    setDoporucene(doporucitProdukty(q1, q2, hodnota));
    setKrok("vyber");
  }

  function vybratOblibeny() {
    setOblibenyZ(krok);
    setOblibeny(true);
    setDoporucene(PRODUKTY);
    setKrok("vyber");
  }

  function zpet() {
    // Ze zkratky se vracíme na otázku, ze které člověk odbočil.
    if (krok === "vyber" && oblibeny) {
      setOblibeny(false);
      return setKrok(oblibenyZ);
    }
    setKrok(PREDCHOZI[krok as Exclude<Krok, "uvod">]);
  }

  if (vysledek?.stav === "ok") return <Vyhra vysledek={vysledek} t={t} />;

  return (
    <div className="space-y-5">
      {krok !== "uvod" && <Hlavicka krok={krok} zpet={zpet} t={t} />}

      {krok === "uvod" && (
        <section className="flex min-h-[62vh] flex-col justify-center space-y-6 text-center">
          <div className="relative mx-auto grid h-32 w-32 place-items-center">
            <span className="zare absolute inset-0 rounded-full" aria-hidden />
            <span className="animate-plovouci relative text-7xl" aria-hidden>
              🦠
            </span>
          </div>
          <div>
            <h1 className="text-stin">
              {t.kviz.uvodNadpisPred}
              <br />
              <span className="text-mango-400">{t.kviz.uvodNadpisPo}</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[19rem] text-[1.0625rem] leading-relaxed text-kokos-50/85">
              {sazba(t.kviz.hook)}
            </p>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setKrok("q1")}
              className="tlacitko-hlavni"
            >
              {t.kviz.odemknout}
            </button>
            <p className="text-sm text-kokos-50/70">
              {t.kviz.posilaTePred}{" "}
              <strong className="font-bold text-mango-400">{bavic.jmeno}</strong>{" "}
              {t.kviz.posilaTePo}
            </p>
          </div>
        </section>
      )}

      {krok === "q1" && (
        <Otazka text={t.kviz.q1.text}>
          <Volby
            moznosti={OTAZKA_1}
            popisky={t.kviz.q1.moznosti}
            vybrat={(h) => {
              setQ1(h);
              setKrok("q2");
            }}
          />
          <OblibenaZkratka vybrat={vybratOblibeny} t={t} />
        </Otazka>
      )}

      {krok === "q2" && (
        <Otazka text={t.kviz.q2.text}>
          <Volby
            moznosti={OTAZKA_2}
            popisky={t.kviz.q2.moznosti}
            vybrat={(h) => {
              setQ2(h);
              setKrok("q3");
            }}
          />
          <OblibenaZkratka vybrat={vybratOblibeny} t={t} />
        </Otazka>
      )}

      {krok === "q3" && (
        <Otazka text={t.kviz.q3.text}>
          <Volby
            moznosti={OTAZKA_3}
            popisky={t.kviz.q3.moznosti}
            vybrat={odpovedetQ3}
          />
          <OblibenaZkratka vybrat={vybratOblibeny} t={t} />
        </Otazka>
      )}

      {krok === "vyber" && (
        <section className="space-y-5">
          <Konfety kusu={40} />
          <div className="space-y-2 text-center">
            {/* Emoji na vlastním řádku — v nadpisu rozbíjelo sazbu i účaří. */}
            <div className="relative mx-auto grid h-16 w-16 place-items-center">
              <span className="zare absolute inset-0 rounded-full" aria-hidden />
              <span className="relative text-4xl leading-none" aria-hidden>
                {oblibeny ? "💛" : "🦠"}
              </span>
            </div>
            <h1 className="text-stin">
              {oblibeny
                ? t.kviz.vyberOblibenyNadpis
                : t.kviz.vyberDoporuceneNadpis}
            </h1>
            <p className="mx-auto max-w-[20rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
              {oblibeny ? (
                sazba(t.kviz.vyberOblibenyPopis)
              ) : (
                <>
                  {t.kviz.vyberDoporucenePopisPred}{" "}
                  <strong className="text-mango-400">
                    {t.kviz.vyberJedenProdukt}
                  </strong>{" "}
                  {sazba(t.kviz.vyberDoporucenePopisPo)}
                </>
              )}
            </p>
          </div>

          {oblibeny ? (
            /* Celý katalog (66 položek) — bez členění je to nekonečná zeď dlaždic. */
            <KatalogVyber
              produkty={doporucene}
              vybrat={(p) => {
                setProdukt(p);
                setKrok("formular");
              }}
            />
          ) : (
            <MrizkaProduktu
              produkty={doporucene}
              vybrat={(p) => {
                setProdukt(p);
                setKrok("formular");
              }}
            />
          )}

          <p className="text-center text-xs leading-relaxed text-kokos-50/70">
            {t.kviz.kuponPlatiVEshopu}
          </p>
        </section>
      )}

      {krok === "formular" && produkt && (
        <section className="space-y-5">
          <div className="text-center">
            <div className="relative mx-auto grid h-24 w-24 place-items-center">
              <span className="zare absolute inset-0 rounded-full" aria-hidden />
              <span className="relative text-6xl leading-none" aria-hidden>
                {produkt.emoji}
              </span>
            </div>
            <h1 className="mt-1 text-stin">{t.kviz.formularNadpis}</h1>
            <p className="mx-auto mt-2 max-w-[19rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
              {sazba(t.kviz.formularSlevaPred)}{" "}
              <strong className="text-mango-400">{produkt.nazev}</strong>
            </p>
            <button
              type="button"
              onClick={() => setKrok("vyber")}
              className="mt-2 min-h-[2.25rem] rounded-full px-3 text-sm font-semibold
                         text-kokos-50/70 underline decoration-white/30 underline-offset-4
                         transition hover:text-kokos-50 hover:decoration-mango-400"
            >
              {t.kviz.zmenitProdukt}
            </button>
          </div>

          <form action={akce} className="karta space-y-2.5">
            <input type="hidden" name="bavic" value={bavic.slug} />
            <input type="hidden" name="produkt" value={produkt.slug} />
            <input type="hidden" name="quiz_variant" value="microbiom" />
            {/* Jazyk kupónového e-mailu = jazyk, ve kterém host kvíz vyplnil. */}
            <input type="hidden" name="lang" value={lang} />
            {referralKod && (
              <input type="hidden" name="od" value={referralKod} />
            )}

            <input
              name="jmeno"
              value={jmeno}
              onChange={(e) => setJmeno(e.target.value)}
              required
              maxLength={80}
              placeholder={t.spolecne.krestniJmeno}
              autoComplete="given-name"
              className="vstup"
            />
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              inputMode="email"
              maxLength={160}
              placeholder={t.spolecne.email}
              autoComplete="email"
              className="vstup"
            />
            <input
              name="telefon"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              required
              type="tel"
              inputMode="tel"
              placeholder={t.spolecne.telefonPlaceholder}
              autoComplete="tel"
              className="vstup"
            />

            <button
              type="submit"
              disabled={ceka}
              className="tlacitko-hlavni mt-1 disabled:opacity-70"
            >
              {ceka ? t.kviz.posilam : t.kviz.chciKupon}
            </button>

            {vysledek?.stav === "chyba" && (
              <p
                role="alert"
                className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
              >
                {vysledek.zprava}
              </p>
            )}

            <p className="px-1 text-center text-[0.6875rem] leading-relaxed text-kokos-50/80">
              {sazba(t.kviz.souhlas)}
            </p>
          </form>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dílčí kousky                                                                */
/* -------------------------------------------------------------------------- */

const CISLO_OTAZKY: Partial<Record<Krok, number>> = { q1: 1, q2: 2, q3: 3 };

/** Doporučená osmička — větší dlaždice než sdílený `KatalogVyber`. */
function MrizkaProduktu({
  produkty,
  vybrat,
}: {
  produkty: KvizProdukt[];
  vybrat: (produkt: KvizProdukt) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {produkty.map((p) => (
        <button
          key={p.slug}
          type="button"
          onClick={() => vybrat(p)}
          className="dlazdice"
        >
          <span className="text-[2rem] leading-none" aria-hidden>
            {p.emoji}
          </span>
          <span className="text-[0.8125rem] font-extrabold leading-[1.25] text-balance">
            {p.nazev}
          </span>
        </button>
      ))}
    </div>
  );
}

function Hlavicka({
  krok,
  zpet,
  t,
}: {
  krok: Krok;
  zpet: () => void;
  t: Dict;
}) {
  const cislo = CISLO_OTAZKY[krok];
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={zpet}
        className="-ml-2 flex min-h-[2.5rem] items-center rounded-full px-2 text-sm
                   font-semibold text-kokos-50/80 transition hover:bg-white/10 hover:text-kokos-50"
      >
        {t.spolecne.zpet}
      </button>
      {cislo ? (
        <span className="flex items-center gap-2.5">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-kokos-50/60">
            {t.kviz.otazkaZe(cislo, POCET_OTAZEK)}
          </span>
          <span className="flex gap-1" aria-hidden>
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i <= cislo ? "w-5 bg-mango-400" : "w-3 bg-white/25",
                ].join(" ")}
              />
            ))}
          </span>
        </span>
      ) : (
        <span className="odznak bg-mango-400/15 text-[0.7rem] tracking-[0.16em] text-mango-400">
          {t.kviz.odemceno}
        </span>
      )}
    </div>
  );
}

function Otazka({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h1 className="text-stin">{text}</h1>
      {children}
    </section>
  );
}

/** Odbočka mimo otázky — graficky odlišená od běžných odpovědí. */
function OblibenaZkratka({ vybrat, t }: { vybrat: () => void; t: Dict }) {
  return (
    <div className="space-y-3 pt-1">
      <p
        className="text-center text-xs font-bold uppercase tracking-widest text-kokos-50/50"
        aria-hidden
      >
        {t.kviz.nebo}
      </p>
      <button
        type="button"
        onClick={vybrat}
        className="flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-mango-400/80 bg-mango-400/10 px-5 py-3 text-center text-base font-extrabold text-mango-400 transition hover:bg-mango-400/20 active:translate-y-[2px]"
      >
        <span className="text-2xl" aria-hidden>
          💛
        </span>
        <span className="leading-tight">{t.kviz.oblibeny}</span>
      </button>
    </div>
  );
}

function Volby<T extends string>({
  moznosti,
  popisky,
  vybrat,
}: {
  moznosti: Moznost<T>[];
  /** Texty odpovědí ve zvoleném jazyce, klíčované hodnotou odpovědi. */
  popisky: Record<T, string>;
  vybrat: (hodnota: T) => void;
}) {
  return (
    <div className="space-y-2.5">
      {moznosti.map((m) => (
        <button
          key={m.hodnota}
          type="button"
          onClick={() => vybrat(m.hodnota)}
          className="volba"
        >
          <span className="volba-ikona" aria-hidden>
            {m.emoji}
          </span>
          <span className="flex-1">{popisky[m.hodnota]}</span>
          <span className="pr-1 text-2xl leading-none text-mango-400" aria-hidden>
            ›
          </span>
        </button>
      ))}
    </div>
  );
}

function Vyhra({
  vysledek,
  t,
}: {
  vysledek: Extract<VysledekKuponu, { stav: "ok" }>;
  t: Dict;
}) {
  return (
    <div className="space-y-5">
      <Konfety kusu={70} />

      <div className="text-center">
        <div className="relative mx-auto grid h-28 w-28 place-items-center">
          <span className="zare absolute inset-0 rounded-full" aria-hidden />
          <span className="animate-plovouci relative text-7xl" aria-hidden>
            {vysledek.emoji}
          </span>
        </div>
        <h1 className="mt-1 text-stin">{t.kviz.vyhraNadpis}</h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
          {sazba(t.kviz.vyhraKuponPred)}{" "}
          <strong className="text-mango-400">{vysledek.produkt}</strong>
        </p>
      </div>

      {/* Kupón = hrdina obrazovky: dostane rám i vlastní stín. */}
      <div className="animate-popIn rounded-3xl border-4 border-mango-400 bg-gradient-to-br from-zapad-500 to-mango-500 px-4 py-5 text-center shadow-[0_20px_44px_-20px_rgba(255,107,53,0.85)]">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-inkoust/75">
          {t.kviz.kodKuponu}
        </p>
        <p className="kod-kuponu mt-2 text-[1.6rem] font-black leading-tight text-inkoust">
          {vysledek.kod}
        </p>
      </div>

      <a
        href={ESHOP_URL}
        className="tlacitko-zapad text-[0.9375rem] tracking-[0.03em]"
      >
        {t.kviz.nakoupit}
      </a>

      {/* Kvíz vyžaduje telefonní login, takže tady už je návštěvník přihlášený
          — účet mu vznikl cestou. Sekundární CTA ho pustí rovnou do appky
          (rozcestník), místo aby QR kód baviče končil slepou uličkou. */}
      <Link href="/" className="tlacitko-vedlejsi text-[0.9375rem] tracking-[0.03em]">
        {t.kviz.pokracovatDoAppky}
      </Link>

      <div className="karta space-y-2.5 text-center text-sm leading-relaxed text-kokos-50/90">
        <p>
          {vysledek.emailOdeslan ? (
            <>
              {t.kviz.emailOdeslanPred}{" "}
              <strong className="break-words font-bold text-mango-300">
                {vysledek.email}
              </strong>{" "}
              {t.kviz.emailOdeslanPo}
            </>
          ) : (
            <>
              {t.kviz.emailNeodeslanPred}{" "}
              <strong className="font-bold text-mango-300">
                {t.kviz.emailNeodeslanZvyraznene}
              </strong>
              {t.kviz.emailNeodeslanPo}
            </>
          )}
        </p>
        <p className="border-t border-white/10 pt-2.5 text-xs leading-relaxed text-kokos-50/80">
          {sazba(vysledek.podminky)}
        </p>
      </div>
    </div>
  );
}
