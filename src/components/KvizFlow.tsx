"use client";

import { useActionState, useState } from "react";

import { odeslatKvizLead, type VysledekKuponu } from "@/app/kviz/actions";
import KatalogVyber from "@/components/KatalogVyber";
import Konfety from "@/components/Konfety";
import { sazba } from "@/lib/text";
import {
  ESHOP_URL,
  HOOK,
  OBLIBENY_TEXT,
  OTAZKA_1,
  OTAZKA_1_TEXT,
  OTAZKA_2,
  OTAZKA_2_TEXT,
  OTAZKA_3,
  OTAZKA_3_TEXT,
  PRODUKTY,
  SLEVA_PROCENT,
  doporucitProdukty,
  type Bavic,
  type KvizProdukt,
  type Moznost,
  type OdpovedQ1,
  type OdpovedQ2,
  type OdpovedQ3,
} from "@/lib/kviz";

type Krok = "uvod" | "q1" | "q2" | "q3" | "vyber" | "formular";

const PREDCHOZI: Record<Exclude<Krok, "uvod">, Krok> = {
  q1: "uvod",
  q2: "q1",
  q3: "q2",
  vyber: "q3",
  formular: "vyber",
};

/**
 * Kvíz „Odemkni potenciál svého mikrobiomu“ — tři klepnutí, výběr produktu,
 * kontakt, kupón. Celý stav žije v prohlížeči; server se volá až při odeslání
 * kontaktu.
 */
export default function KvizFlow({ bavic }: { bavic: Bavic }) {
  const [krok, setKrok] = useState<Krok>("uvod");
  const [q1, setQ1] = useState<OdpovedQ1 | null>(null);
  const [q2, setQ2] = useState<OdpovedQ2 | null>(null);
  const [doporucene, setDoporucene] = useState<KvizProdukt[]>([]);
  const [produkt, setProdukt] = useState<KvizProdukt | null>(null);
  // Zkratka „už mám oblíbený produkt“ — přeskočí zbytek otázek na celý katalog.
  const [oblibeny, setOblibeny] = useState(false);
  const [oblibenyZ, setOblibenyZ] = useState<Krok>("q1");

  const [jmeno, setJmeno] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");

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

  if (vysledek?.stav === "ok") return <Vyhra vysledek={vysledek} />;

  return (
    <div className="space-y-5">
      {krok !== "uvod" && <Hlavicka krok={krok} zpet={zpet} />}

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
              Odemkni potenciál
              <br />
              <span className="text-mango-400">svého mikrobiomu!</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[19rem] text-[1.0625rem] leading-relaxed text-kokos-50/85">
              {sazba(HOOK)}
            </p>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setKrok("q1")}
              className="tlacitko-hlavni"
            >
              Odemknout →
            </button>
            <p className="text-sm text-kokos-50/70">
              Posílá tě{" "}
              <strong className="font-bold text-mango-400">{bavic.jmeno}</strong>{" "}
              z Longevity Baru.
            </p>
          </div>
        </section>
      )}

      {krok === "q1" && (
        <Otazka text={OTAZKA_1_TEXT}>
          <Volby
            moznosti={OTAZKA_1}
            vybrat={(h) => {
              setQ1(h);
              setKrok("q2");
            }}
          />
          <OblibenaZkratka vybrat={vybratOblibeny} />
        </Otazka>
      )}

      {krok === "q2" && (
        <Otazka text={OTAZKA_2_TEXT}>
          <Volby
            moznosti={OTAZKA_2}
            vybrat={(h) => {
              setQ2(h);
              setKrok("q3");
            }}
          />
          <OblibenaZkratka vybrat={vybratOblibeny} />
        </Otazka>
      )}

      {krok === "q3" && (
        <Otazka text={OTAZKA_3_TEXT}>
          <Volby moznosti={OTAZKA_3} vybrat={odpovedetQ3} />
          <OblibenaZkratka vybrat={vybratOblibeny} />
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
                ? "Tvůj oblíbený produkt"
                : "Tohle tvůj mikrobiom miluje"}
            </h1>
            <p className="mx-auto max-w-[20rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
              {oblibeny ? (
                <>
                  Najdi ten svůj — na který produkt chceš mít až do konce roku
                  slevu {SLEVA_PROCENT}&nbsp;%?
                </>
              ) : (
                <>
                  Odemkni jeho potenciál každé ráno. Vyber si{" "}
                  <strong className="text-mango-400">jeden produkt</strong> — na
                  něj dostaneš kupón {SLEVA_PROCENT}&nbsp;%.
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
            Kupón platí na e-shopu wildandcoco.com, ne u stánku.
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
            <h1 className="mt-1 text-stin">Kam ti kupón pošleme?</h1>
            <p className="mx-auto mt-2 max-w-[19rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
              {SLEVA_PROCENT}&nbsp;% na{" "}
              <strong className="text-mango-400">{produkt.nazev}</strong>
            </p>
            <button
              type="button"
              onClick={() => setKrok("vyber")}
              className="mt-2 min-h-[2.25rem] rounded-full px-3 text-sm font-semibold
                         text-kokos-50/70 underline decoration-white/30 underline-offset-4
                         transition hover:text-kokos-50 hover:decoration-mango-400"
            >
              Změnit produkt
            </button>
          </div>

          <form action={akce} className="karta space-y-2.5">
            <input type="hidden" name="bavic" value={bavic.slug} />
            <input type="hidden" name="produkt" value={produkt.slug} />
            <input type="hidden" name="quiz_variant" value="microbiom" />

            <input
              name="jmeno"
              value={jmeno}
              onChange={(e) => setJmeno(e.target.value)}
              required
              maxLength={80}
              placeholder="Křestní jméno"
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
              placeholder="E-mail"
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
              placeholder="Telefon (např. 601 123 456)"
              autoComplete="tel"
              className="vstup"
            />

            <button
              type="submit"
              disabled={ceka}
              className="tlacitko-hlavni mt-1 disabled:opacity-70"
            >
              {ceka ? "Posílám…" : `Chci kupón ${SLEVA_PROCENT} %`}
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
              Kontakt použijeme na poslání kupónu a Longevity tipů od
              WILD&amp;COCO nejdéle do 31.&nbsp;12.&nbsp;2026 (max. 6 zpráv).
              Souhlas můžeš kdykoli odvolat, detaily v Pravidlech níže.
              Odpovědi z kvízu si neukládáme.
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

function Hlavicka({ krok, zpet }: { krok: Krok; zpet: () => void }) {
  const cislo = CISLO_OTAZKY[krok];
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={zpet}
        className="-ml-2 flex min-h-[2.5rem] items-center rounded-full px-2 text-sm
                   font-semibold text-kokos-50/80 transition hover:bg-white/10 hover:text-kokos-50"
      >
        ← Zpět
      </button>
      {cislo ? (
        <span className="flex items-center gap-2.5">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-kokos-50/60">
            Otázka {cislo} ze 3
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
          Odemčeno 🔓
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
function OblibenaZkratka({ vybrat }: { vybrat: () => void }) {
  return (
    <div className="space-y-3 pt-1">
      <p
        className="text-center text-xs font-bold uppercase tracking-widest text-kokos-50/50"
        aria-hidden
      >
        — nebo —
      </p>
      <button
        type="button"
        onClick={vybrat}
        className="flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-mango-400/80 bg-mango-400/10 px-5 py-3 text-center text-base font-extrabold text-mango-400 transition hover:bg-mango-400/20 active:translate-y-[2px]"
      >
        <span className="text-2xl" aria-hidden>
          💛
        </span>
        <span className="leading-tight">{OBLIBENY_TEXT}</span>
      </button>
    </div>
  );
}

function Volby<T extends string>({
  moznosti,
  vybrat,
}: {
  moznosti: Moznost<T>[];
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
          <span className="flex-1">{m.text}</span>
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
}: {
  vysledek: Extract<VysledekKuponu, { stav: "ok" }>;
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
        <h1 className="mt-1 text-stin">Máš to! 🎉</h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
          Kupón {SLEVA_PROCENT}&nbsp;% na{" "}
          <strong className="text-mango-400">{vysledek.produkt}</strong>
        </p>
      </div>

      {/* Kupón = hrdina obrazovky: dostane rám i vlastní stín. */}
      <div className="animate-popIn rounded-3xl border-4 border-mango-400 bg-gradient-to-br from-zapad-500 to-mango-500 px-4 py-5 text-center shadow-[0_20px_44px_-20px_rgba(255,107,53,0.85)]">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-inkoust/75">
          Kód kupónu
        </p>
        <p className="kod-kuponu mt-2 text-[1.6rem] font-black leading-tight text-inkoust">
          {vysledek.kod}
        </p>
      </div>

      <a
        href={ESHOP_URL}
        className="tlacitko-zapad text-[0.9375rem] tracking-[0.03em]"
      >
        Nakoupit na wildandcoco.com
      </a>

      <div className="karta space-y-2.5 text-center text-sm leading-relaxed text-kokos-50/90">
        <p>
          {vysledek.emailOdeslan ? (
            <>
              Kupón ti letí i na{" "}
              <strong className="break-words font-bold text-mango-300">
                {vysledek.email}
              </strong>{" "}
              — mrkni i do spamu.
            </>
          ) : (
            <>
              E-mail se nám teď nepodařilo odeslat — kód si prosím{" "}
              <strong className="font-bold text-mango-300">
                vyfoť nebo opiš
              </strong>
              .
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
