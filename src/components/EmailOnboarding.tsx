"use client";

import { useState } from "react";

const SUCCESS = "Mrkni se do Tvého inboxu i do spamu, v jednom z nich od nás máš ověřovací email.";

export default function EmailOnboarding({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/email/nastavit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { accepted?: boolean; throttled?: boolean; error?: string };
      if (!response.ok || !data.accepted) throw new Error(data.error || "E-mail se nepodařilo odeslat.");
      setMessage(data.throttled
        ? "Ověřovací e-mail jsme poslali před chvílí. Další můžeš poslat po 10 minutách."
        : SUCCESS);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "E-mail se nepodařilo odeslat.");
    } finally { setBusy(false); }
  }

  return (
    <section className="karta space-y-3 border-2 border-mango-400">
      <h2 className="text-base font-black uppercase tracking-widest text-mango-400">Potvrď si e-mail</h2>
      <p className="text-sm text-kokos-50/85">Razítka už sbíráš. Pro výběr a vyzvednutí odměny ještě potvrď svůj e-mail.</p>
      {!message && <>
        <input className="vstup" type="email" inputMode="email" autoComplete="email" placeholder="jmeno@email.cz" value={email} onChange={(event) => setEmail(event.target.value)} />
        <button type="button" className="tlacitko-hlavni w-full" disabled={busy} onClick={() => void submit()}>{busy ? "Odesílám…" : "Poslat ověřovací e-mail"}</button>
      </>}
      {message && <p className="rounded-xl bg-list-500/20 px-4 py-3 text-sm font-bold">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-zapad-600/90 px-4 py-3 text-sm font-bold text-white">{error}</p>}
    </section>
  );
}
