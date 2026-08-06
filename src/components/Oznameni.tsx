"use client";

import { useCallback, useEffect, useState } from "react";

import { useT } from "@/lib/i18n/client";
import { useLang } from "@/lib/i18n/client";
import {
  klicDoPole,
  potrebujeNaPlochuKvuliPush,
  umiPush,
} from "@/lib/pwa";

type Stav =
  | "zjistuji"
  | "nepodporovano"
  | "naploshu"
  | "vypnuto"
  | "zapinam"
  | "zapnuto"
  | "odmitnuto"
  | "chyba";

/**
 * „Zapnout oznámení" — decentní nabídka, ne vyskakovací okno.
 *
 * Tři zásady, které drží nabídku na straně slušnosti:
 *
 *   1. NIKDY SE NEPTÁ SAMA. Prohlížeč zobrazí systémový dotaz teprve po
 *      klepnutí hosta. Automatické `requestPermission()` při načtení stránky
 *      je nejrychlejší cesta k trvalému „Blokovat".
 *   2. iOS GATE. Na iPhonu Web Push funguje POUZE z appky přidané na plochu.
 *      V Safari by `subscribe()` skončil chybou, takže tam místo tlačítka
 *      ukážeme návod — instalaci samotnou řeší `InstallPrompt`.
 *   3. TICHO, KDYŽ TO NEJDE. Bez VAPID klíčů (`vapidKlic === null`),
 *      bez podpory prohlížeče nebo po odmítnutí se nenabízí nic.
 */
export default function Oznameni({ vapidKlic }: { vapidKlic: string | null }) {
  const t = useT();
  const lang = useLang();
  const [stav, setStav] = useState<Stav>("zjistuji");

  /* Registrace service workeru + zjištění, jestli odběr už existuje. */
  useEffect(() => {
    if (!vapidKlic) {
      setStav("nepodporovano");
      return;
    }
    let zruseno = false;

    void (async () => {
      if (!umiPush()) {
        if (!zruseno) setStav(potrebujeNaPlochuKvuliPush() ? "naploshu" : "nepodporovano");
        return;
      }
      if (potrebujeNaPlochuKvuliPush()) {
        if (!zruseno) setStav("naploshu");
        return;
      }
      if (Notification.permission === "denied") {
        if (!zruseno) setStav("odmitnuto");
        return;
      }
      try {
        const registrace =
          (await navigator.serviceWorker.getRegistration("/sw.js")) ??
          (await navigator.serviceWorker.register("/sw.js"));
        const odber = await registrace.pushManager.getSubscription();
        if (!zruseno) setStav(odber ? "zapnuto" : "vypnuto");
      } catch {
        if (!zruseno) setStav("nepodporovano");
      }
    })();

    return () => {
      zruseno = true;
    };
  }, [vapidKlic]);

  const zapnout = useCallback(async () => {
    if (!vapidKlic) return;
    setStav("zapinam");
    try {
      const povoleni = await Notification.requestPermission();
      if (povoleni !== "granted") {
        setStav(povoleni === "denied" ? "odmitnuto" : "vypnuto");
        return;
      }
      const registrace = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const odber = await registrace.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: klicDoPole(vapidKlic),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...odber.toJSON(), lang }),
      });
      if (!res.ok) {
        await odber.unsubscribe().catch(() => undefined);
        setStav("chyba");
        return;
      }
      setStav("zapnuto");
    } catch {
      setStav("chyba");
    }
  }, [vapidKlic, lang]);

  const vypnout = useCallback(async () => {
    try {
      const registrace = await navigator.serviceWorker.getRegistration("/sw.js");
      const odber = await registrace?.pushManager.getSubscription();
      if (odber) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: odber.endpoint }),
        }).catch(() => undefined);
        await odber.unsubscribe().catch(() => undefined);
      }
      setStav("vypnuto");
    } catch {
      setStav("chyba");
    }
  }, []);

  // Ticho: nepodporovaný prohlížeč, chybějící konfigurace i natvrdo odmítnuté
  // povolení. Nabízet něco, co nejde zapnout, je jen šum.
  if (stav === "zjistuji" || stav === "nepodporovano" || stav === "odmitnuto") {
    return null;
  }

  if (stav === "naploshu") {
    return (
      <div className="karta space-y-1.5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-mango-400">
          {t.oznameni.eyebrow}
        </p>
        <p className="text-sm font-bold leading-snug text-kokos-50">
          {t.oznameni.iosNadpis}
        </p>
        <p className="text-xs leading-relaxed text-kokos-50/75">
          {t.oznameni.iosPopis}
        </p>
      </div>
    );
  }

  if (stav === "zapnuto") {
    return (
      <p className="px-3 text-center text-xs leading-relaxed text-kokos-50/60">
        {t.oznameni.zapnuto}{" "}
        <button
          type="button"
          onClick={vypnout}
          className="odkaz font-bold text-kokos-50/80"
        >
          {t.oznameni.vypnout}
        </button>
      </p>
    );
  }

  return (
    <div className="karta space-y-2.5 text-center">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-mango-400">
        {t.oznameni.eyebrow}
      </p>
      <p className="text-sm font-bold leading-snug text-kokos-50">
        {t.oznameni.nadpis}
      </p>
      <p className="text-xs leading-relaxed text-kokos-50/75">{t.oznameni.popis}</p>
      <button
        type="button"
        onClick={zapnout}
        disabled={stav === "zapinam"}
        className="tlacitko-vedlejsi disabled:opacity-60"
      >
        {stav === "zapinam" ? t.oznameni.zapinam : t.oznameni.zapnout}
      </button>
      {stav === "chyba" && (
        <p role="alert" className="text-xs font-bold text-zapad-400">
          {t.oznameni.chyba}
        </p>
      )}
    </div>
  );
}
