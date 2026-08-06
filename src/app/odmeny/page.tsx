import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Konfety from "@/components/Konfety";
import EmailOnboarding from "@/components/EmailOnboarding";
import InstallPrompt from "@/components/InstallPrompt";
import Oznameni from "@/components/Oznameni";
import QrKamera from "@/components/QrKamera";
import RazitkovaKarta from "@/components/RazitkovaKarta";
import SkenHlaska from "@/components/SkenHlaska";
import UlozitTlacitko from "@/components/UlozitTlacitko";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { getT } from "@/lib/i18n/server";
import {
  CATEGORIES,
  CATEGORY_EMOJI,
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
import { formatCzechDateTime } from "@/lib/time";
import { getSessionUser } from "@/lib/supabase/server";
import { getEmailStatus } from "@/lib/email-verification-server";
import { verejnyKlicProKlienta } from "@/lib/push-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.odmeny.titulek };
}

export default async function OdmenyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, { lang, t }] = await Promise.all([searchParams, getT()]);
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
        <p className="rounded-2xl bg-list-500/25 px-4 py-3 text-center text-sm font-bold">
          {t.odmeny.emailOveren}
        </p>
      )}
      {prvni(sp.email) === "chyba" && (
        <p className="rounded-2xl bg-zapad-600/70 px-4 py-3 text-center text-sm font-bold">
          {t.odmeny.emailChyba}
        </p>
      )}

      {!emailStatus.verified && (
        <EmailOnboarding defaultEmail={emailStatus.email ?? ""} />
      )}

      <QrKamera />

      {prvni(sp.chyba) === "pristup" && (
        <p className="rounded-2xl border-2 border-zapad-500/60 bg-zapad-500/25 px-4 py-3 text-sm font-bold">
          {t.odmeny.bezPristupu}
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Nevyzvednutá odměna                                              */}
      {/* ---------------------------------------------------------------- */}
      {openReward?.state === "ready" && (
        <section className="animate-popIn rounded-3xl border-4 border-mango-400 bg-gradient-to-br from-zapad-500 to-mango-500 p-5 text-center shadow-karta">
          <p className="text-sm font-black uppercase tracking-widest text-inkoust/70">
            {t.odmeny.postupNaLevel(tierNumberForIndex(openReward.tier_index + 1))}
          </p>
          <h1 className="mt-1 text-4xl font-black text-inkoust">
            {t.odmeny.vyhravas}
          </h1>
          <p className="mt-2 text-lg font-bold text-inkoust/85">
            {t.vernost.kategorieDlouhe[openReward.category]}
          </p>
          <Link
            href="/vyber"
            className="tlacitko mt-4 bg-inkoust text-mango-400 shadow-tlacitko"
          >
            {t.odmeny.vyberSiOdmenu}
          </Link>
        </section>
      )}

      {openReward?.state === "selected" && (
        <section className="rounded-3xl border-4 border-white/80 bg-white/95 p-5 text-center text-inkoust shadow-karta">
          <p className="text-sm font-black uppercase tracking-widest text-inkoust/60">
            {t.odmeny.cekaNaVyzvednuti}
          </p>
          <p className="mt-2 text-3xl" aria-hidden>
            {openRewardProduct?.emoji ?? CATEGORY_EMOJI[openReward.category]}
          </p>
          <h2 className="text-2xl font-black">
            {openRewardProduct?.name ?? t.vernost.kategorie[openReward.category]}
          </h2>
          <Link
            href={`/odmena/${openReward.id}`}
            className="tlacitko-zapad mt-4"
          >
            {t.odmeny.ukazatUPokladny}
          </Link>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Kontakt pro speciální výhry — zobrazuje se, dokud není vyplněný    */}
      {/* ---------------------------------------------------------------- */}
      {(!kontakt.fullName || !kontakt.phone) && (
        <section className="karta space-y-3">
          <h2 className="text-base font-black uppercase tracking-widest text-mango-400">
            {t.odmeny.specialniVyhry}
          </h2>
          <p className="text-sm text-kokos-50/85">
            {t.odmeny.specialniVyhryPopis}
          </p>
          <form action={ulozitKontakt} className="space-y-2">
            <input
              name="jmeno"
              required
              maxLength={80}
              defaultValue={kontakt.fullName ?? ""}
              placeholder={t.spolecne.krestniJmeno}
              className="vstup"
              autoComplete="given-name"
            />
            <input
              name="telefon"
              required
              type="tel"
              defaultValue={kontakt.phone ?? ""}
              placeholder={t.spolecne.telefonPlaceholder}
              className="vstup"
              autoComplete="tel"
            />
            <UlozitTlacitko />
          </form>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Splněný level po vydání odměny — zůstává jako jeden boxík          */}
      {/* ---------------------------------------------------------------- */}
      {!openReward && !summary.cycleFinished && historie.length > 0 && (
        <section className="rounded-3xl border-2 border-mango-400/70 bg-white/10 px-4 py-3 text-center">
          <p className="text-sm font-black text-mango-400">
            {t.odmeny.levelSplneny(
              tierNumberForIndex(historie[0].tier_index),
              tierNumberForIndex(historie[0].tier_index + 1),
            )}
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
              {t.odmeny.level(summary.upcomingTierNumber)}
              {stav.rewards.length >= 3 &&
                ` · ${t.odmeny.kolo(cycleForTierIndex(stav.rewards.length))}`}
            </p>
            <h2 className="mt-0.5 flex items-center gap-2">
              <span aria-hidden>{CATEGORY_EMOJI[summary.upcoming]}</span>
              {t.vernost.kategorie[summary.upcoming]}
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
            t.odmeny.hotovoVse
          ) : summary.toNext === 0 ? (
            t.odmeny.kartaPlna
          ) : (
            <>
              {t.odmeny.zbyvaPred(summary.toNext)}{" "}
              <strong className="text-mango-400">
                {t.vernost.kategorie[summary.upcoming].toLowerCase()}
              </strong>{" "}
              {t.odmeny.zbyvaPo}
            </>
          )}
        </p>

        {summary.available > STAMPS_PER_TIER && (
          <p className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-semibold text-kokos-50/80">
            {t.odmeny.naviRazitka(summary.available - STAMPS_PER_TIER)}
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Přehled tierů                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="karta space-y-3">
        <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
          {t.odmeny.prehledNadpis}
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
                  {i + 1}. {t.vernost.kategorieDlouhe[kat]}
                </span>
                {aktivni && (
                  <span className="odznak bg-inkoust text-mango-400">
                    {t.odmeny.prehledTed}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-kokos-50/60">
          {t.odmeny.prehledPopis(stav.totalStamps)}
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Historie                                                          */}
      {/* ---------------------------------------------------------------- */}
      {historie.length > 0 && (
        <section className="karta space-y-3">
          <h2 className="text-base font-black uppercase tracking-widest text-kokos-50/70">
            {t.odmeny.historieNadpis}
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
                      {p?.name ?? t.vernost.kategorie[r.category]}
                    </span>
                    <span className="block text-xs text-kokos-50/60">
                      {formatCzechDateTime(r.redeemed_at, lang)}
                    </span>
                  </span>
                  <span className="odznak bg-list-500/25 text-list-500">
                    {t.odmeny.historieVydano}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Věrnostní karta je nejčastější vstup do appky (QR u pokladny) —
          bez tohohle odkazu se z ní na rozcestník nedá dostat jinak než
          adresním řádkem. */}
      <Link href="/" className="tlacitko-vedlejsi">
        {t.spolecne.zpetNaRozcestnik}
      </Link>

      {/* ---------------------------------------------------------------- */}
      {/* Účet                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-kokos-50/60">
        <span className="truncate">
          {emailStatus.email ?? kontakt.phone ?? t.odmeny.telefonniUcet}
        </span>
        <span className="flex items-center gap-3">
          {jeAdmin && (
            <Link href="/admin" className="odkaz font-bold text-mango-400">
              {t.spolecne.administrace}
            </Link>
          )}
          <form action="/auth/odhlasit" method="post">
            <button type="submit" className="odkaz">
              {t.spolecne.odhlasit}
            </button>
          </form>
        </span>
      </section>

      {/* Až úplně dole, pod účtem: kdo doscrolloval sem, kartu už viděl.
          Na skenové obrazovce (výhra/razítko) by to jen překáželo. */}
      {!sken && !jeVyhra && <Oznameni vapidKlic={verejnyKlicProKlienta()} />}
    </div>
  );
}
