import Link from "next/link";

import { nazevVarianty } from "@/lib/kviz-varianty";
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  tierNumberForIndex,
} from "@/lib/loyalty";
import { getQuizPolicy } from "@/lib/quiz-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { odmeny, razitka, zakaznici } from "@/lib/text";
import {
  formatCzechDateLong,
  formatCzechDateTime,
  pragueDateString,
  pragueDayRange,
} from "@/lib/time";
import type { Product, ProductCategory, Reward } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Radek {
  nazev: string;
  emoji: string;
  aktivni: boolean;
  ceka: number;
  vydano: number;
}

export default async function AdminPrehledPage() {
  const admin = createAdminClient();
  const dnes = pragueDateString();
  const { start, end } = pragueDayRange(dnes);

  const policy = await getQuizPolicy();

  const [razitkaDnesRes, razitkaCelkemRes, uzivateleRes, odmenyRes, produktyRes, denRes] =
    await Promise.all([
      admin
        .from("stamps")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      admin.from("stamps").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("rewards").select("*"),
      admin.from("products").select("*").order("sort_order"),
      admin.from("event_days").select("*").eq("date", dnes).maybeSingle(),
    ]);

  const razitkaDnes = razitkaDnesRes.count ?? 0;
  const razitkaCelkem = razitkaCelkemRes.count ?? 0;
  const pocetUzivatelu = uzivateleRes.count ?? 0;
  const vsechnyOdmeny: Reward[] = odmenyRes.data ?? [];
  const produkty: Product[] = produktyRes.data ?? [];
  const den = denRes.data;

  const cekajici = vsechnyOdmeny.filter(
    (r) => r.state === "ready" || r.state === "selected",
  );
  const vydane = vsechnyOdmeny.filter((r) => r.state === "redeemed");
  const vydaneDnes = vydane.filter(
    (r) =>
      r.redeemed_at &&
      new Date(r.redeemed_at) >= start &&
      new Date(r.redeemed_at) < end,
  );

  // Rozpad podle produktu (plánování zásob)
  const podleProduktu = new Map<string, Radek>();
  for (const p of produkty) {
    podleProduktu.set(p.id, {
      nazev: p.name,
      emoji: p.emoji ?? CATEGORY_EMOJI[p.category],
      aktivni: p.active,
      ceka: 0,
      vydano: 0,
    });
  }
  for (const r of vsechnyOdmeny) {
    if (!r.product_id) continue;
    const radek = podleProduktu.get(r.product_id);
    if (!radek) continue;
    if (r.state === "selected") radek.ceka += 1;
    if (r.state === "redeemed") radek.vydano += 1;
  }

  const kategorieProduktu = new Map<string, ProductCategory>(
    produkty.map((p) => [p.id, p.category]),
  );

  // Odměny bez vybraného produktu (zákazník si teprve vybere)
  const nevybrano = new Map<ProductCategory, number>();
  for (const r of vsechnyOdmeny) {
    if (r.state === "ready") {
      nevybrano.set(r.category, (nevybrano.get(r.category) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-4">
      <h1>Přehled</h1>

      {!den && (
        <p className="rounded-2xl border-2 border-zapad-500 bg-zapad-500/25 px-4 py-3 text-sm font-bold">
          ⚠️ Pro dnešek ({formatCzechDateLong(dnes)}) není založený žádný
          festivalový den — QR kódy dnes nebudou fungovat.{" "}
          <Link href="/admin/dny" className="odkaz">
            Založit den
          </Link>
        </p>
      )}
      {den && !den.active && (
        <p className="rounded-2xl border-2 border-mango-400 bg-mango-400/25 px-4 py-3 text-sm font-bold">
          ⚠️ Dnešní den je vypnutý — razítka se nepřipisují.{" "}
          <Link href="/admin/dny" className="odkaz">
            Zapnout
          </Link>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Dlazdice popisek="Razítka dnes" hodnota={razitkaDnes} zvyraznit />
        <Dlazdice popisek="Odměny vydané dnes" hodnota={vydaneDnes.length} />
        <Dlazdice popisek="Razítka celkem" hodnota={razitkaCelkem} />
        <Dlazdice popisek="Zákazníci" hodnota={pocetUzivatelu} />
        <Dlazdice popisek="Odměny čekající" hodnota={cekajici.length} />
        <Dlazdice popisek="Odměny vydané" hodnota={vydane.length} />
      </div>

      <p className="px-1 text-xs text-kokos-50/60">
        {formatCzechDateLong(dnes)} · {razitka(razitkaDnes)} dnes ·{" "}
        {zakaznici(pocetUzivatelu)} celkem · {odmeny(cekajici.length)} čeká na
        vyzvednutí
      </p>

      {/* Politika kvízu — přepíná ji Healing přes /api/interni/quiz-policy,
          tady je jen vidět, co zrovna platí. */}
      <section className="karta space-y-1.5">
        <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
          Kvíz bavičů
        </h2>
        <p className="text-sm font-semibold">
          Přihlášení:{" "}
          <strong className={policy.loginRequired ? "text-mango-400" : ""}>
            {policy.loginRequired ? "vyžadováno" : "nevyžadováno (anonymní)"}
          </strong>
        </p>
        <p className="text-sm font-semibold">
          Doporučená varianta:{" "}
          <strong>{nazevVarianty(policy.recommendedVariant)}</strong>
        </p>
        <p className="text-xs text-kokos-50/60">
          {policy.updatedAt
            ? `Naposledy změnil ${policy.updatedBy ?? "neznámo kdo"} · ${formatCzechDateTime(policy.updatedAt)}`
            : "Zatím beze změny — platí výchozí nastavení z migrace."}
        </p>
      </section>

      {/* Čeká na výběr zákazníka */}
      <section className="karta space-y-2">
        <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
          Čeká na výběr zákazníka
        </h2>
        {CATEGORIES.every((k) => !nevybrano.get(k)) ? (
          <p className="text-sm text-kokos-50/60">Nic nečeká.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {CATEGORIES.map((k) => {
              const n = nevybrano.get(k) ?? 0;
              if (!n) return null;
              return (
                <li key={k} className="flex items-center gap-2">
                  <span aria-hidden>{CATEGORY_EMOJI[k]}</span>
                  <span className="flex-1 font-semibold">
                    {CATEGORY_LABEL[k]} (tier{" "}
                    {tierNumberForIndex(CATEGORIES.indexOf(k))})
                  </span>
                  <span className="font-black tabular-nums text-mango-400">
                    {n}×
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Rozpad podle produktu */}
      <section className="karta space-y-4">
        <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
          Odměny podle produktu (plánování zásob)
        </h2>

        {CATEGORIES.map((kat) => {
          const radky = produkty
            .filter((p) => kategorieProduktu.get(p.id) === kat)
            .map((p) => ({ id: p.id, ...podleProduktu.get(p.id)! }));

          return (
            <div key={kat} className="space-y-1.5">
              <h3 className="text-sm font-black text-mango-400">
                {CATEGORY_EMOJI[kat]} {CATEGORY_LABEL[kat]}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[0.65rem] uppercase tracking-widest text-kokos-50/50">
                      <th className="py-1 font-bold">Produkt</th>
                      <th className="py-1 text-right font-bold">Čeká</th>
                      <th className="py-1 text-right font-bold">Vydáno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {radky.map((r) => (
                      <tr key={r.id} className="border-t border-white/10">
                        <td className="py-1.5 font-semibold">
                          <span aria-hidden>{r.emoji}</span> {r.nazev}
                          {!r.aktivni && (
                            <span className="ml-2 text-xs font-bold uppercase text-zapad-400">
                              vypnuto
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-black tabular-nums text-mango-400">
                          {r.ceka || "–"}
                        </td>
                        <td className="py-1.5 text-right font-black tabular-nums">
                          {r.vydano || "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Dlazdice({
  popisek,
  hodnota,
  zvyraznit = false,
}: {
  popisek: string;
  hodnota: number;
  zvyraznit?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        zvyraznit
          ? "border-mango-400 bg-mango-400/20"
          : "border-white/15 bg-white/10",
      ].join(" ")}
    >
      <p className="text-3xl font-black tabular-nums">{hodnota}</p>
      <p className="mt-0.5 text-[0.7rem] font-bold uppercase tracking-widest text-kokos-50/60">
        {popisek}
      </p>
    </div>
  );
}
