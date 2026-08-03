"use client";

import { useEffect, useState } from "react";

const FORMAT_CAS = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const FORMAT_DATUM = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  weekday: "long",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

/**
 * Běžící hodiny — spolu s animací dokazují obsluze, že jde o živou
 * obrazovku, ne o screenshot. Čas se aktualizuje každou sekundu.
 */
export default function ZiveHodiny() {
  const [ted, setTed] = useState<Date | null>(null);

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
        {ted ? FORMAT_CAS.format(ted) : "--:--:--"}
      </div>
      <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-white/80">
        {ted ? FORMAT_DATUM.format(ted) : " "}
      </div>
    </div>
  );
}
