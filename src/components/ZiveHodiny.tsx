"use client";

import { useEffect, useMemo, useState } from "react";

import { useLang } from "@/lib/i18n/client";

/** `en-GB` drží den napřed a 24h čas — stejné pořadí jako české formáty. */
const LOCALE: Record<string, string> = { cs: "cs-CZ", en: "en-GB" };

/**
 * Běžící hodiny — spolu s animací dokazují obsluze, že jde o živou
 * obrazovku, ne o screenshot. Čas se aktualizuje každou sekundu.
 */
export default function ZiveHodiny() {
  const lang = useLang();
  const [ted, setTed] = useState<Date | null>(null);

  const { cas, datum } = useMemo(() => {
    const loc = LOCALE[lang] ?? "cs-CZ";
    return {
      cas: new Intl.DateTimeFormat(loc, {
        timeZone: "Europe/Prague",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      datum: new Intl.DateTimeFormat(loc, {
        timeZone: "Europe/Prague",
        weekday: "long",
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }),
    };
  }, [lang]);

  useEffect(() => {
    setTed(new Date());
    const id = window.setInterval(() => setTed(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="text-center">
      <div
        className="font-mono text-5xl font-black tabular-nums tracking-tight text-white text-stin"
        aria-live="off"
      >
        {ted ? cas.format(ted) : "--:--:--"}
      </div>
      <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-white/80">
        {ted ? datum.format(ted) : " "}
      </div>
    </div>
  );
}
