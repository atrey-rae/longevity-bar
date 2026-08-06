"use client";

import { useState } from "react";

import VydatTlacitko from "@/components/VydatTlacitko";
import { useT } from "@/lib/i18n/client";
import { MAX_ZALOH } from "@/lib/kredit-ui";

/**
 * Výdejová část vstupenky: počet zálohovaných kelímků + tlačítko VYDAT.
 *
 * Proč jedna komponenta a ne dvě: hodnota stepperu musí odejít v TĚLE výdeje.
 * Kdyby stepper stál vedle `VydatTlacitko` samostatně, musel by se stav zvedat
 * někam nad ně — takhle žije přesně tam, kde se používá.
 *
 * Barevně je stepper LAGUNA, ne mango: mango je v celé appce barva primární
 * akce a u pultu se pod stresem mačká to nejsytější tlačítko. Zálohy jsou
 * nastavení výdeje, ne výdej sám.
 */
export default function VydejKreditu({
  orderId,
  vychoziZalohy,
}: {
  orderId: string;
  /** Návrh podle katalogu (kolik kusů odchází v kelímku). Pokladní ho upraví. */
  vychoziZalohy: number;
}) {
  const t = useT();
  const [zalohy, setZalohy] = useState(
    Math.min(MAX_ZALOH, Math.max(0, vychoziZalohy)),
  );

  const posun = (o: number) =>
    setZalohy((p) => Math.min(MAX_ZALOH, Math.max(0, p + o)));

  return (
    <div className="space-y-4">
      {/* Laguna panel: jiná rodina než mango (primární akce) i než zelený pruh
          VYDAT. laguna-100 (#c2ebe9) na inkoustu vstupenky = 12,7:1,
          laguna-200 (#8ed9d5) = 8,8:1 — obojí vysoko nad WCAG AA. */}
      <div className="rounded-2xl border border-laguna-300/45 bg-laguna-500/[0.18] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.16em] text-laguna-200">
              {t.kredit.zalohyNadpis}
            </span>
            <span className="mt-0.5 block text-[0.7rem] font-semibold leading-snug text-laguna-100/75">
              {t.kredit.zalohyNapoveda}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => posun(-1)}
              disabled={zalohy === 0}
              aria-label={t.kredit.zalohyUbrat}
              className="grid h-11 w-11 place-items-center rounded-full border border-laguna-300/60 bg-laguna-900/40 text-2xl font-black text-laguna-100 transition disabled:opacity-30"
            >
              −
            </button>
            <output
              aria-live="polite"
              className="w-7 text-center text-lg font-black tabular-nums text-white"
            >
              {zalohy}
            </output>
            <button
              type="button"
              onClick={() => posun(1)}
              disabled={zalohy >= MAX_ZALOH}
              aria-label={t.kredit.zalohyPridat}
              className="grid h-11 w-11 place-items-center rounded-full border border-laguna-300/60 bg-laguna-400/25 text-2xl font-black text-laguna-100 transition disabled:opacity-30"
            >
              +
            </button>
          </span>
        </div>
      </div>

      <VydatTlacitko endpoint="/api/kredit/vydat" telo={{ orderId, zalohy }} />
    </div>
  );
}
