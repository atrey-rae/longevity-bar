"use client";

import { useState } from "react";

import KvizFlow from "@/components/KvizFlow";
import KvizFlowProfil from "@/components/KvizFlowProfil";
import type { Bavic, QuizVariant } from "@/lib/kviz";

export default function QuizVariantSelector({
  bavic,
  recommended,
  completed,
  referralKod = null,
}: {
  bavic: Bavic;
  recommended: QuizVariant;
  completed: QuizVariant[];
  /** Ověřený kód z `?od=` — jen se propíše do formuláře, nikde se nezobrazuje. */
  referralKod?: string | null;
}) {
  const [selected, setSelected] = useState<QuizVariant | null>(null);
  if (selected === "microbiom") {
    return <KvizFlow bavic={bavic} referralKod={referralKod} />;
  }
  if (selected === "profil") {
    return <KvizFlowProfil bavic={bavic} referralKod={referralKod} />;
  }

  const done = new Set(completed);
  return (
    <section className="flex min-h-[68vh] flex-col justify-center space-y-6">
      <div className="text-center">
        <div className="mb-3 text-6xl" aria-hidden>🥥</div>
        <h1 className="text-stin">Vyber si svůj kvíz</h1>
        <p className="mx-auto mt-3 max-w-[21rem] text-kokos-50/85">
          Každý můžeš dokončit jednou. Odpovědi zůstávají jen ve tvém telefonu.
        </p>
      </div>
      <div className="grid gap-3">
        <VariantButton
          title="Mikrobiom"
          description="Rychlý kvíz · 3 otázky"
          recommended={recommended === "microbiom"}
          completed={done.has("microbiom")}
          onClick={() => setSelected("microbiom")}
        />
        <VariantButton
          title="Longevity profil"
          description="Podrobnější kvíz · 9 otázek"
          recommended={recommended === "profil"}
          completed={done.has("profil")}
          onClick={() => setSelected("profil")}
        />
      </div>
      <p className="text-center text-sm text-kokos-50/65">
        Posílá tě <strong className="text-mango-400">{bavic.jmeno}</strong> z Longevity Baru.
      </p>
    </section>
  );
}

function VariantButton({
  title, description, recommended, completed, onClick,
}: {
  title: string;
  description: string;
  recommended: boolean;
  completed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={completed}
      onClick={onClick}
      className="karta flex min-h-24 items-center justify-between gap-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>
        <span className="block text-xl font-black text-kokos-50">{title}</span>
        <span className="mt-1 block text-sm text-kokos-50/70">{description}</span>
        {recommended && !completed && <span className="mt-2 inline-block text-xs font-bold text-mango-400">Doporučený pro tento QR</span>}
      </span>
      <span className="text-right text-sm font-extrabold text-mango-400">{completed ? "Hotovo ✓" : "Vybrat →"}</span>
    </button>
  );
}
