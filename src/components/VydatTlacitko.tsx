"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const DRZENI_MS = 3000;

type Stav = "klid" | "drzim" | "odesilam" | "hotovo" | "chyba";

/**
 * Tlačítko VYDAT — vyžaduje podržení 3 sekundy (ochrana proti omylu
 * i proti tomu, aby si zákazník odměnu odklikl sám omylem).
 * Po dokončení POSTne na serverový endpoint, který odměnu znehodnotí.
 */
export default function VydatTlacitko({
  rewardId,
  vyzadujePin = false,
}: {
  rewardId: string;
  vyzadujePin?: boolean;
}) {
  const router = useRouter();
  const [stav, setStav] = useState<Stav>("klid");
  const [postup, setPostup] = useState(0);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const dokoncenoRef = useRef(false);

  const zrusitSmycku = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => zrusitSmycku(), [zrusitSmycku]);

  const odeslat = useCallback(async () => {
    setStav("odesilam");
    setChyba(null);
    try {
      const res = await fetch(`/api/odmena/${rewardId}/vydat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        zprava?: string;
      };

      if (res.ok && data.status === "ok") {
        setStav("hotovo");
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.([40, 60, 120]);
        }
        router.refresh();
        return;
      }

      setStav("chyba");
      setChyba(data.zprava ?? "Výdej se nepodařil. Zkus to prosím znovu.");
    } catch {
      setStav("chyba");
      setChyba("Nemáš signál? Zkontroluj připojení a zkus to znovu.");
    } finally {
      setPostup(0);
    }
  }, [pin, rewardId, router]);

  const start = useCallback(() => {
    if (stav === "odesilam" || stav === "hotovo") return;
    dokoncenoRef.current = false;
    setStav("drzim");
    setChyba(null);
    startRef.current = performance.now();

    const krok = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / DRZENI_MS);
      setPostup(p);
      if (p >= 1) {
        if (!dokoncenoRef.current) {
          dokoncenoRef.current = true;
          zrusitSmycku();
          void odeslat();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(krok);
    };
    rafRef.current = requestAnimationFrame(krok);
  }, [odeslat, stav, zrusitSmycku]);

  const konec = useCallback(() => {
    if (dokoncenoRef.current) return;
    zrusitSmycku();
    setPostup(0);
    setStav((s) => (s === "drzim" ? "klid" : s));
  }, [zrusitSmycku]);

  if (stav === "hotovo") {
    return (
      <div className="rounded-2xl bg-list-500 px-6 py-5 text-center text-xl font-black uppercase tracking-wide text-white">
        Vydáno ✓
      </div>
    );
  }

  const procenta = Math.round(postup * 100);
  const zbyva = Math.max(0, Math.ceil((DRZENI_MS - postup * DRZENI_MS) / 1000));

  return (
    <div className="space-y-3">
      {vyzadujePin && (
        <label className="block">
          <span className="mb-1 block text-sm font-bold uppercase tracking-wider text-white/80">
            PIN obsluhy
          </span>
          <input
            className="vstup text-center tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
          />
        </label>
      )}

      <button
        type="button"
        disabled={stav === "odesilam"}
        onPointerDown={start}
        onPointerUp={konec}
        onPointerLeave={konec}
        onPointerCancel={konec}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full select-none overflow-hidden rounded-2xl border-4 border-white/70 bg-inkoust/70 px-6 py-6 text-center disabled:opacity-70"
        style={{ touchAction: "none", WebkitUserSelect: "none" }}
        aria-label="Podrž 3 sekundy pro výdej odměny"
      >
        <span
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-list-500 to-list-600 transition-[width] duration-75"
          style={{ width: `${procenta}%` }}
          aria-hidden
        />
        <span className="relative block text-2xl font-black uppercase tracking-widest text-white">
          {stav === "odesilam" ? "Zpracovávám…" : "Vydat"}
        </span>
        <span className="relative mt-1 block text-xs font-bold uppercase tracking-widest text-white/75">
          {stav === "drzim"
            ? `Drž ještě ${zbyva} s`
            : "Jen obsluha · podrž 3 sekundy"}
        </span>
      </button>

      {chyba && (
        <p className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white">
          {chyba}
        </p>
      )}
    </div>
  );
}
