import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import TiskTlacitko from "@/components/TiskTlacitko";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { formatCzechDateLong } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tisk QR kódu" };

export default async function TiskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: den } = await admin
    .from("event_days")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!den) notFound();

  const odkaz = `${siteUrl()}/scan/${den.token}`;

  const qrSvg = await QRCode.toString(odkaz, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href="/admin/dny" className="odkaz text-sm">
          ← Zpět na dny
        </Link>
        <span className="flex-1" />
      </div>

      {!den.active && (
        <p className="no-print rounded-2xl border-2 border-zapad-500 bg-zapad-500/25 px-4 py-3 text-sm font-bold">
          ⚠️ Tento den je vypnutý — QR kód teď razítka nepřipisuje.
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tiskový list A4                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="tisk-list mx-auto max-w-[210mm] rounded-3xl bg-white p-8 text-center text-black shadow-karta">
        <p className="text-2xl font-black tracking-tight">
          🥥 LONGEVITY BAR
        </p>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.3em]">
          Wild &amp; Coco · Peace &amp; Coco
        </p>

        <h1 className="mt-6 text-4xl font-black leading-tight">
          Sejmi QR a máš razítko
        </h1>
        <p className="mt-2 text-lg font-semibold">
          Za každá <strong>4 razítka</strong> odměna zdarma
        </p>

        <div
          className="tisk-qr mx-auto mt-6 w-full max-w-[135mm] [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <p className="mt-5 text-xl font-black">
          {formatCzechDateLong(den.date)}
        </p>
        {den.label && (
          <p className="text-base font-semibold">{den.label}</p>
        )}

        <div className="mt-6 border-t-2 border-dashed border-black/30 pt-4 text-left text-sm">
          <p className="font-black uppercase tracking-wider">Pro obsluhu</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              QR ukazuj <strong>až po zaplacení</strong>, jeden nákup = jedno
              razítko.
            </li>
            <li>
              Kód platí <strong>jen {formatCzechDateLong(den.date)}</strong> —
              ráno vyměň list za nový den.
            </li>
            <li>List drž u sebe, nenechávej ho volně na pultu.</li>
          </ul>
        </div>

        <p className="mt-4 break-all font-mono text-[0.6rem] text-black/50">
          {odkaz}
        </p>
      </div>

      <div className="no-print mx-auto max-w-sm space-y-3 pt-2">
        <TiskTlacitko />
        <p className="text-center text-xs text-kokos-50/60">
          Tip: v tiskovém dialogu vypni záhlaví a zápatí prohlížeče a nastav
          měřítko 100 %.
        </p>
      </div>
    </div>
  );
}
