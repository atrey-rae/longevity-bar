import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PrihlaseniFormular from "@/components/PrihlaseniFormular";
import { getT } from "@/lib/i18n/server";
import { najitBavice } from "@/lib/kviz";
import { bezpecnyNext, prvni } from "@/lib/navigation";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.prihlaseni.titulek };
}

export default async function PrihlaseniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, { t }] = await Promise.all([searchParams, getT()]);
  const next = bezpecnyNext(prvni(sp.next));
  const chyba = prvni(sp.chyba);

  const user = await getSessionUser();
  if (user) redirect(next);

  const jdeOSken = next.startsWith("/scan/");
  const jdeOOdmeny = next === "/odmeny";

  /**
   * Vstup do kvízu má vlastní copy: kdo sem přijde z QR kódu baviče, nechce
   * číst o razítkách, ale vidět, že je krok od slevy — a proč po něm chceme
   * telefon. Slug se bere z `next` (`/kviz/<slug>` i s případným `?od=`),
   * `najitBavice` je čistá funkce a neznámý slug prostě jméno nedoplní.
   */
  const jdeOKviz = next.startsWith("/kviz/");
  const bavicKvizu = jdeOKviz
    ? najitBavice(next.slice("/kviz/".length).split(/[?#/]/)[0])
    : undefined;

  return (
    <div className="obal space-y-6">
      <div className="text-center">
        <div className="mb-2 text-6xl animate-plovouci" aria-hidden>
          🥥
        </div>
        <h1 className="text-stin">
          {jdeOKviz ? t.prihlaseni.nadpisKviz : t.prihlaseni.nadpis}
        </h1>
        <p className="mt-2 text-base text-kokos-50/85">
          {jdeOKviz ? (
            bavicKvizu ? (
              <>
                {t.prihlaseni.podnadpisKvizPred}{" "}
                <strong className="font-bold text-mango-400">
                  {bavicKvizu.jmeno}
                </strong>{" "}
                {t.prihlaseni.podnadpisKvizPo}
              </>
            ) : (
              t.prihlaseni.podnadpisKvizBezBavice
            )
          ) : jdeOSken ? (
            t.prihlaseni.podnadpisSken
          ) : jdeOOdmeny ? (
            t.prihlaseni.podnadpisOdmeny
          ) : (
            t.prihlaseni.podnadpisObecny
          )}
        </p>
        {jdeOKviz && (
          <p className="mx-auto mt-3 max-w-[21rem] text-sm leading-relaxed text-kokos-50/70">
            {t.prihlaseni.procTelefonKviz}
          </p>
        )}
      </div>

      {chyba === "oauth" && (
        <p
          role="alert"
          className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
        >
          {t.prihlaseni.chybaOauth}
        </p>
      )}

      <div className="karta">
        <PrihlaseniFormular next={next} />
      </div>

      {/* Pravidla se otevírají v nové záložce — jinak by host uprostřed
          přihlášení přišel o rozepsaný telefon i o čekání na SMS. */}
      <p className="text-center text-xs leading-relaxed text-kokos-50/60">
        {jdeOKviz ? t.prihlaseni.souhlasKvizPred : t.prihlaseni.souhlasPred}{" "}
        <a
          href="/pravidla"
          target="_blank"
          rel="noopener"
          className="odkaz"
        >
          {t.prihlaseni.souhlasOdkaz}
        </a>
        {t.prihlaseni.souhlasPo}
      </p>
    </div>
  );
}
