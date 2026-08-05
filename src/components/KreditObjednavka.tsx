"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { BarCreditPolozka } from "@/lib/healing-credit";
import { korun } from "@/lib/text";

const MAX_KUSU = 20;

type Stav = "klid" | "odesilam" | "chyba";

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
  const router = useRouter();
  const [kusy, setKusy] = useState<Record<string, number>>({});
  const [stav, setStav] = useState<Stav>("klid");
  const [chyba, setChyba] = useState<string | null>(null);

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
        setKusy({});
        setStav("klid");
        router.refresh();
        return;
      }
      setStav("chyba");
      setChyba(data.zprava ?? "Objednávku se nepodařilo odeslat. Zkus to znovu.");
    } catch {
      setStav("chyba");
      setChyba("Nemáš signál? Zkontroluj připojení a zkus to znovu.");
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
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold leading-snug text-kokos-50">
                  {polozka.n}
                </span>
                <span className="block text-xs font-semibold text-kokos-50/70">
                  {korun(polozka.price)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => zmenit(polozka.id, -1)}
                  disabled={pocet === 0 || stav === "odesilam"}
                  aria-label={`Ubrat ${polozka.n}`}
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
                  aria-label={`Přidat ${polozka.n}`}
                  className="grid h-11 w-11 place-items-center rounded-full border border-mango-400/70 bg-mango-400/20 text-2xl font-black text-mango-300 transition disabled:opacity-30"
                >
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-xs font-bold uppercase tracking-widest text-kokos-50/70">
          Vybráno
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
          To je víc, než ti zbývá ({korun(zbyva)}). Uber prosím něco z výběru.
        </p>
      )}

      <button
        type="button"
        onClick={objednat}
        disabled={vybranoKusu === 0 || prekroceno || stav === "odesilam"}
        className="tlacitko-hlavni disabled:opacity-50"
      >
        {stav === "odesilam" ? "Objednávám…" : "Objednat"}
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
