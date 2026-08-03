"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Product } from "@/lib/types";

/**
 * Mřížka produktů aktuálního tieru. Výběr potvrzuje SERVER
 * (kontroluje se stav odměny, kategorie i to, že produkt není vypnutý).
 */
export default function VyberProduktuGrid({
  produkty,
}: {
  produkty: Product[];
}) {
  const router = useRouter();
  const [odesilanyId, setOdesilanyId] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  async function vybrat(product: Product) {
    if (odesilanyId) return;
    setOdesilanyId(product.id);
    setChyba(null);
    try {
      const res = await fetch("/api/odmena/vybrat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        rewardId?: string;
        zprava?: string;
      };

      if (res.ok && data.rewardId) {
        router.replace(`/odmena/${data.rewardId}`);
        router.refresh();
        return;
      }
      if (data.status === "no_reward") {
        router.replace("/");
        router.refresh();
        return;
      }
      setChyba(data.zprava ?? "Výběr se nepodařil, zkus to prosím znovu.");
    } catch {
      setChyba("Nemáš signál? Zkontroluj připojení a zkus to znovu.");
    } finally {
      setOdesilanyId(null);
    }
  }

  if (produkty.length === 0) {
    return (
      <p className="karta text-center text-base font-semibold">
        Momentálně není nic skladem 😢 Zeptej se prosím obsluhy u pokladny.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {produkty.map((p) => {
          const nacita = odesilanyId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={odesilanyId !== null}
              onClick={() => void vybrat(p)}
              className={[
                "flex min-h-[8.5rem] flex-col items-center justify-center gap-1 rounded-3xl border-2 p-3 text-center transition",
                "border-white/20 bg-white/95 text-inkoust shadow-karta",
                "active:translate-y-[2px] disabled:opacity-60",
                nacita ? "ring-4 ring-mango-400" : "",
              ].join(" ")}
            >
              <span className="text-4xl" aria-hidden>
                {p.emoji ?? "🥥"}
              </span>
              <span className="text-base font-extrabold leading-tight">
                {p.name}
              </span>
              {p.description && (
                <span className="text-xs font-medium text-inkoust/60">
                  {p.description}
                </span>
              )}
              {nacita && (
                <span className="text-xs font-bold uppercase tracking-wider text-zapad-600">
                  Vybírám…
                </span>
              )}
            </button>
          );
        })}
      </div>

      {chyba && (
        <p className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white">
          {chyba}
        </p>
      )}
    </div>
  );
}
