"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import type { BarCreditPolozka } from "@/lib/healing-credit";
import { useT } from "@/lib/i18n/client";
import { VSTUPENKY_ID } from "@/lib/kredit-ui";
import { korun } from "@/lib/text";

const MAX_KUSU = 20;

type Stav = "klid" | "odesilam" | "hotovo" | "chyba";

/** Kolik snímků čekat, než se po refreshi objeví vstupenka (~1 s při 60 fps). */
const MAX_SNIMKU_NA_VSTUPENKU = 60;

/**
 * Odscrolluje na sekci s živými vstupenkami.
 *
 * Sekce vzniká až v SERVER komponentě po `router.refresh()`, takže v okamžiku
 * volání ještě nemusí být v DOM — proto se na ni pár snímků počká.
 * `prefers-reduced-motion` vypíná plynulé posouvání (stejné pravidlo jako
 * v `globals.css`).
 */
function odscrollujNaVstupenku(pokus = 0): void {
  const cil = document.getElementById(VSTUPENKY_ID);
  if (!cil) {
    if (pokus < MAX_SNIMKU_NA_VSTUPENKU) {
      requestAnimationFrame(() => odscrollujNaVstupenku(pokus + 1));
    }
    return;
  }
  const omezitPohyb = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cil.scrollIntoView({
    behavior: omezitPohyb ? "auto" : "smooth",
    block: "start",
  });
}

/**
 * Výběr položek z kreditu — plusy/minusy a jedno tlačítko „Objednat“.
 *
 * Součet hlídáme i tady, aby host neposlal objednávku, o které dopředu víme,
 * že ji Healing.app odmítne. Skutečné rozhodnutí ale dělá vždy až bridge:
 * kredit mohl mezitím utratit na jiném zařízení.
 */
export default function KreditObjednavka({
  katalog,
  zbyva,
}: {
  katalog: BarCreditPolozka[];
  zbyva: number;
}) {
  const t = useT();
  const router = useRouter();
  const [kusy, setKusy] = useState<Record<string, number>>({});
  const [stav, setStav] = useState<Stav>("klid");
  const [chyba, setChyba] = useState<string | null>(null);
  // `router.refresh()` je „fire and forget“. V přechodu ale víme, KDY doběhl —
  // teprve pak má smysl hledat vstupenku v DOM.
  const [obnovuji, spustitObnovu] = useTransition();

  /**
   * Bez tohohle efektu byl na produkci bug: objednávka se založila, server
   * komponenta se opravdu překreslila a vstupenka VZNIKLA — jenže nad
   * katalogem. Prohlížeč po vložení obsahu nad viewportem dorovná scroll
   * (scroll anchoring), takže host zůstal viset u tlačítka „Objednat“
   * a vstupenka mu skončila ~650 px nad obrazovkou. Vypadalo to, že se
   * nestalo nic. Proto po dokončení obnovy sjedeme na vstupenku.
   */
  useEffect(() => {
    if (stav !== "hotovo" || obnovuji) return;
    odscrollujNaVstupenku();
  }, [stav, obnovuji]);

  const naVstupenku = useCallback(() => odscrollujNaVstupenku(), []);

  const soucet = useMemo(
    () =>
      katalog.reduce(
        (celkem, polozka) => celkem + polozka.price * (kusy[polozka.id] ?? 0),
        0,
      ),
    [katalog, kusy],
  );
  const vybranoKusu = Object.values(kusy).reduce((a, b) => a + b, 0);
  const prekroceno = soucet > zbyva;

  function zmenit(id: string, o: number) {
    setChyba(null);
    // Jakmile host sahá na další výběr, potvrzení předchozí objednávky
    // dosloužilo — jinak by nad novým výběrem viselo staré „hotovo“.
    setStav((s) => (s === "hotovo" ? "klid" : s));
    setKusy((predchozi) => {
      const nove = Math.min(MAX_KUSU, Math.max(0, (predchozi[id] ?? 0) + o));
      const kopie = { ...predchozi };
      if (nove === 0) delete kopie[id];
      else kopie[id] = nove;
      return kopie;
    });
  }

  async function objednat() {
    if (vybranoKusu === 0 || prekroceno) return;
    setStav("odesilam");
    setChyba(null);
    try {
      const res = await fetch("/api/kredit/objednat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: Object.entries(kusy).map(([id, qty]) => ({ id, qty })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        zprava?: string;
      };
      if (res.ok && data.status === "ok") {
        // Potvrzení se ukazuje OKAMŽITĚ, bez čekání na server. Refresh běží
        // v přechodu a po jeho dokončení efekt výš odscrolluje na vstupenku.
        setKusy({});
        setStav("hotovo");
        spustitObnovu(() => router.refresh());
        return;
      }
      setStav("chyba");
      setChyba(data.zprava ?? t.kredit.chybaObjednavky);
    } catch {
      setStav("chyba");
      setChyba(t.spolecne.nemasSignal);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {katalog.map((polozka) => {
          const pocet = kusy[polozka.id] ?? 0;
          return (
            <li
              key={polozka.id}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                pocet > 0
                  ? "border-mango-400/60 bg-mango-400/[0.12]"
                  : "border-white/15 bg-white/[0.08]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold leading-snug text-kokos-50">
                  {polozka.n}
                </span>
                <span className="block text-xs font-semibold tabular-nums text-kokos-50/75">
                  {korun(polozka.price)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => zmenit(polozka.id, -1)}
                  disabled={pocet === 0 || stav === "odesilam"}
                  aria-label={t.kredit.ubrat(polozka.n)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-2xl font-black text-kokos-50 transition disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center text-base font-black tabular-nums text-kokos-50">
                  {pocet}
                </span>
                <button
                  type="button"
                  onClick={() => zmenit(polozka.id, 1)}
                  disabled={pocet >= MAX_KUSU || stav === "odesilam"}
                  aria-label={t.kredit.pridat(polozka.n)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-mango-400/70 bg-mango-400/20 text-2xl font-black text-mango-300 transition disabled:opacity-30"
                >
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between gap-3 border-t border-white/10 px-1 pt-3">
        <span className="text-xs font-bold uppercase tracking-widest text-kokos-50/70">
          {t.kredit.vybrano}
        </span>
        <span
          className={`text-lg font-black tabular-nums ${
            prekroceno ? "text-zapad-400" : "text-kokos-50"
          }`}
        >
          {korun(soucet)}
        </span>
      </div>

      {prekroceno && (
        <p role="alert" className="text-center text-xs font-bold text-zapad-400">
          {t.kredit.prekroceno(korun(zbyva))}
        </p>
      )}

      {/* Okamžité potvrzení u palce — host ho vidí dřív, než doběhne server.
          Zelená (list-600) je v appce barva „hotovo“ (stejná jako po výdeji)
          a kokos-50 na ní drží 5,4:1, tedy nad WCAG AA. */}
      {stav === "hotovo" && (
        <div
          role="status"
          className="space-y-2.5 rounded-2xl border border-list-500/60 bg-list-600/90 px-4 py-3.5 text-center"
        >
          <p className="text-base font-black leading-tight text-kokos-50">
            {t.kredit.objednavkaHotova}
          </p>
          <p className="text-xs font-semibold leading-relaxed text-kokos-50/85">
            {t.kredit.objednavkaHotovaPopis}
          </p>
          {/* Záchranná brzda: kdyby automatický scroll cokoli přeskočilo
              (starý prohlížeč, přerušený přechod), host má akci po ruce. */}
          <button
            type="button"
            onClick={naVstupenku}
            className="min-h-11 w-full rounded-xl bg-kokos-50 px-4 text-sm font-black uppercase tracking-wider text-inkoust transition hover:bg-white"
          >
            {t.kredit.zobrazitVstupenku}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={objednat}
        disabled={vybranoKusu === 0 || prekroceno || stav === "odesilam"}
        /* Nečinné tlačítko nesmí být nejsytější plocha na obrazovce — zlatý
           blok při „nic nevybráno“ křičel a přitom nešel zmáčknout. */
        className="tlacitko-hlavni disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-kokos-50/50 disabled:shadow-none"
      >
        {stav === "odesilam" ? t.kredit.objednavam : t.kredit.objednat}
      </button>

      {chyba && (
        <p
          role="alert"
          className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
        >
          {chyba}
        </p>
      )}
    </div>
  );
}
