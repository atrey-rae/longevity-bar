import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PrihlaseniFormular from "@/components/PrihlaseniFormular";
import { getT } from "@/lib/i18n/server";
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

  return (
    <div className="obal space-y-6">
      <div className="text-center">
        <div className="mb-2 text-6xl animate-plovouci" aria-hidden>
          🥥
        </div>
        <h1 className="text-stin">{t.prihlaseni.nadpis}</h1>
        <p className="mt-2 text-base text-kokos-50/85">
          {jdeOSken
            ? t.prihlaseni.podnadpisSken
            : jdeOOdmeny
              ? t.prihlaseni.podnadpisOdmeny
              : t.prihlaseni.podnadpisObecny}
        </p>
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

      <p className="text-center text-xs leading-relaxed text-kokos-50/60">
        {t.prihlaseni.souhlasPred}{" "}
        <a href="/pravidla" className="odkaz">
          {t.prihlaseni.souhlasOdkaz}
        </a>
        {t.prihlaseni.souhlasPo}
      </p>
    </div>
  );
}
