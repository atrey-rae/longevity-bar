import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import DokoncitPozvanku from "@/components/DokoncitPozvanku";
import { getT } from "@/lib/i18n/server";
import {
  jePouzitelnyTvarTokenu,
  telefonZPozvanky,
  zapsatPokusAOveritLimit,
} from "@/lib/invite-links";
import { vydatSessionProTelefon } from "@/lib/phone-auth-server";

export const dynamic = "force-dynamic";

/**
 * Kam host míří, když cokoli selže. Jedna cesta pro VŠECHNY důvody —
 * neexistující token, prošlá platnost, revokace i vyčerpaný rate limit.
 */
const PRI_SELHANI = "/prihlaseni";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.pozvanka.titulek,
    /**
     * Token je součástí adresy, takže se bez tohohle pošle v hlavičce
     * `Referer` na každý cizí zdroj, na který stránka sáhne. Pozvánka platí
     * 30 dní — byl by to přihlašovací údaj v cizím access logu.
     */
    referrer: "no-referrer",
  };
}

/** Klientská IP — stejné pořadí zdrojů jako u odesílání SMS kódu. */
function klientskaIp(hlavicky: Headers): string {
  const xff = hlavicky.get("x-forwarded-for");
  return (
    hlavicky.get("x-vercel-forwarded-for") ??
    (process.env.TRUST_CF_HEADERS === "1" ? hlavicky.get("cf-connecting-ip") : null) ??
    xff?.split(",").map((value) => value.trim()).filter(Boolean).at(-1) ??
    "unknown"
  );
}

/**
 * Pozvánka na jedno ťuknutí — `https://bar.peaceandcoco.com/<token>`.
 *
 * Host klikne na odkaz z SMS a je přihlášený. Žádné opisování kódu.
 *
 * ROOT CATCH-ALL: tahle stránka chytá každý jednosegmentový path, který nemá
 * vlastní routu. Next.js dává statickým segmentům přednost (ověřeno testem),
 * ale kdyby někdo založil top-level cestu o 16 znacích base64url, přebila by
 * ji — hlídá to `scripts/check-invite-links.ts`.
 *
 * Tři různé konce, každý schválně jiný:
 *
 *   • NEODPOVÍDÁ TVARU TOKENU → `notFound()`, tedy normální 404 stránka appky.
 *     Většina requestů sem doletí právě takhle (překlepy, boti) a nesmí kvůli
 *     pozvánkám přijít o 404.
 *   • TVAR SEDÍ, ale token neplatí → `/prihlaseni`, vždy stejně. Žádné
 *     orákulum: z odpovědi nejde poznat, jestli odkaz někdy existoval.
 *   • VŠE SEDÍ → session a rovnou na rozcestník.
 *
 * Session se dokončuje v prohlížeči (`DokoncitPozvanku`) přesně tak, jak to
 * appka dělá po opsání SMS kódu — server komponenta cookies zapsat nesmí.
 */
export default async function PozvankaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Nejdřív tvar: co není token, je překlep v adrese — 404, ne přihlášení.
  // Zároveň tím náhodné procházení webu nespotřebovává rozpočet rate limitu.
  if (!jePouzitelnyTvarTokenu(token)) notFound();

  // Rate limit až tady: nesmí jít prostřílet tokeny hrubou silou. Fail-closed
  // (když se limit nepodaří vyhodnotit, request se odmítne).
  if (!(await zapsatPokusAOveritLimit(klientskaIp(await headers())))) {
    redirect(PRI_SELHANI);
  }

  const phone = await telefonZPozvanky(token);
  if (!phone) redirect(PRI_SELHANI);

  const session = await vydatSessionProTelefon(phone);
  if (!session.ok) redirect(PRI_SELHANI);

  return <DokoncitPozvanku tokenHash={session.tokenHash} />;
}
