"use client";

import { useState } from "react";

/** Malé tlačítko „Kopírovat“ pro odkaz na sken (admin). */
export default function KopirovatOdkaz({
  hodnota,
  popisek = "Kopírovat odkaz",
}: {
  hodnota: string;
  popisek?: string;
}) {
  const [zkopirovano, setZkopirovano] = useState(false);

  async function kopirovat() {
    try {
      await navigator.clipboard.writeText(hodnota);
      setZkopirovano(true);
      window.setTimeout(() => setZkopirovano(false), 2000);
    } catch {
      window.prompt("Zkopíruj odkaz ručně:", hodnota);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void kopirovat()}
      className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
    >
      {zkopirovano ? "✓ Zkopírováno" : popisek}
    </button>
  );
}
