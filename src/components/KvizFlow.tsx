"use client";

import { useActionState, useState } from "react";

import { odeslatKvizLead, type VysledekKuponu } from "@/app/kviz/actions";
import Konfety from "@/components/Konfety";
import { sazba } from "@/lib/text";
import {
  ESHOP_URL,
  KATEGORIE_LABEL,
  OBLIBENY_TEXT,
  PRODUKTY,
  SLEVA_PROCENT,
  type Bavic,
  type Kategorie,
  type KvizProdukt,
  type Moznost,
} from "@/lib/kviz";
import {
  VARIANTY,
  varianta as najitVariantu,
  type KvizVarianta,
  type Odpovedi,
  type VariantaDef,
} from "@/lib/kviz-varianty";

type Krok = "uvod" | "otazky" | "vyber" | "formular";

/**
 * Kvíz bavičů fronty — přepínač variant, otázky, výběr produktu, kontakt, kupón.
 *
 * ⚠️ Odpovědi žijí VÝHRADNĚ tady v prohlížeči. Server action se volá až při
 * odeslání kontaktu a dostane jen baviče, variantu a slug vybraného produktu —
 * nikdy odpovědi ani průběžné skóre.
 */
export default function KvizFlow({
  bavic,
  doporucena,
  hotove,
  prihlasen,
}: {
  bavic: Bavic;
  /** Předvolená varianta (z QR nebo z politiky) — nic nevynucuje. */
  doporucena: KvizVarianta;
  /** Varianty, které přihlášený host už dokončil. */
  hotove: KvizVarianta[];
  prihlasen: boolean;
}) {
  const [vybrana, setVybrana] = useState<KvizVarianta>(() =>
    vychoziVarianta(doporucena, hotove),
  );
  const [krok, setKrok] = useState<Krok>("uvod");
  const [index, setIndex] = useState(0);
  const [odpovedi, setOdpovedi] = useState<Odpovedi>({});
  const [doporucene, setDoporucene] = useState<KvizProdukt[]>([]);
  const [produkt, setProdukt] = useState<KvizProdukt | null>(null);
  // Zkratka „už mám oblíbený produkt“ — přeskočí zbytek otázek na celý katalog.
  const [oblibeny, setOblibeny] = useState(false);
  const [oblibenyZ, setOblibenyZ] = useState(0);

  const [jmeno, setJmeno] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");

  const [vysledek, akce, ceka] = useActionState<VysledekKuponu | null, FormData>(
    odeslatKvizLead,
    null,
  );

  const varianta = najitVariantu(vybrana);
  const otazky = varianta.otazky;
  const zbyva = VARIANTY.filter((v) => !hotove.includes(v.id));

  function odpovedet(hodnota: string) {
    const dalsi = { ...odpovedi, [otazky[index].id]: hodnota };
    setOdpovedi(dalsi);
    setOblibeny(false);
    if (index + 1 < otazky.length) return setIndex(index + 1);
    setDoporucene(varianta.doporucit(dalsi));
    setKrok("vyber");
  }

  function vybratOblibeny() {
    setOblibenyZ(index);
    setOblibeny(true);
    setDoporucene(PRODUKTY);
    setKrok("vyber");
  }

  function prepnoutVariantu(id: KvizVarianta) {
    setVybrana(id);
    // Otázky se mezi variantami překrývají jen zčásti — začínáme načisto.
    setIndex(0);
    setOdpovedi({});
    setOblibeny(false);
  }

  function zpet() {
    if (krok === "formular") return setKrok("vyber");
    if (krok === "vyber") {
      // Ze zkratky se vracíme na otázku, ze které člověk odbočil.
      if (oblibeny) {
        setOblibeny(false);
        setIndex(oblibenyZ);
      } else {
        setIndex(otazky.length - 1);
      }
      return setKrok("otazky");
    }
    if (index > 0) return setIndex(index - 1);
    setKrok("uvod");
  }

  if (vysledek?.stav === "ok") {
    return <Vyhra vysledek={vysledek} bavic={bavic} />;
  }

  // Přihlášený host, který má obě varianty za sebou — kupón už dostal.
  if (prihlasen && zbyva.length === 0) return <Hotovo />;

  return (
    <div className="space-y-5">
      {krok !== "uvod" && (
        <Hlavicka
          cislo={krok === "otazky" ? index + 1 : null}
          celkem={otazky.length}
          zpet={zpet}
        />
      )}

      {krok === "uvod" && (
        <section className="flex min-h-[62vh] flex-col justify-center space-y-6 text-center">
          <div className="relative mx-auto grid h-32 w-32 place-items-center">
            <span className="zare absolute inset-0 rounded-full" aria-hidden />
            <span className="animate-plovouci relative text-7xl" aria-hidden>
              {varianta.emoji}
            </span>
          </div>
          <div>
            <h1 className="text-stin">
              {varianta.titulek[0]}
              <br />
              <span className="text-mango-400">{varianta.titulek[1]}</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[19rem] text-[1.0625rem] leading-relaxed text-kokos-50/85">
              {sazba(varianta.hook)}
            </p>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setKrok("otazky")}
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

          <PrepinacVariant
            vybrana={vybrana}
            hotove={hotove}
            doporucena={doporucena}
            prepnout={prepnoutVariantu}
          />
        </section>
      )}

      {krok === "otazky" && (
        <section className="space-y-4">
          <h1 className="text-stin">{otazky[index].text}</h1>
          <Volby
            /* Klíč přemountuje seznam — jinak by tlačítka mezi otázkami
               držela stav hoveru z předchozího klepnutí. */
            key={`${vybrana}-${otazky[index].id}`}
            moznosti={otazky[index].moznosti}
            vybrat={odpovedet}
          />
          <OblibenaZkratka vybrat={vybratOblibeny} />
        </section>
      )}

      {krok === "vyber" && (
        <section className="space-y-5">
          <Konfety kusu={40} />
          <div className="space-y-2 text-center">
            {/* Emoji na vlastním řádku — v nadpisu rozbíjelo sazbu i účaří. */}
            <div className="relative mx-auto grid h-16 w-16 place-items-center">
              <span className="zare absolute inset-0 rounded-full" aria-hidden />
              <span className="relative text-4xl leading-none" aria-hidden>
                {oblibeny ? "💛" : varianta.emoji}
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
                  Najdi ten svůj — na{" "}
                  <strong className="text-mango-400">jeden produkt</strong>{" "}
                  dostaneš kupón {SLEVA_PROCENT}&nbsp;%.
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
            <div className="space-y-5">
              {seskupitPodleKategorie(doporucene).map((skupina) => (
                <div key={skupina.kategorie} className="space-y-2.5">
                  <p className="stitek-sekce">
                    {KATEGORIE_LABEL[skupina.kategorie]}
                  </p>
                  <MrizkaProduktu
                    kompaktni
                    produkty={skupina.polozky}
                    vybrat={(p) => {
                      setProdukt(p);
                      setKrok("formular");
                    }}
                  />
                </div>
              ))}
            </div>
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
            <input type="hidden" name="varianta" value={vybrana} />

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

            <p className="px-1 text-center text-[0.6875rem] leading-relaxed text-kokos-50/80">
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
/* Varianty                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Předvolba přepínače: doporučená varianta, a pokud ji host už má hotovou,
 * tak ta druhá. Doporučení tím zůstává doporučením — nikdy nikoho neblokuje.
 */
function vychoziVarianta(
  doporucena: KvizVarianta,
  hotove: KvizVarianta[],
): KvizVarianta {
  if (!hotove.includes(doporucena)) return doporucena;
  return VARIANTY.find((v) => !hotove.includes(v.id))?.id ?? doporucena;
}

/**
 * Přepínač obou variant na úvodní obrazovce. Doporučená je předvolená
 * a označená, dokončená je vidět taky — jen se do ní už nedá vstoupit.
 */
function PrepinacVariant({
  vybrana,
  hotove,
  doporucena,
  prepnout,
}: {
  vybrana: KvizVarianta;
  hotove: KvizVarianta[];
  doporucena: KvizVarianta;
  prepnout: (id: KvizVarianta) => void;
}) {
  return (
    <div className="space-y-2.5 pt-1">
      <p className="stitek-sekce text-center">Vyber si kvíz</p>
      <div className="grid gap-2.5">
        {VARIANTY.map((v) => (
          <KartaVarianty
            key={v.id}
            varianta={v}
            aktivni={v.id === vybrana}
            hotova={hotove.includes(v.id)}
            doporucena={v.id === doporucena}
            prepnout={prepnout}
          />
        ))}
      </div>
    </div>
  );
}

function KartaVarianty({
  varianta,
  aktivni,
  hotova,
  doporucena,
  prepnout,
}: {
  varianta: VariantaDef;
  aktivni: boolean;
  hotova: boolean;
  doporucena: boolean;
  prepnout: (id: KvizVarianta) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => prepnout(varianta.id)}
      disabled={hotova}
      aria-pressed={aktivni}
      className={[
        "flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
        hotova
          ? "cursor-not-allowed border-white/15 bg-white/5 opacity-60"
          : aktivni
            ? "border-mango-400 bg-mango-400/15"
            : "border-white/20 bg-white/5 hover:bg-white/10",
      ].join(" ")}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {varianta.emoji}
      </span>
      <span className="flex-1 leading-tight">
        <span className="block text-[0.9375rem] font-extrabold">
          {varianta.nazev}
        </span>
        <span className="block text-xs text-kokos-50/70">{varianta.popis}</span>
      </span>
      {hotova ? (
        <span className="odznak bg-white/10 text-[0.65rem] text-kokos-50/80">
          Hotovo ✓
        </span>
      ) : doporucena ? (
        <span className="odznak bg-mango-400/15 text-[0.65rem] text-mango-400">
          Doporučeno
        </span>
      ) : null}
    </button>
  );
}

/** Obě varianty hotové — host už kupón má, druhý mu nedáme. */
function Hotovo() {
  return (
    <section className="flex min-h-[62vh] flex-col justify-center space-y-5 text-center">
      <div className="relative mx-auto grid h-28 w-28 place-items-center">
        <span className="zare absolute inset-0 rounded-full" aria-hidden />
        <span className="animate-plovouci relative text-7xl" aria-hidden>
          💛
        </span>
      </div>
      <div>
        <h1 className="text-stin">Máš hotovo!</h1>
        <p className="mx-auto mt-3 max-w-[19rem] text-[1.0625rem] leading-relaxed text-kokos-50/85">
          Oba kvízy už jsi prošel/prošla a kupóny ti dorazily e-mailem —
          mrkni i do spamu.
        </p>
      </div>
      <a href={ESHOP_URL} className="tlacitko-zapad text-[0.9375rem]">
        Nakoupit na wildandcoco.com
      </a>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Dílčí kousky                                                                */
/* -------------------------------------------------------------------------- */

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
 * v `lib/kviz.ts` se tím nemění.
 */
function seskupitPodleKategorie(
  produkty: KvizProdukt[],
): { kategorie: Kategorie; polozky: KvizProdukt[] }[] {
  return PORADI_KATEGORII.map((kategorie) => ({
    kategorie,
    polozky: produkty.filter((p) => p.kategorie[0] === kategorie),
  })).filter((s) => s.polozky.length > 0);
}

function MrizkaProduktu({
  produkty,
  vybrat,
  kompaktni = false,
}: {
  produkty: KvizProdukt[];
  vybrat: (produkt: KvizProdukt) => void;
  /** Celý katalog jede v hustší mřížce, doporučených 8 dostane víc prostoru. */
  kompaktni?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {produkty.map((p) => (
        <button
          key={p.slug}
          type="button"
          onClick={() => vybrat(p)}
          className={kompaktni ? "dlazdice-mala" : "dlazdice"}
        >
          <span
            className={kompaktni ? "text-2xl leading-none" : "text-[2rem] leading-none"}
            aria-hidden
          >
            {p.emoji}
          </span>
          <span
            className={[
              "font-extrabold leading-[1.25] text-balance",
              kompaktni ? "text-[0.75rem]" : "text-[0.8125rem]",
            ].join(" ")}
          >
            {p.nazev}
          </span>
        </button>
      ))}
    </div>
  );
}

function Hlavicka({
  cislo,
  celkem,
  zpet,
}: {
  /** Pořadí otázky (1-based), nebo null mimo otázky. */
  cislo: number | null;
  celkem: number;
  zpet: () => void;
}) {
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
            Otázka {cislo} z {celkem}
          </span>
          <Postup cislo={cislo} celkem={celkem} />
        </span>
      ) : (
        <span className="odznak bg-mango-400/15 text-[0.7rem] tracking-[0.16em] text-mango-400">
          Odemčeno 🔓
        </span>
      )}
    </div>
  );
}

/**
 * Ukazatel postupu. Do pěti otázek tečky (jako dřív), u devítiotázkové
 * varianty jeden pruh — devět teček by se vedle popisku nevešlo.
 */
function Postup({ cislo, celkem }: { cislo: number; celkem: number }) {
  if (celkem > 5) {
    return (
      <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-white/25" aria-hidden>
        <span
          className="block h-full rounded-full bg-mango-400 transition-all"
          style={{ width: `${(cislo / celkem) * 100}%` }}
        />
      </span>
    );
  }
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: celkem }, (_, i) => i + 1).map((i) => (
        <span
          key={i}
          className={[
            "h-1.5 rounded-full transition-all",
            i <= cislo ? "w-5 bg-mango-400" : "w-3 bg-white/25",
          ].join(" ")}
        />
      ))}
    </span>
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

function Volby({
  moznosti,
  vybrat,
}: {
  moznosti: Moznost<string>[];
  vybrat: (hodnota: string) => void;
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
  bavic,
}: {
  vysledek: Extract<VysledekKuponu, { stav: "ok" }>;
  bavic: Bavic;
}) {
  const zbyva = VARIANTY.find((v) => v.id !== vysledek.varianta);

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

      {/* Druhá varianta zůstává k dispozici — plný reload, ať se načte
          čerstvý seznam dokončených variant ze serveru. */}
      {zbyva && (
        <a
          href={`/kviz/${bavic.slug}?varianta=${zbyva.id}`}
          className="block rounded-2xl border-2 border-dashed border-white/25 px-4 py-3 text-center text-sm font-bold text-kokos-50/85 transition hover:bg-white/10"
        >
          {zbyva.emoji} Máš ještě druhý kvíz — {zbyva.nazev} ({zbyva.popis})
        </a>
      )}
    </div>
  );
}
