"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useT } from "@/lib/i18n/client";

type Stav = "klid" | "ptam" | "rusim" | "chyba";

/**
 * „Zrušit objednávku“ pod živou vstupenkou — vedlejší akce, ne protějšek
 * tlačítka VYDAT.
 *
 * Tři pravidla, na kterých stojí:
 *   1. VÁHA — decentní textové tlačítko, ne barevná plocha. U pultu je hlavní
 *      akce VÝDEJ; zrušení je únikový východ pro hosta, který si to rozmyslel.
 *   2. DVA KROKY — potvrzení se rozbalí přímo v lístku. Nativní dialog
 *      prohlížeče by na mobilu překryl vstupenku a nešel by přeložit.
 *   3. NIC SE NEPŘEDSTÍRÁ — o zrušení rozhoduje Healing.app. Do té doby, než
 *      odpoví `ok`, se lístek nemění; po úspěchu se stránka načte znovu ze
 *      serveru (`router.refresh()`), takže vstupenka zmizí podle SKUTEČNÉHO
 *      stavu, ne podle domněnky klienta.
 */
export default function ZrusitObjednavku({ orderId }: { orderId: string }) {
  const t = useT();
  const router = useRouter();
  const [stav, setStav] = useState<Stav>("klid");
  const [chyba, setChyba] = useState<string | null>(null);

  async function zrusit() {
    setStav("rusim");
    setChyba(null);
    try {
      const res = await fetch("/api/kredit/zrusit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        zprava?: string;
      };
      if (res.ok && data.status === "ok") {
        router.refresh();
        return;
      }
      setStav("chyba");
      setChyba(data.zprava ?? t.kredit.chybaZruseni);
    } catch {
      setStav("chyba");
      setChyba(t.spolecne.nemasSignal);
    }
  }

  if (stav === "klid" || stav === "chyba") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            setChyba(null);
            setStav("ptam");
          }}
          className="mx-auto flex min-h-11 items-center justify-center px-3 text-xs font-bold uppercase tracking-widest text-white/70 underline decoration-white/30 decoration-2 underline-offset-4 transition hover:text-white"
        >
          {t.kredit.zrusit}
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

  return (
    <div className="space-y-2.5 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5">
      <p className="text-center text-sm font-bold leading-snug text-white/85">
        {t.kredit.zrusitPotvrzeni}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStav("klid")}
          disabled={stav === "rusim"}
          className="min-h-11 flex-1 rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-black text-kokos-50 transition hover:bg-white/20 disabled:opacity-40"
        >
          {t.kredit.zrusitNe}
        </button>
        <button
          type="button"
          onClick={zrusit}
          disabled={stav === "rusim"}
          /* Stejná barevná logika jako oranžové tlačítko design systému:
             inkoust na zapad-500 dává 5,98:1. Bílá by měla jen 2,84:1
             a zapad-600 s inkoustem padá na 4,44:1 — obojí pod WCAG AA. */
          className="min-h-11 flex-1 rounded-xl bg-zapad-500 px-3 text-sm font-black text-inkoust transition hover:bg-zapad-400 disabled:opacity-60"
        >
          {stav === "rusim" ? t.kredit.rusim : t.kredit.zrusitAno}
        </button>
      </div>
    </div>
  );
}
