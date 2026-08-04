"use client";

import { useActionState, useState } from "react";

import { odeslatKvizLead, type VysledekKuponu } from "@/app/kviz/actions";
import Konfety from "@/components/Konfety";
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
        <section className="space-y-5 text-center">
          <p className="animate-plovouci text-7xl" aria-hidden>
            🦠
          </p>
          <div>
            <h1 className="text-stin">
              Odemkni potenciál
              <br />
              <span className="text-mango-400">svého mikrobiomu!</span>
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-base text-kokos-50/85">
              {HOOK}
            </p>
          </div>
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
        <section className="space-y-4">
          <Konfety kusu={40} />
          <div className="text-center">
            <h1 className="text-stin">
              {oblibeny
                ? "💛 Tvůj oblíbený produkt"
                : "🦠 Tohle tvůj mikrobiom miluje"}
            </h1>
            <p className="mt-2 text-base font-semibold text-kokos-50/85">
              {oblibeny ? (
                <>
                  Najdi ten svůj — na{" "}
                  <strong className="text-mango-400">jeden produkt</strong>{" "}
                  dostaneš kupón {SLEVA_PROCENT} %.
                </>
              ) : (
                <>
                  Odemkni jeho potenciál každé ráno. Vyber si{" "}
                  <strong className="text-mango-400">jeden produkt</strong> — na
                  něj dostaneš kupón {SLEVA_PROCENT} %.
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {doporucene.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => {
                  setProdukt(p);
                  setKrok("formular");
                }}
                className="flex min-h-[8.5rem] flex-col items-center justify-center gap-1 rounded-3xl border-2 border-white/20 bg-white/95 p-3 text-center text-inkoust shadow-karta transition active:translate-y-[2px]"
              >
                <span className="text-4xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="text-sm font-extrabold leading-tight">
                  {p.nazev}
                </span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-kokos-50/60">
            Kupón platí na e-shopu wildandcoco.com, ne u stánku.
          </p>
        </section>
      )}

      {krok === "formular" && produkt && (
        <section className="space-y-4">
          <div className="text-center">
            <p className="text-6xl" aria-hidden>
              {produkt.emoji}
            </p>
            <h1 className="mt-2 text-stin">Kam ti kupón pošleme?</h1>
            <p className="mt-2 text-base font-semibold text-kokos-50/85">
              {SLEVA_PROCENT} % na{" "}
              <strong className="text-mango-400">{produkt.nazev}</strong>
            </p>
            <button
              type="button"
              onClick={() => setKrok("vyber")}
              className="odkaz mt-1 text-sm text-kokos-50/70"
            >
              Změnit produkt
            </button>
          </div>

          <form action={akce} className="karta space-y-3">
            <input type="hidden" name="bavic" value={bavic.slug} />
            <input type="hidden" name="produkt" value={produkt.slug} />

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
              className="tlacitko-hlavni disabled:opacity-70"
            >
              {ceka ? "Posílám…" : `Chci kupón ${SLEVA_PROCENT} %`}
            </button>

            {vysledek?.stav === "chyba" && (
              <p
                role="alert"
                className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
              >
                {vysledek.zprava}
              </p>
            )}

            <p className="text-center text-xs text-kokos-50/60">
              Kontakt použijeme na poslání kupónu a pár přátelských zpráv od
              WILD&amp;COCO — max. 6 během půl roku. Kdykoli se můžeš odhlásit,
              detaily v Pravidlech níže.
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

function Hlavicka({ krok, zpet }: { krok: Krok; zpet: () => void }) {
  const cislo = CISLO_OTAZKY[krok];
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={zpet} className="odkaz text-sm">
        ← Zpět
      </button>
      {cislo ? (
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-kokos-50/60">
            Otázka {cislo} ze 3
          </span>
          <span className="flex gap-1" aria-hidden>
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={[
                  "h-2 w-2 rounded-full",
                  i <= cislo ? "bg-mango-400" : "bg-white/25",
                ].join(" ")}
              />
            ))}
          </span>
        </span>
      ) : (
        <span className="text-xs font-bold uppercase tracking-widest text-mango-400">
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
    <div className="space-y-3">
      {moznosti.map((m) => (
        <button
          key={m.hodnota}
          type="button"
          onClick={() => vybrat(m.hodnota)}
          className="flex min-h-[4.25rem] w-full items-center gap-4 rounded-2xl border-2 border-white/20 bg-white/10 px-5 py-3 text-left text-lg font-extrabold text-kokos-50 transition hover:bg-white/20 active:translate-y-[2px]"
        >
          <span className="text-3xl" aria-hidden>
            {m.emoji}
          </span>
          <span className="flex-1 leading-tight">{m.text}</span>
          <span className="text-2xl text-mango-400" aria-hidden>
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
        <p className="animate-plovouci text-7xl" aria-hidden>
          {vysledek.emoji}
        </p>
        <h1 className="mt-2 text-stin">Máš to! 🎉</h1>
        <p className="mt-2 text-base font-semibold text-kokos-50/85">
          Kupón {SLEVA_PROCENT} % na{" "}
          <strong className="text-mango-400">{vysledek.produkt}</strong>
        </p>
      </div>

      <div className="animate-popIn rounded-3xl border-4 border-mango-400 bg-gradient-to-br from-zapad-500 to-mango-500 p-5 text-center shadow-karta">
        <p className="text-xs font-black uppercase tracking-widest text-inkoust/70">
          Kód kupónu
        </p>
        <p className="mt-2 break-all text-3xl font-black tracking-wide text-inkoust">
          {vysledek.kod}
        </p>
      </div>

      <a href={ESHOP_URL} className="tlacitko-zapad">
        Nakoupit na wildandcoco.com
      </a>

      <div className="karta space-y-2 text-center text-sm text-kokos-50/85">
        <p>
          {vysledek.emailOdeslan ? (
            <>
              Kupón ti letí i na{" "}
              <strong className="font-bold text-mango-400">
                {vysledek.email}
              </strong>{" "}
              — mrkni i do spamu.
            </>
          ) : (
            <>
              E-mail se nám teď nepodařilo odeslat — kód si prosím{" "}
              <strong className="font-bold text-mango-400">
                vyfoť nebo opiš
              </strong>
              .
            </>
          )}
        </p>
        <p className="text-xs text-kokos-50/60">{vysledek.podminky}</p>
      </div>
    </div>
  );
}
