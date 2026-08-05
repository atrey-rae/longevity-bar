import Link from "next/link";
import { redirect } from "next/navigation";

import Konfety from "@/components/Konfety";
import EmailOnboarding from "@/components/EmailOnboarding";
import InstallPrompt from "@/components/InstallPrompt";
import QrKamera from "@/components/QrKamera";
import RazitkovaKarta from "@/components/RazitkovaKarta";
import SkenHlaska from "@/components/SkenHlaska";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_LABEL_LONG,
  STAMPS_PER_TIER,
  cycleForTierIndex,
  tierNumberForIndex,
} from "@/lib/loyalty";
import {
  ensureProfile,
  getLoyaltyState,
  getProductsByIds,
  getProfileContact,
} from "@/lib/loyalty-server";
import { ulozitKontakt } from "../actions";
import { prvni } from "@/lib/navigation";
import { razitka } from "@/lib/text";
import { formatCzechDateTime } from "@/lib/time";
import { getSessionUser } from "@/lib/supabase/server";
import { getEmailStatus } from "@/lib/email-verification-server";

export const dynamic = "force-dynamic";

export default async function OdmenyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();

  if (!user) redirect("/prihlaseni?next=%2Fodmeny");

  await ensureProfile(user);
  const stav = await getLoyaltyState(user.id);
  const jeAdmin = await isCurrentUserAdmin(user);
  const kontakt = await getProfileContact(user.id);
  const emailStatus = await getEmailStatus(user.id);

  const sken = prvni(sp.sken);
  const jeVyhra = prvni(sp.vyhra) === "1";
  const { summary, openReward, openRewardProduct } = stav;

  const historie = stav.rewards.filter((r) => r.state === "redeemed").reverse();
  const produktyHistorie = await getProductsByIds(
    historie.map((r) => r.product_id),
  );

  const zvyraznitPosledni = sken === "ok";
  const konfety = sken === "ok" || jeVyhra || openReward?.state === "ready";

  return (
    <div className="obal space-y-5">
      {!sken && !jeVyhra && <InstallPrompt />}
      {konfety && <Konfety kusu={jeVyhra ? 70 : 40} />}

      <SkenHlaska
        status={sken}
        min={Number(prvni(sp.min)) || undefined}
        limit={Number(prvni(sp.limit)) || undefined}
        den={prvni(sp.den)}
      />

      {prvni(sp.email) === "overen" && (
        <p className="rounded-2xl bg-list-500/25 px-4 py-3 text-center text-sm font-bold">E-mail je potvrzený. Odměny máš odemčené ✓</p>
      )}
      {prvni(sp.email) === "chyba" && (
        <p className="rounded-2xl bg-zapad-600/70 px-4 py-3 text-center text-sm font-bold">Odkaz už neplatí. Nech si poslat nový ověřovací e-mail.</p>
      )}

      {!emailStatus.verified && <EmailOnboarding defaultEmail={emailStatus.email ?? ""} />}

      <QrKamera />

      {prvni(sp.chyba) === "pristup" && (
        <p className="rounded-2xl border-2 border-zapad-500/60 bg-zapad-500/25 px-4 py-3 text-sm font-bold">
          Do administrace nemáš přístup.
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Nevyzvednutá odměna                                              */}
      {/* ---------------------------------------------------------------- */}
      {openReward?.state === "ready" && (
        <section className="animate-popIn rounded-3xl border-4 border-mango-400 bg-gradient-to-br from-zapad-500 to-mango-500 p-5 text-center shadow-karta">
          <p className="text-sm font-black uppercase tracking-widest text-inkoust/70">
            Tvoje tělo jásá, posouváš se na Level{" "}
            {tierNumberForIndex(openReward.tier_index + 1)}!
          </p>
          <h1 className="mt-1 text-4xl font-black text-inkoust">Vyhráváš! 🎉</h1>
          <p className="mt-2 text-lg font-bold text-inkoust/85">
            {CATEGORY_LABEL_LONG[openReward.category]}
          </p>
          <Link
            href="/vyber"
            className="tlacitko mt-4 bg-inkoust text-mango-400 shadow-tlacitko"
          >
            Vyber si odměnu →
          </Link>
        </section>
      )}

      {openReward?.state === "selected" && (
        <section className="rounded-3xl border-4 border-white/80 bg-white/95 p-5 text-center text-inkoust shadow-karta">
          <p className="text-sm font-black uppercase tracking-widest text-inkoust/60">
            Odměna čeká na vyzvednutí
          </p>
          <p className="mt-2 text-3xl" aria-hidden>
            {openRewardProduct?.emoji ?? CATEGORY_EMOJI[openReward.category]}
          </p>
          <h2 className="text-2xl font-black">
            {openRewardProduct?.name ?? CATEGORY_LABEL[openReward.category]}
          </h2>
          <Link
            href={`/odmena/${openReward.id}`}
            className="tlacitko-zapad mt-4"
          >
            Ukázat u pokladny
          </Link>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Kontakt pro speciální výhry — zobrazuje se, dokud není vyplněný    */}
      {/* ---------------------------------------------------------------- */}
      {(!kontakt.fullName || !kontakt.phone) && (
        <section className="karta space-y-3">
          <h2 className="text-base font-black uppercase tracking-widest text-mango-400">
            Speciální výhry 🎁
          </h2>
          <p className="text-sm text-kokos-50/85">
            Nech nám křestní jméno a telefon — ať tě u baru poznáme a můžeme ti
            poslat speciální výhry.
          </p>
          <form action={ulozitKontakt} className="space-y-2">
            <input
              name="jmeno"
              required
              maxLength={80}
              defaultValue={kontakt.fullName ?? ""}
              placeholder="Křestní jméno"
              className="vstup"
              autoComplete="given-name"
            />
            <input
              name="telefon"
              required
              type="tel"
              defaultValue={kontakt.phone ?? ""}
              placeholder="Telefon (např. 601 123 456)"
              className="vstup"
              autoComplete="tel"
            />
            <button type="submit" className="tlacitko-zapad w-full">
              Uložit
            </button>
          </form>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Splněný level po vydání odměny — zůstává jako jeden boxík          */}
      {/* ---------------------------------------------------------------- */}
      {!openReward && !summary.cycleFinished && historie.length > 0 && (
        <section className="rounded-3xl border-2 border-mango-400/70 bg-white/10 px-4 py-3 text-center">
          <p className="text-sm font-black text-mango-400">
            Level {tierNumberForIndex(historie[0].tier_index)} splněný ✓ —
            Tvoje tělo jásá, posouváš se na Level{" "}
            {tierNumberForIndex(historie[0].tier_index + 1)}!
          </p>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Věrnostní karta                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="karta space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-mango-400">
              Level {summary.upcomingTierNumber}
              {stav.rewards.length >= 3 &&
                ` · ${cycleForTierIndex(stav.rewards.length)}. kolo`}
            </p>
            <h2 className="mt-0.5 flex items-center gap-2">
              <span aria-hidden>{CATEGORY_EMOJI[summary.upcoming]}</span>
              {CATEGORY_LABEL[summary.upcoming]}
            </h2>
          </div>
          <p className="whitespace-nowrap text-4xl font-black tabular-nums text-mango-400">
            {summary.filled}
            <span className="text-xl text-kokos-50/60">/{STAMPS_PER_TIER}</span>
          </p>
        </div>

        <RazitkovaKarta
          zaplneno={summary.filled}
          zvyraznitPosledni={zvyraznitPosledni}
        />

        <p className="text-center text-base font-semibold text-kokos-50/90">
          {summary.cycleFinished ? (
            <>Máš hotovo všechny tři odměny. Díky, že jsi s námi! 💛</>
          ) : summary.toNext === 0 ? (
            <>Karta je plná — vyber si odměnu výše ☝️</>
          ) : (
            <>
              Ještě {razitka(summary.toNext)} a máš{" "}
              <strong className="text-mango-400">
                {CATEGORY_LABEL[summary.upcoming].toLowerCase()}
              </strong>{" "}
              zdarma.
            </>
          )}
        </p>

        {summary.available > STAMPS_PER_TIER && (
          <p className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-semibold text-kokos-50/80">
            Máš navíc {razitka(summary.available - STAMPS_PER_TIER)} naspořeno
            na další odměnu — nic ti nepropadá.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Přehled tierů                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="karta space-y-3">
        <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
          Odměny po 4 razítkách
        </h2>
        <ol className="space-y-2">
          {CATEGORIES.map((kat, i) => {
            const aktivni = tierNumberForIndex(stav.rewards.length) === i + 1;
            return (
              <li
                key={kat}
                className={[
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                  aktivni
                    ? "bg-mango-400 text-inkoust"
                    : "bg-white/5 text-kokos-50/80",
                ].join(" ")}
              >
                <span className="text-2xl" aria-hidden>
                  {CATEGORY_EMOJI[kat]}
                </span>
                <span className="flex-1 text-sm font-bold">
                  {i + 1}. {CATEGORY_LABEL_LONG[kat]}
                </span>
                {aktivni && (
                  <span className="odznak bg-inkoust text-mango-400">teď</span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-kokos-50/60">
          Po třetí odměně se cyklus opakuje od začátku. Celkem máš{" "}
          {razitka(stav.totalStamps)}.
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Historie                                                          */}
      {/* ---------------------------------------------------------------- */}
      {historie.length > 0 && (
        <section className="karta space-y-3">
          <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
            Vyzvednuté odměny
          </h2>
          <ul className="space-y-2">
            {historie.map((r) => {
              const p = r.product_id
                ? produktyHistorie.get(r.product_id)
                : undefined;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5"
                >
                  <span className="text-2xl" aria-hidden>
                    {p?.emoji ?? CATEGORY_EMOJI[r.category]}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">
                      {p?.name ?? CATEGORY_LABEL[r.category]}
                    </span>
                    <span className="block text-xs text-kokos-50/60">
                      {formatCzechDateTime(r.redeemed_at)}
                    </span>
                  </span>
                  <span className="odznak bg-list-500/25 text-list-500">
                    ✓ vydáno
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Účet                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-kokos-50/60">
        <span className="truncate">{emailStatus.email ?? kontakt.phone ?? "Telefonní účet"}</span>
        <span className="flex items-center gap-3">
          {jeAdmin && (
            <Link href="/admin" className="odkaz font-bold text-mango-400">
              Administrace
            </Link>
          )}
          <form action="/auth/odhlasit" method="post">
            <button type="submit" className="odkaz">
              Odhlásit
            </button>
          </form>
        </span>
      </section>
    </div>
  );
}
