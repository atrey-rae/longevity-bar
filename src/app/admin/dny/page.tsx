import type { Metadata } from "next";
import Link from "next/link";

import KopirovatOdkaz from "@/components/KopirovatOdkaz";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { formatCzechDateLong, pragueDateString } from "@/lib/time";
import type { EventDay } from "@/lib/types";

import {
  prepnoutDen,
  regenerovatToken,
  smazatDen,
  vytvoritDen,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Festivalové dny" };

export default async function AdminDnyPage() {
  const admin = createAdminClient();
  const dnes = pragueDateString();
  const zaklad = siteUrl();

  const { data } = await admin
    .from("event_days")
    .select("*")
    .order("date", { ascending: true });
  const dny: EventDay[] = data ?? [];

  const pocty = await Promise.all(
    dny.map(async (d) => {
      const { count } = await admin
        .from("stamps")
        .select("id", { count: "exact", head: true })
        .eq("day_id", d.id);
      return [d.id, count ?? 0] as const;
    }),
  );
  const razitkaDne = new Map(pocty);

  return (
    <div className="space-y-4">
      <h1>Festivalové dny</h1>

      <section className="karta space-y-3">
        <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
          Nový den
        </h2>
        <form action={vytvoritDen} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-kokos-50/70">
                Datum
              </span>
              <input
                type="date"
                name="date"
                required
                defaultValue={dnes}
                className="vstup py-3 text-base"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-kokos-50/70">
                Popis (nepovinné)
              </span>
              <input
                type="text"
                name="label"
                placeholder="Healing Festival — pátek"
                className="vstup py-3 text-base"
              />
            </label>
          </div>
          <button type="submit" className="tlacitko-hlavni">
            Založit den a vygenerovat QR
          </button>
        </form>
      </section>

      {dny.length === 0 && (
        <p className="karta text-sm text-kokos-50/70">
          Zatím není založený žádný den.
        </p>
      )}

      <div className="space-y-3">
        {dny.map((d) => {
          const odkaz = `${zaklad}/scan/${d.token}`;
          const jeDnes = d.date === dnes;
          return (
            <section
              key={d.id}
              className={[
                "karta space-y-3",
                jeDnes ? "border-mango-400 ring-2 ring-mango-400/50" : "",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-lg">
                  {formatCzechDateLong(d.date)}
                  {jeDnes && (
                    <span className="odznak ml-2 bg-mango-400 text-inkoust">
                      dnes
                    </span>
                  )}
                </h2>
                <span
                  className={[
                    "odznak",
                    d.active
                      ? "bg-list-500/25 text-list-500"
                      : "bg-zapad-500/25 text-zapad-400",
                  ].join(" ")}
                >
                  {d.active ? "aktivní" : "vypnuto"}
                </span>
              </div>

              {d.label && (
                <p className="text-sm text-kokos-50/70">{d.label}</p>
              )}

              <p className="break-all rounded-xl bg-black/25 px-3 py-2 font-mono text-xs text-kokos-50/80">
                {odkaz}
              </p>

              <p className="text-xs text-kokos-50/60">
                Razítek z tohoto dne: <strong>{razitkaDne.get(d.id) ?? 0}</strong>
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/dny/${d.id}/tisk`}
                  className="rounded-full bg-mango-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-inkoust"
                >
                  Tisk QR →
                </Link>

                <KopirovatOdkaz hodnota={odkaz} />

                <form action={prepnoutDen}>
                  <input type="hidden" name="id" value={d.id} />
                  <input
                    type="hidden"
                    name="aktivni"
                    value={d.active ? "0" : "1"}
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
                  >
                    {d.active ? "Vypnout" : "Zapnout"}
                  </button>
                </form>

                <form action={regenerovatToken}>
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
                    title="Vygeneruje nový token — starý vytištěný QR přestane platit"
                  >
                    Nový token
                  </button>
                </form>

                <form action={smazatDen}>
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-zapad-500/60 bg-zapad-500/20 px-3 py-1.5 text-xs font-bold text-zapad-400 hover:bg-zapad-500/30"
                  >
                    Smazat
                  </button>
                </form>
              </div>
            </section>
          );
        })}
      </div>

      <p className="px-1 text-xs leading-relaxed text-kokos-50/60">
        Token je tajný — QR vytiskni a nech ho u pokladny, ukazuje se až po
        zaplacení. „Nový token“ použij, kdyby se kód dostal ven; starý vytištěný
        list tím okamžitě přestane platit.
      </p>
    </div>
  );
}
