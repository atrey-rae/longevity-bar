import type { Metadata } from "next";

import { CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABEL } from "@/lib/loyalty";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";

import { prepnoutProdukt } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Produkty" };

export default async function AdminProduktyPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select("*")
    .order("category")
    .order("sort_order")
    .order("name");
  const produkty: Product[] = data ?? [];

  return (
    <div className="space-y-4">
      <h1>Produkty</h1>
      <p className="px-1 text-sm text-kokos-50/70">
        Vypnutý produkt zmizí z nabídky odměn. Použij, když se něco vyprodá —
        zákazníkům, kteří ho už mají vybraný, zůstane.
      </p>

      {CATEGORIES.map((kat) => {
        const vKategorii = produkty.filter((p) => p.category === kat);
        const aktivnich = vKategorii.filter((p) => p.active).length;

        return (
          <section key={kat} className="karta space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2">
                <span aria-hidden>{CATEGORY_EMOJI[kat]}</span>
                {CATEGORY_LABEL[kat]}
              </h2>
              <span className="text-xs font-bold uppercase tracking-widest text-kokos-50/60">
                {aktivnich} / {vKategorii.length} skladem
              </span>
            </div>

            {aktivnich === 0 && vKategorii.length > 0 && (
              <p className="rounded-xl bg-zapad-500/25 px-3 py-2 text-xs font-bold">
                ⚠️ V této kategorii není nic aktivní — zákazník si nebude mít z
                čeho vybrat.
              </p>
            )}

            <ul className="divide-y divide-white/10">
              {vKategorii.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span className="text-2xl" aria-hidden>
                    {p.emoji ?? CATEGORY_EMOJI[kat]}
                  </span>
                  <span className="flex-1">
                    <span
                      className={[
                        "block text-sm font-bold",
                        p.active ? "" : "text-kokos-50/40 line-through",
                      ].join(" ")}
                    >
                      {p.name}
                    </span>
                    {p.description && (
                      <span className="block text-xs text-kokos-50/50">
                        {p.description}
                      </span>
                    )}
                  </span>
                  <form action={prepnoutProdukt}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="aktivni"
                      value={p.active ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className={[
                        "min-w-[6.5rem] rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider",
                        p.active
                          ? "bg-list-500 text-white"
                          : "border border-white/25 bg-white/10 text-kokos-50/70",
                      ].join(" ")}
                    >
                      {p.active ? "Skladem" : "Vyprodáno"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
