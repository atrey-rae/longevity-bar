import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getT } from "@/lib/i18n/server";
import { CATEGORIES, CATEGORY_EMOJI, STAMPS_PER_TIER } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.pravidla.titulek };
}

/**
 * Zvýraznění `**takhle**` uvnitř věty právního textu.
 *
 * Právní odstavce musí být v obou jazycích jeden souvislý řetězec (překladatel
 * potřebuje vidět celou větu, ne půlky kolem `<strong>`), zároveň ale mají
 * zachovat dosavadní tučné pasáže. Minimální značkování je tu levnější než
 * rozsekat každou větu na tři klíče.
 */
function sTucnym(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((cast, i) =>
    i % 2 === 1 ? (
      <strong key={i}>{cast}</strong>
    ) : (
      <span key={i}>{cast}</span>
    ),
  );
}

function Sekce({ nadpis, children }: { nadpis: string; children: ReactNode }) {
  return (
    <section className="karta space-y-3 text-[0.9375rem] leading-relaxed text-kokos-50/90">
      <h2 className="flex items-center gap-2.5 border-b border-white/10 pb-2.5 text-lg text-kokos-50">
        <span
          className="h-4 w-1 shrink-0 rounded-full bg-mango-400"
          aria-hidden
        />
        {nadpis}
      </h2>
      {children}
    </section>
  );
}

function Odrazky({ body }: { body: readonly string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-mango-400">
      {body.map((radek) => (
        <li key={radek}>{sTucnym(radek)}</li>
      ))}
    </ul>
  );
}

function Podnadpis({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-1 text-[0.8125rem] font-black uppercase tracking-[0.12em] text-mango-400">
      {children}
    </h3>
  );
}

export default async function PravidlaPage() {
  const { t } = await getT();
  const p = t.pravidla;

  return (
    <div className="obal space-y-5">
      <h1 className="text-stin">{p.nadpis}</h1>

      <Sekce nadpis={p.razitkaNadpis}>
        <Odrazky body={p.razitkaBody} />
      </Sekce>

      <Sekce nadpis={p.odmenyNadpis}>
        <p>{sTucnym(p.odmenyUvod(STAMPS_PER_TIER))}</p>
        <ol className="space-y-2">
          {CATEGORIES.map((kat, i) => (
            <li
              key={kat}
              className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-xl"
                aria-hidden
              >
                {CATEGORY_EMOJI[kat]}
              </span>
              <span className="font-semibold leading-snug">
                {i + 1}. {t.vernost.kategorieDlouhe[kat]}
              </span>
            </li>
          ))}
        </ol>
        <p>{p.odmenyZaver}</p>
      </Sekce>

      <Sekce nadpis={p.vyzvednutiNadpis}>
        <Odrazky body={p.vyzvednutiBody} />
      </Sekce>

      <Sekce nadpis={p.reklamaceNadpis}>
        <p>{p.reklamaceText}</p>
      </Sekce>

      <Sekce nadpis={p.gdprNadpis}>
        <p>{sTucnym(p.gdprSpravce)}</p>

        <Podnadpis>{p.gdprVernostNadpis}</Podnadpis>
        <Odrazky body={p.gdprVernostBody} />

        <Podnadpis>{p.gdprKvizNadpis}</Podnadpis>
        <Odrazky body={p.gdprKvizBody} />

        <Podnadpis>{p.gdprSpolecneNadpis}</Podnadpis>
        <Odrazky body={p.gdprSpolecneBody} />
      </Sekce>

      <Link href="/odmeny" className="tlacitko-vedlejsi">
        {t.spolecne.zpetNaKartu}
      </Link>
    </div>
  );
}
