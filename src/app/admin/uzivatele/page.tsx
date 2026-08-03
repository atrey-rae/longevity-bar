import type { Metadata } from "next";
import Link from "next/link";

import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  STAMPS_PER_TIER,
  tierNumberForIndex,
} from "@/lib/loyalty";
import { getLoyaltyState, getProductsByIds } from "@/lib/loyalty-server";
import { prvni } from "@/lib/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { razitka } from "@/lib/text";
import { formatCzechDateTime } from "@/lib/time";
import type { Profile } from "@/lib/types";

import {
  odebratRazitko,
  oznacitVydano,
  pridatRazitko,
  vratitVyber,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Uživatelé" };

export default async function AdminUzivatelePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const dotaz = (prvni(sp.email) ?? "").trim();

  const admin = createAdminClient();
  let nalezeni: Profile[] = [];

  if (dotaz.length >= 2) {
    const { data } = await admin
      .from("profiles")
      .select("*")
      .ilike("email", `%${dotaz}%`)
      .order("created_at", { ascending: false })
      .limit(12);
    nalezeni = data ?? [];
  }

  return (
    <div className="space-y-4">
      <h1>Uživatelé</h1>

      <form method="get" className="karta space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-kokos-50/70">
            Hledat podle e-mailu
          </span>
          <input
            type="search"
            name="email"
            defaultValue={dotaz}
            placeholder="jmeno@email.cz"
            className="vstup py-3 text-base"
          />
        </label>
        <button type="submit" className="tlacitko-hlavni">
          Vyhledat
        </button>
      </form>

      {dotaz.length >= 2 && nalezeni.length === 0 && (
        <p className="karta text-sm text-kokos-50/70">
          Nikdo takový tu není. Zkus jen část e-mailu.
        </p>
      )}

      {nalezeni.length > 1 && (
        <section className="karta space-y-2">
          <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
            Nalezeno {nalezeni.length}
          </h2>
          <ul className="divide-y divide-white/10">
            {nalezeni.map((p) => (
              <li key={p.id} className="py-2">
                <Link
                  href={`/admin/uzivatele?email=${encodeURIComponent(p.email ?? "")}`}
                  className="odkaz text-sm font-semibold"
                >
                  {p.email}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nalezeni.length === 1 && (
        <DetailUzivatele profil={nalezeni[0]} dotaz={dotaz} />
      )}
    </div>
  );
}

async function DetailUzivatele({
  profil,
  dotaz,
}: {
  profil: Profile;
  dotaz: string;
}) {
  const stav = await getLoyaltyState(profil.id);
  const produkty = await getProductsByIds(
    stav.rewards.map((r) => r.product_id),
  );

  return (
    <section className="karta space-y-4">
      <div>
        <h2 className="break-all">{profil.email}</h2>
        {profil.full_name && (
          <p className="text-sm text-kokos-50/70">{profil.full_name}</p>
        )}
        <p className="text-xs text-kokos-50/50">
          Registrace {formatCzechDateTime(profil.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-2xl font-black tabular-nums">
            {stav.totalStamps}
          </p>
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-kokos-50/60">
            razítek celkem
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-2xl font-black tabular-nums">
            {stav.summary.filled}/{STAMPS_PER_TIER}
          </p>
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-kokos-50/60">
            na kartě
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-2xl font-black tabular-nums">
            {stav.stampsToday}
          </p>
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-kokos-50/60">
            razítek dnes
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={pridatRazitko}>
          <input type="hidden" name="userId" value={profil.id} />
          <input type="hidden" name="email" value={dotaz} />
          <button
            type="submit"
            className="rounded-full bg-list-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white"
          >
            + 1 razítko
          </button>
        </form>
        <form action={odebratRazitko}>
          <input type="hidden" name="userId" value={profil.id} />
          <input type="hidden" name="email" value={dotaz} />
          <button
            type="submit"
            className="rounded-full border border-zapad-500/60 bg-zapad-500/20 px-4 py-2 text-xs font-black uppercase tracking-wider text-zapad-400"
          >
            − 1 razítko
          </button>
        </form>
      </div>
      <p className="text-xs text-kokos-50/50">
        Ruční přidání razítka obchází cooldown i denní limit. Odebrání smaže
        nejnovější razítko (a případně zruší ještě nevybranou odměnu).
        Aktuálně naspořeno: {razitka(stav.summary.available)}.
      </p>

      <div className="space-y-2">
        <h3 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
          Odměny
        </h3>
        {stav.rewards.length === 0 && (
          <p className="text-sm text-kokos-50/60">Zatím žádné odměny.</p>
        )}
        <ul className="space-y-2">
          {[...stav.rewards].reverse().map((r) => {
            const p = r.product_id ? produkty.get(r.product_id) : undefined;
            return (
              <li
                key={r.id}
                className="space-y-2 rounded-2xl bg-white/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>
                    {p?.emoji ?? CATEGORY_EMOJI[r.category]}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">
                      {p?.name ?? `${CATEGORY_LABEL[r.category]} (nevybráno)`}
                    </span>
                    <span className="block text-xs text-kokos-50/50">
                      {r.tier_index + 1}. odměna · tier{" "}
                      {tierNumberForIndex(r.tier_index)} ·{" "}
                      {r.state === "redeemed"
                        ? `vydáno ${formatCzechDateTime(r.redeemed_at)}${
                            r.redeemed_by === "admin" ? " (ručně)" : ""
                          }`
                        : r.state === "selected"
                          ? "vybráno, čeká na výdej"
                          : "čeká na výběr zákazníka"}
                    </span>
                  </span>
                </div>

                {r.state !== "redeemed" && (
                  <div className="flex flex-wrap gap-2">
                    <form action={oznacitVydano}>
                      <input type="hidden" name="rewardId" value={r.id} />
                      <input type="hidden" name="userId" value={profil.id} />
                      <input type="hidden" name="email" value={dotaz} />
                      <button
                        type="submit"
                        className="rounded-full bg-mango-400 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-inkoust"
                      >
                        Označit jako vydané
                      </button>
                    </form>
                    {r.state === "selected" && (
                      <form action={vratitVyber}>
                        <input type="hidden" name="rewardId" value={r.id} />
                        <input type="hidden" name="email" value={dotaz} />
                        <button
                          type="submit"
                          className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold"
                          title="Zákazník si vybere znovu (např. když je produkt vyprodaný)"
                        >
                          Vrátit k výběru
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
