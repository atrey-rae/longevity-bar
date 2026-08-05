import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PrihlaseniFormular from "@/components/PrihlaseniFormular";
import { bezpecnyNext, prvni } from "@/lib/navigation";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Přihlášení" };

export default async function PrihlaseniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = bezpecnyNext(prvni(sp.next));
  const chyba = prvni(sp.chyba);

  const user = await getSessionUser();
  if (user) redirect(next);

  const jdeOSken = next.startsWith("/scan/");
  const jdeOOdmeny = next === "/odmeny";

  return (
    <div className="obal space-y-6">
      <div className="text-center">
        <div className="mb-2 text-6xl animate-plovouci" aria-hidden>
          🥥
        </div>
        <h1 className="text-stin">Přihlas se a sbírej razítka</h1>
        <p className="mt-2 text-base text-kokos-50/85">
          {jdeOSken
            ? "Ještě krok — po přihlášení otevřeme kartu a razítko připíšeme, pokud je QR kód platný právě dnes."
            : jdeOOdmeny
              ? "Po přihlášení otevřeme tvoji věrnostní kartu a všechny nasbírané odměny."
              : "Za každá 4 razítka si vybereš odměnu zdarma."}
        </p>
      </div>

      {chyba === "oauth" && (
        <p
          role="alert"
          className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
        >
          Přihlášení přes Google se nedokončilo. Zkus to prosím znovu nebo
          použij telefon.
        </p>
      )}

      <div className="karta">
        <PrihlaseniFormular next={next} />
      </div>

      <p className="text-center text-xs leading-relaxed text-kokos-50/60">
        Přihlášením souhlasíš se zpracováním telefonu a následně zadaného e-mailu pro účely věrnostního
        programu. Detaily v{" "}
        <a href="/pravidla" className="odkaz">
          pravidlech
        </a>
        .
      </p>
    </div>
  );
}
