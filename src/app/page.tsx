import type { Metadata } from "next";
import Link from "next/link";

import { getEmailStatus } from "@/lib/email-verification-server";
import { barCreditProUzivatele } from "@/lib/healing-credit-session";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Longevity Bar",
  description:
    "Odměny, mikrobiomový kvíz a festivalový sortiment Longevity Baru od WILD&COCO.",
};

const PASSPORTS = [
  {
    href: "/odmeny",
    eyebrow: "Věrnostní karta",
    title: "Získej dárky na Longevity baru",
    copy: "Sbírej razítka za návštěvy a vybírej si odměny, které ti chutnají.",
    number: "01",
    accent: "from-mango-400 to-zapad-500",
    ink: "text-inkoust",
  },
  {
    href: "/kviz/web",
    eyebrow: "Pár rychlých otázek",
    title: "Kvíz o Tvém mikrobiomu",
    copy: "Najdi chuťový směr a produkty WILD&COCO, které by tě mohly bavit.",
    number: "02",
    // laguna-400 je na krémový text moc světlá (2,93:1). Tmavší přeliv drží
    // popisek karty na 4,90:1, tedy nad WCAG AA.
    accent: "from-laguna-600 to-laguna-800",
    ink: "text-kokos-50",
  },
  {
    href: "/sortiment/longevity",
    eyebrow: "Co ochutnáš na místě",
    title: "Projdi si náš Longevity Bar sortiment",
    copy: "Nápoje, káva, kakao, jídlo i festivalové speciality v jednom přehledu.",
    number: "03",
    accent: "from-kokos-50 to-kokos-200",
    ink: "text-inkoust",
  },
  {
    href: "/sortiment/wild-coco",
    eyebrow: "Vezmi si WILD&COCO domů",
    title: "Projdi si náš WILD&COCO sortiment",
    copy: "Objev fermentované kokosové produkty, rostlinná jídla a naše další favority.",
    number: "04",
    accent: "from-zapad-500 to-mango-600",
    ink: "text-inkoust",
  },
  {
    href: "/darek",
    eyebrow: "Dárek přátelům",
    title: "Daruj kamarádům slevu 21 %",
    copy: "Ukaž jim QR kód, vyplní kvíz a kupón jim přijde na e-mail.",
    number: "05",
    accent: "from-laguna-600 to-laguna-800",
    ink: "text-kokos-50",
  },
] as const;

/**
 * Karta kreditu se ukazuje JEN hostům, kteří ho v Healing.app opravdu mají —
 * proto se nepřidává do `PASSPORTS`, ale skládá až podle odpovědi bridge.
 */
const KREDIT_KARTA = {
  href: "/kredit",
  eyebrow: "Máš u nás kredit",
  title: "Kredit na Longevity Baru",
  copy: "Vyber si, co si dáš, a ukaž objednávku obsluze u baru.",
  number: "06",
  accent: "from-mango-400 to-mango-600",
  ink: "text-inkoust",
} as const;

export default async function Homepage() {
  const user = await getSessionUser();
  // Kredit i stav e-mailu jsou nezávislé — ať se čekání nesčítá.
  const [emailStatus, kredit] = user
    ? await Promise.all([getEmailStatus(user.id), barCreditProUzivatele(user.id)])
    : [null, null];

  const karty = kredit?.stav.eligible
    ? [...PASSPORTS, KREDIT_KARTA]
    : [...PASSPORTS];

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
          Healing Festival · Světlá nad Sázavou
        </p>
        <h1 className="relative mt-3 max-w-[20rem] text-[2rem] leading-[1.06] sm:text-4xl">
          Vyber si svůj zážitek v Longevity Baru
        </h1>
        <p className="relative mt-4 max-w-sm text-sm leading-relaxed text-kokos-50/[0.78]">
          Od první ochutnávky až po odměnu. Vše, co potřebuješ, najdeš tady.
        </p>
      </section>

      {user && emailStatus && !emailStatus.verified && (
        <Link
          href="/odmeny"
          className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-mango-300/70 bg-mango-400 px-4 py-3 text-inkoust shadow-tlacitko transition active:translate-y-0.5"
        >
          <span>
            <span className="block text-xs font-black uppercase tracking-wider">
              Odměny ještě čekají
            </span>
            <span className="block text-base font-black">Potvrď e-mail</span>
          </span>
          <span aria-hidden className="text-2xl font-light">
            →
          </span>
        </Link>
      )}

      <nav aria-label="Co chceš v Longevity Baru zažít" className="space-y-3">
        {karty.map((item) => (
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
                  {item.eyebrow}
                </span>
                <span className="mt-1.5 block max-w-[18rem] text-xl font-black leading-tight">
                  {item.title}
                </span>
              </span>
              <span className="flex items-end justify-between gap-4">
                <span className="max-w-[18rem] text-xs font-semibold leading-relaxed opacity-90">
                  {item.copy}
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
        ))}
      </nav>

      <p className="px-3 text-center text-xs leading-relaxed text-kokos-50/60">
        {user ? (
          <>
            Jsi přihlášený. Věrnostní kartu a nastavení účtu najdeš v{" "}
            <Link href="/odmeny" className="odkaz font-bold text-kokos-50/80">
              odměnách
            </Link>
            .
          </>
        ) : (
          <>
            Pro prohlížení sortimentu se přihlašovat nemusíš. Přihlášení
            potřebuješ pro věrnostní kartu a před vstupem do kvízu.
          </>
        )}
      </p>
    </div>
  );
}
