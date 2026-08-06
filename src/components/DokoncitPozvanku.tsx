"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useT } from "@/lib/i18n/client";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Kam host míří po úspěchu — rozcestník má nahoře kreditní banner. */
const PO_PRIHLASENI = "/";

/** Jediná cesta při selhání, stejná jako na serveru. */
const PRI_SELHANI = "/prihlaseni";

/**
 * Dokončení pozvánky v prohlížeči.
 *
 * Server komponenta cookies zapsat nesmí, takže jednorázový token vyměňuje za
 * session prohlížečový klient — PŘESNĚ tak, jak to appka dělá po opsání SMS
 * kódu (`PrihlaseniFormular`). Žádný nový mechanismus přihlašování tu nevzniká.
 *
 * Host tuhle obrazovku vidí zlomek vteřiny; je tu jen proto, aby mu appka
 * nezmizela pod rukama, kdyby síť zaváhala.
 */
export default function DokoncitPozvanku({ tokenHash }: { tokenHash: string }) {
  const t = useT();
  const router = useRouter();

  useEffect(() => {
    let zruseno = false;
    void (async () => {
      try {
        const { error } = await getBrowserSupabase().auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });
        if (zruseno) return;
        // I chyba končí stejně jako neplatný token — host se nedozví proč.
        router.replace(error ? PRI_SELHANI : PO_PRIHLASENI);
        if (!error) router.refresh();
      } catch {
        if (!zruseno) router.replace(PRI_SELHANI);
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [tokenHash, router]);

  return (
    <div className="obal">
      <div className="karta space-y-3 text-center" role="status" aria-live="polite">
        <p className="animate-plovouci text-5xl" aria-hidden>
          🥥
        </p>
        <h1 className="text-stin">{t.pozvanka.nadpis}</h1>
        <p className="text-sm leading-relaxed text-kokos-50/80">{t.pozvanka.popis}</p>
      </div>
    </div>
  );
}
