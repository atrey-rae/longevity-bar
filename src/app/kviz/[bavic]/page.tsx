import type { Metadata } from "next";
import { notFound } from "next/navigation";

import KvizFlow from "@/components/KvizFlow";
import { BAVICI, najitBavice } from "@/lib/kviz";

export const metadata: Metadata = {
  title: "Odemkni potenciál svého mikrobiomu — kvíz",
};

/** Šest bavičů = šest statických stránek, žádná jiná adresa neexistuje. */
export function generateStaticParams(): { bavic: string }[] {
  return BAVICI.map((b) => ({ bavic: b.slug }));
}

export const dynamicParams = false;

/**
 * Kvíz z QR kódu baviče fronty — `/kviz/<bavic>`.
 * Veřejné, bez přihlášení: návštěvník naskenuje, odpoví, dostane kupón 21 %.
 */
export default async function KvizPage({
  params,
}: {
  params: Promise<{ bavic: string }>;
}) {
  const { bavic: slug } = await params;
  const bavic = najitBavice(slug);
  if (!bavic) notFound();

  return (
    <div className="obal">
      <KvizFlow bavic={bavic} />
    </div>
  );
}
