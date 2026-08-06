import type { Metadata } from "next";
import Link from "next/link";

import { getEmailStatus } from "@/lib/email-verification-server";
import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import { getT } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/types";
import { getSessionUser } from "@/lib/supabase/server";
import { korun } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.rozcestnik.titulek, description: t.rozcestnik.popis };
}

/**
 * Vzhled karet rozcestníku. Texty tu ZÁMĚRNĚ nejsou — bydlí ve slovníku pod
 * `rozcestnik.karty.<klic>`, aby se daly přeložit bez sahání do designu.
 */
const PASSPORTS = [
  {
    href: "/odmeny",
    klic: "odmeny",
    number: "01",
    accent: "from-mango-400 to-zapad-500",
    ink: "text-inkoust",
  },
  {
    href: "/kviz/web",
    klic: "kviz",
    number: "02",
    // laguna-400 je na krémový text moc světlá (2,93:1). Tmavší přeliv drží
    // popisek karty na 4,90:1, tedy nad WCAG AA.
    accent: "from-laguna-600 to-laguna-800",
    ink: "text-kokos-50",
  },
  {
    href: "/sortiment/longevity",
    klic: "longevity",
    number: "03",
    accent: "from-kokos-50 to-kokos-200",
    ink: "text-inkoust",
  },
  {
    href: "/sortiment/wild-coco",
    klic: "wildCoco",
    number: "04",
    accent: "from-zapad-500 to-mango-600",
    ink: "text-inkoust",
  },
  {
    href: "/darek",
    klic: "darek",
    number: "05",
    // Ne laguna: karta 02 (kvíz) má stejný přeliv a v šesti kartách za sebou
    // se s ní dárek slil. Lesní zelená se od ní odliší a přitom drží AA
    // (kokos-50/90 na #166634 = 5,82:1) a ústí do stejné laguna-800.
    accent: "from-list-700 to-laguna-700",
    ink: "text-kokos-50",
  },
] as const satisfies readonly {
  href: string;
  klic: keyof Dict["rozcestnik"]["karty"];
  number: string;
  accent: string;
  ink: string;
}[];

/**
 * Karta kreditu se ukazuje JEN hostům, kteří ho v Healing.app opravdu mají —
 * proto se nepřidává do `PASSPORTS`, ale skládá až podle odpovědi bridge.
 */
const KREDIT_KARTA = {
  href: "/kredit",
  klic: "kredit",
  number: "06",
  accent: "from-mango-400 to-mango-600",
  ink: "text-inkoust",
} as const;

export default async function Homepage() {
  const [{ t }, user] = await Promise.all([getT(), getSessionUser()]);
  // Kredit i stav e-mailu jsou nezávislé — ať se čekání nesčítá.
  const [emailStatus, kredit] = user
    ? await Promise.all([getEmailStatus(user.id), barCreditProUzivatele(user.id)])
    : [null, null];

  const karty = kredit?.stav.eligible
    ? [...PASSPORTS, KREDIT_KARTA]
    : [...PASSPORTS];

  /**
   * Zůstatek do banneru nad kartami — JEN když most kredit opravdu POTVRDIL.
   * Při `nedostupny` (most mlčí, chybí konfigurace, rozbitá odpověď) se banner
   * nezobrazí vůbec: rozcestník není místo, kde hosta strašit chybou, o které
   * nemůže nic udělat. Vlastní stránka `/kredit` má na to svůj třetí stav.
   */
  const zbyvaKredit =
    kredit?.stav.dostupnost === "kredit"
      ? (kredit.stav.credit?.remaining ?? null)
      : null;

  return (
    <div className="obal space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-inkoust/[0.45] px-5 pb-6 pt-7 shadow-karta">
        <div
          aria-hidden
          className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[32px] border-mango-400/15"
        />
        <div
          aria-hidden
          className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-laguna-400/15 blur-2xl"
        />
        <p className="relative text-xs font-black uppercase tracking-[0.22em] text-mango-400">
          {t.rozcestnik.misto}
        </p>
        <h1 className="relative mt-3 max-w-[20rem] text-[2rem] leading-[1.06] sm:text-4xl">
          {t.rozcestnik.nadpis}
        </h1>
        <p className="relative mt-4 max-w-sm text-sm leading-relaxed text-kokos-50/[0.78]">
          {t.rozcestnik.podnadpis}
        </p>
      </section>

      {/* Kredit je z celého rozcestníku ta nejcennější informace — patří nad
          karty, ne pod ně. Mangový přeliv drží stejnou rodinu jako karta 06
          (inkoust na mango-400 = 10,5:1, na mango-600 = 6,8:1, tedy WCAG AA
          i pro drobný text), ale nižší výškou se od karet odliší jako pruh. */}
      {zbyvaKredit !== null && (
        <Link
          href="/kredit"
          className="flex min-h-16 items-center gap-3.5 rounded-2xl bg-gradient-to-br from-mango-400 to-mango-600 px-4 py-3.5 text-inkoust shadow-karta transition hover:-translate-y-0.5 active:translate-y-0"
        >
          <span aria-hidden className="shrink-0 text-2xl leading-none">
            💳
          </span>
          <span className="min-w-0 flex-1 text-[1.0625rem] font-black leading-tight">
            {t.rozcestnik.kreditBanner(korun(zbyvaKredit))}
          </span>
          <span aria-hidden className="shrink-0 text-2xl font-light leading-none">
            →
          </span>
        </Link>
      )}

      {user && emailStatus && !emailStatus.verified && (
        <Link
          href="/odmeny"
          className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-mango-300/70 bg-mango-400 px-4 py-3 text-inkoust shadow-tlacitko transition active:translate-y-0.5"
        >
          <span>
            <span className="block text-xs font-black uppercase tracking-wider">
              {t.rozcestnik.potvrdEmailNadpis}
            </span>
            <span className="block text-base font-black">
              {t.rozcestnik.potvrdEmail}
            </span>
          </span>
          <span aria-hidden className="text-2xl font-light">
            →
          </span>
        </Link>
      )}

      <nav aria-label={t.rozcestnik.navigaceLabel} className="space-y-3">
        {karty.map((item) => {
          const karta = t.rozcestnik.karty[item.klic];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex min-h-[9rem] overflow-hidden rounded-[1.65rem] bg-gradient-to-br ${item.accent} ${item.ink} p-5 shadow-karta transition hover:-translate-y-0.5 active:translate-y-0`}
            >
              <span
                aria-hidden
                className="absolute -right-2 -top-6 text-[7.5rem] font-black leading-none opacity-[0.09]"
              >
                {item.number}
              </span>
              <span className="relative flex w-full flex-col justify-between gap-5">
                <span>
                  <span className="block text-[0.68rem] font-black uppercase tracking-[0.2em] opacity-[0.85]">
                    {karta.eyebrow}
                  </span>
                  <span className="mt-1.5 block max-w-[18rem] text-xl font-black leading-tight">
                    {karta.title}
                  </span>
                </span>
                <span className="flex items-end justify-between gap-4">
                  <span className="max-w-[18rem] text-xs font-semibold leading-relaxed opacity-90">
                    {karta.copy}
                  </span>
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-current/25 bg-white/10 text-xl transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <p className="px-3 text-center text-xs leading-relaxed text-kokos-50/60">
        {user ? (
          <>
            {t.rozcestnik.prihlasenyPred}{" "}
            <Link href="/odmeny" className="odkaz font-bold text-kokos-50/80">
              {t.rozcestnik.prihlasenyOdkaz}
            </Link>
            {t.rozcestnik.prihlasenyPo}
          </>
        ) : (
          t.rozcestnik.neprihlaseny
        )}
      </p>
    </div>
  );
}
