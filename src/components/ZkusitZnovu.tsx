"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useT } from "@/lib/i18n/client";

/**
 * Opakování serverového načtení bez reloadu celé stránky.
 *
 * `router.refresh()` znovu vyrenderuje server komponentu (a tím i volání
 * mostu), takže host po výpadku nemusí hledat tlačítko prohlížeče. Krátký
 * `disabled` stav brání tomu, aby netrpělivé klepání poslalo pět requestů —
 * `refresh()` sám žádný pending stav nenabízí.
 */
export default function ZkusitZnovu() {
  const t = useT();
  const router = useRouter();
  const [ceka, setCeka] = useState(false);

  return (
    <button
      type="button"
      disabled={ceka}
      onClick={() => {
        setCeka(true);
        router.refresh();
        window.setTimeout(() => setCeka(false), 1500);
      }}
      className="tlacitko-hlavni disabled:opacity-70"
    >
      {t.kredit.zkusitZnovu}
    </button>
  );
}
