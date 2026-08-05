"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { odeslatKvizLead, type VysledekKuponu } from "@/app/kviz/actions";
import KatalogVyber from "@/components/KatalogVyber";
import Konfety from "@/components/Konfety";
import { sazba } from "@/lib/text";
import {
  ESHOP_URL,
  PRODUKTY,
  SLEVA_PROCENT,
  type Bavic,
  type KvizProdukt,
} from "@/lib/kviz";
import {
  PROFIL_DISCLAIMER,
  PROFIL_HOOK,
  PROFIL_OTAZKY,
  PROFILY,
  vyhodnotitProfil,
  type ProfilMoznost,
} from "@/lib/kviz-profil";
import {
  VYHODNOCENI_TEXTY,
  sestavitVyhodnoceni,
  type Postreh,
  type Vyhodnoceni,
} from "@/lib/kviz-profil-vyhodnoceni";

type Faze = "uvod" | "otazky" | "vyhodnoceni" | "vyber" | "formular";

const POCET_OTAZEK = PROFIL_OTAZKY.length;

/**
 * Kvíz varianty „profil“ — devět otázek, vážená matice, obrazovka vyhodnocení
 * „Longevity profil“, teprve pak výběr jednoho produktu, kontakt a kupón.
 *
 * Záměrně samostatná komponenta, ne parametrizovaný `KvizFlow`: tříotázková
 * varianta jede na festivalu naostro a nesmí se tímhle rozbít. Duplikace
 * dílčích kousků je tady levnější než regrese. Sdílený je jen výběr z celého
 * sortimentu (`KatalogVyber`), kde by se 66 dlaždic opisovalo zbytečně.
 *
 * Odpovědi ani skóre neopouštějí prohlížeč — na server jde jen varianta kvízu,
 * vybraný produkt a kontakt. Vyhodnocení se skládá lokálně z čisté funkce.
 */
export default function KvizFlowProfil({
  bavic,
  referralKod = null,
}: {
  bavic: Bavic;
  /** Ověřený kód z `?od=` — putuje skrytým polem do server action. */
  referralKod?: string | null;
}) {
  const [faze, setFaze] = useState<Faze>("uvod");
  const [krok, setKrok] = useState(0);
  const [odpovedi, setOdpovedi] = useState<number[]>([]);
  const [doporucene, setDoporucene] = useState<KvizProdukt[]>([]);
  const [profily, setProfily] = useState<string[]>([]);
  const [vyhodnoceni, setVyhodnoceni] = useState<Vyhodnoceni | null>(null);
  const [produkt, setProdukt] = useState<KvizProdukt | null>(null);
  // Rozbalený sortiment zůstává otevřený i po návratu z formuláře — kdo si ho
  // jednou vyžádal, nechce ho hledat znovu.
  const [celyKatalog, setCelyKatalog] = useState(false);

  const [jmeno, setJmeno] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");

  const [vysledek, akce, ceka] = useActionState<VysledekKuponu | null, FormData>(
    odeslatKvizLead,
    null,
  );

  function odpovedet(index: number) {
    const dalsi = [...odpovedi.slice(0, krok), index];
    setOdpovedi(dalsi);

    if (dalsi.length < POCET_OTAZEK) {
      setKrok(dalsi.length);
      return;
    }

    const vysledek = vyhodnotitProfil(dalsi);
    const text = sestavitVyhodnoceni(dalsi);
    // Prázdný výsledek by znamenal chybu v matici — radši zpět na první otázku
    // než výsledková obrazovka bez produktů nebo bez textu.
    if (vysledek.produkty.length === 0 || !text) {
      setOdpovedi([]);
      setKrok(0);
      return;
    }
    setProfily(vysledek.profilId);
    setDoporucene(vysledek.produkty);
    setVyhodnoceni(text);
    setFaze("vyhodnoceni");
  }

  function zpet() {
    if (faze === "formular") return setFaze("vyber");
    if (faze === "vyber") return setFaze("vyhodnoceni");
    if (faze === "vyhodnoceni") {
      setFaze("otazky");
      return setKrok(POCET_OTAZEK - 1);
    }
    if (krok === 0) return setFaze("uvod");
    setKrok(krok - 1);
  }

  if (vysledek?.stav === "ok") return <Vyhra vysledek={vysledek} />;

  const nazvyProfilu = PROFILY.filter((p) => profily.includes(p.id)).map((p) => p.nazev);

  return (
    <div className="space-y-5">
      {faze !== "uvod" && (
        <Hlavicka cislo={faze === "otazky" ? krok + 1 : null} zpet={zpet} />
      )}

      {faze === "uvod" && (
        <section className="flex min-h-[62vh] flex-col justify-center space-y-6 text-center">
          <div className="relative mx-auto grid h-32 w-32 place-items-center">
            <span className="zare absolute inset-0 rounded-full" aria-hidden />
            <span className="animate-plovouci relative text-7xl" aria-hidden>
              🥥
            </span>
          </div>
          <div>
            <h1 className="text-stin">
              Najdi si svou
              <br />
              <span className="text-mango-400">WILD&amp;COCO rutinu</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[19rem] text-[1.0625rem] font-bold leading-relaxed text-mango-400">
              {VYHODNOCENI_TEXTY.uvodniOtazka}
            </p>
            <p className="mx-auto mt-2 max-w-[19rem] text-[1.0625rem] leading-relaxed text-kokos-50/85">
              {sazba(PROFIL_HOOK)}
            </p>
          </div>
          <div className="space-y-3">
            <button type="button" onClick={() => setFaze("otazky")} className="tlacitko-hlavni">
              Jdeme na to →
            </button>
            <p className="text-sm text-kokos-50/70">
              Posílá tě{" "}
              <strong className="font-bold text-mango-400">{bavic.jmeno}</strong> z
              Longevity Baru.
            </p>
          </div>
        </section>
      )}

      {faze === "otazky" && (
        <section className="space-y-4">
          <h1 className="text-stin">{PROFIL_OTAZKY[krok].text}</h1>
          <Volby
            moznosti={PROFIL_OTAZKY[krok].moznosti}
            vybrana={odpovedi[krok]}
            vybrat={odpovedet}
          />
        </section>
      )}

      {faze === "vyhodnoceni" && vyhodnoceni && (
        <section className="space-y-5">
          <Konfety kusu={40} />
          <div className="space-y-2 text-center">
            {/* Emoji na vlastním řádku — v nadpisu rozbíjí sazbu i účaří.
                Vyhodnocení je vrchol kvízu, takže stejná váha jako na úvodní
                a výherní obrazovce, ne drobná ikonka. */}
            <div className="relative mx-auto grid h-20 w-20 place-items-center">
              <span className="zare absolute inset-0 rounded-full" aria-hidden />
              <span className="relative text-5xl leading-none" aria-hidden>
                {VYHODNOCENI_TEXTY.nadpisEmoji}
              </span>
            </div>
            <h1 className="text-stin">
              {VYHODNOCENI_TEXTY.nadpisPrefix}
              <br />
              <span className="text-mango-400">{vyhodnoceni.personaNadpis}</span>
            </h1>
            <p className="mx-auto max-w-[21rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
              {vyhodnoceni.uvod}
            </p>
          </div>

          {/* Pět řádků na střed se čte špatně — rozevlátý rag na obou stranách.
              Vlevo a se zlatým pravítkem (stejný vzor jako hlavičky sekcí
              v /sortiment/*) je z toho čitelný lead, ne odstavec na ztracenou. */}
          <p className="mx-auto max-w-[24rem] border-l-[3px] border-mango-400/70 pl-4 text-[0.9375rem] leading-relaxed text-kokos-50/[0.88]">
            {vyhodnoceni.pribeh}
          </p>

          <div className="karta space-y-3">
            <p className="stitek-sekce">{VYHODNOCENI_TEXTY.nadpisPostrehy}</p>
            <ul>
              {vyhodnoceni.postrehy.map((postreh) => (
                <PostrehRadek key={postreh.text} postreh={postreh} />
              ))}
            </ul>
          </div>

          {/* Teplý odstín místo třetí stejné skleněné desky: karta „proč“ je
              argument, který ústí do zlatého CTA hned pod ní. */}
          <div className="karta space-y-2 border-mango-400/35 bg-mango-400/[0.11]">
            <p className="stitek-sekce">{VYHODNOCENI_TEXTY.nadpisProcProdukty}</p>
            <p className="text-[0.9375rem] leading-relaxed text-kokos-50/90">
              {vyhodnoceni.procProdukty}
            </p>
          </div>

          {/* Povinné odlišení od zdravotního doporučení (brief 4. 8. 2026). */}
          <p className="text-center text-xs leading-relaxed text-kokos-50/70">
            {PROFIL_DISCLAIMER}
          </p>

          <button
            type="button"
            onClick={() => setFaze("vyber")}
            className="tlacitko-hlavni"
          >
            {VYHODNOCENI_TEXTY.tlacitkoNabidka} →
          </button>
        </section>
      )}

      {faze === "vyber" && (
        <section className="space-y-5">
          <div className="space-y-2 text-center">
            <div className="relative mx-auto grid h-16 w-16 place-items-center">
              <span className="zare absolute inset-0 rounded-full" aria-hidden />
              <span className="relative text-4xl leading-none" aria-hidden>
                ✨
              </span>
            </div>
            <h1 className="text-stin">Tvoje rutina na míru</h1>
            {nazvyProfilu.length > 0 && (
              <p className="mx-auto max-w-[20rem] text-[0.9375rem] font-extrabold leading-relaxed text-mango-400">
                {nazvyProfilu.join(" + ")}
              </p>
            )}
            <p className="mx-auto max-w-[20rem] text-[0.9375rem] font-semibold leading-relaxed text-kokos-50/85">
              Vyber si <strong className="text-mango-400">jeden produkt</strong> — na něj
              dostaneš kupón {SLEVA_PROCENT}&nbsp;%.
            </p>
          </div>

          <MrizkaProduktu
            produkty={doporucene}
            vybrat={(p) => {
              setProdukt(p);
              setFaze("formular");
            }}
          />

          {/* Odbočka na celý sortiment — graficky odlišená od doporučených dlaždic. */}
          {celyKatalog ? (
            /* Předěl: bez něj katalog navazoval na doporučené dlaždice tak
               těsně, že vypadal jako jejich pokračování. */
            <div className="border-t border-white/15 pt-5">
              <KatalogVyber
                produkty={PRODUKTY}
                vybrat={(p) => {
                  setProdukt(p);
                  setFaze("formular");
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCelyKatalog(true)}
              className="flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-2xl
                         border-2 border-dashed border-mango-400/80 bg-mango-400/10 px-5 py-3
                         text-center text-base font-extrabold text-mango-400 transition
                         hover:bg-mango-400/20 active:translate-y-[2px]"
            >
              <span className="text-2xl" aria-hidden>
                {VYHODNOCENI_TEXTY.katalogEmoji}
              </span>
              <span className="leading-tight">{VYHODNOCENI_TEXTY.tlacitkoKatalog}</span>
            </button>
          )}

          {/* Povinné odlišení od zdravotního doporučení (brief 4. 8. 2026). */}
          <p className="karta text-center text-[0.8125rem] font-semibold leading-relaxed text-kokos-50/90">
            {PROFIL_DISCLAIMER}
          </p>

          <p className="text-center text-xs leading-relaxed text-kokos-50/70">
            Kupón platí na e-shopu wildandcoco.com, ne u stánku.
          </p>
        </section>
      )}

      {faze === "formular" && produkt && (
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
              onClick={() => setFaze("vyber")}
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
            <input type="hidden" name="quiz_variant" value="profil" />
            {referralKod && (
              <input type="hidden" name="od" value={referralKod} />
            )}

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
/* Dílčí kousky — vlastní kopie, `KvizFlow.tsx` zůstává nedotčený              */
/* -------------------------------------------------------------------------- */

/**
 * Jeden osobní postřeh — emoji v pevné dlaždici drží optickou osu seznamu.
 * Vlásková linka mezi řádky: čtyři odstavce po 3–5 řádcích jinak splynou
 * v jeden blok textu a postřehy přestanou být čtyři.
 */
function PostrehRadek({ postreh }: { postreh: Postreh }) {
  return (
    <li className="flex items-start gap-3 border-t border-white/10 pt-3.5 first:border-0 first:pt-0 [&+li]:mt-3.5">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-white/[0.18] to-white/[0.06] text-xl ring-1 ring-inset ring-white/10"
        aria-hidden
      >
        {postreh.emoji}
      </span>
      <span className="flex-1 pt-1 text-[0.9375rem] leading-relaxed text-kokos-50/90">
        {postreh.text}
      </span>
    </li>
  );
}

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
        <button key={p.slug} type="button" onClick={() => vybrat(p)} className="dlazdice">
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

function Hlavicka({ cislo, zpet }: { cislo: number | null; zpet: () => void }) {
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
        <span className="flex flex-col items-end gap-1.5">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-kokos-50/60">
            Otázka {cislo} z {POCET_OTAZEK}
          </span>
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: POCET_OTAZEK }, (_, i) => i + 1).map((i) => (
              <span
                key={i}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i <= cislo ? "w-3.5 bg-mango-400" : "w-2 bg-white/25",
                ].join(" ")}
              />
            ))}
          </span>
        </span>
      ) : (
        <span className="odznak bg-mango-400/15 text-[0.7rem] tracking-[0.16em] text-mango-400">
          Hotovo ✨
        </span>
      )}
    </div>
  );
}

function Volby({
  moznosti,
  vybrana,
  vybrat,
}: {
  moznosti: ProfilMoznost[];
  vybrana: number | undefined;
  vybrat: (index: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      {moznosti.map((m, i) => (
        <button
          key={m.text}
          type="button"
          onClick={() => vybrat(i)}
          aria-pressed={i === vybrana}
          className={[
            "volba",
            i === vybrana ? "border-mango-400/80 ring-2 ring-mango-400/40" : "",
          ].join(" ")}
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

function Vyhra({ vysledek }: { vysledek: Extract<VysledekKuponu, { stav: "ok" }> }) {
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

      <div className="animate-popIn rounded-3xl border-4 border-mango-400 bg-gradient-to-br from-zapad-500 to-mango-500 px-4 py-5 text-center shadow-[0_20px_44px_-20px_rgba(255,107,53,0.85)]">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-inkoust/75">
          Kód kupónu
        </p>
        <p className="kod-kuponu mt-2 text-[1.6rem] font-black leading-tight text-inkoust">
          {vysledek.kod}
        </p>
      </div>

      <a href={ESHOP_URL} className="tlacitko-zapad text-[0.9375rem] tracking-[0.03em]">
        Nakoupit na wildandcoco.com
      </a>

      {/* Viz KvizFlow: po kvízu je host přihlášený, pustíme ho rovnou do appky. */}
      <Link href="/" className="tlacitko-vedlejsi text-[0.9375rem] tracking-[0.03em]">
        Pokračovat do Longevity Bar appky →
      </Link>

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
              <strong className="font-bold text-mango-300">vyfoť nebo opiš</strong>.
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
