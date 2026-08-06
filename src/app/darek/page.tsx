import type { Metadata } from "next";
import Link from "next/link";

import {
  DAREK_KVIZ_URL,
  DAREK_QR_SOUBOR,
  darekKvizOdkazText,
  darekKvizUrl,
} from "@/lib/darek";
import { getT } from "@/lib/i18n/server";
import { qrDataUrl } from "@/lib/referral-qr";
import { spocitatPozvane, zajistitReferralKod } from "@/lib/referral-server";
import { getSessionUser } from "@/lib/supabase/server";
import { sazba } from "@/lib/text";

// Osobní QR i počítadlo se liší host od hosta — stránka se nesmí cachovat.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.darek.titulek, description: t.darek.popisMeta };
}

/**
 * „Dárek přátelům“ — obrazovka, kterou host ukáže kamarádovi u stolu.
 *
 * Přihlášený zákazník dostane OSOBNÍ sledovatelné QR (`?od=<KOD>`) vykreslené
 * na serveru plus anonymní počítadlo pozvaných. Nepřihlášený vidí dosavadní
 * statické PNG z `public/` — dárek tak funguje i bez účtu, na pomalém
 * festivalovém připojení a úplně bez JS.
 *
 * Stránka nikdy nepřesměrovává na přihlášení — musí zůstat otevřená všem
 * (hlídá `scripts/check-darek-kredit.ts`).
 */
export default async function DarekPage() {
  const [{ t }, user] = await Promise.all([getT(), getSessionUser()]);
  const referralKod = user ? await zajistitReferralKod(user.id) : null;

  // QR se počítá jen tomu, komu se kód opravdu přidělil. Když se vykreslení
  // nepovede (nebo migrace 008 ještě neběžela), padáme na statické PNG.
  const osobniUrl = referralKod ? darekKvizUrl(referralKod) : null;
  const [osobniQr, pozvanych] = await Promise.all([
    osobniUrl ? qrDataUrl(osobniUrl) : Promise.resolve(null),
    referralKod ? spocitatPozvane(referralKod) : Promise.resolve(0),
  ]);
  const maOsobni = Boolean(osobniUrl && osobniQr);
  // Zobrazený odkaz je stejný řetězec pro alt text i pro odkaz pod QR.
  const odkazText = maOsobni ? darekKvizOdkazText(referralKod) : t.darek.odkazText;

  return (
    <div className="obal space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-inkoust/[0.45] px-5 pb-6 pt-7 shadow-karta">
        <div
          aria-hidden
          className="absolute -right-10 -top-14 h-44 w-44 rounded-full border-[30px] border-mango-400/15"
        />
        <p className="relative text-xs font-black uppercase tracking-[0.22em] text-mango-400">
          {t.darek.eyebrow}
        </p>
        <h1 className="relative mt-3 text-[1.75rem] leading-[1.12] sm:text-3xl">
          {sazba(t.darek.nadpis)}
        </h1>
        <p className="relative mt-4 text-sm leading-relaxed text-kokos-50/[0.85]">
          {t.darek.podtext}
        </p>
      </section>

      <section className="karta-svetla overflow-hidden text-center">
        {maOsobni && (
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-inkoust/70">
            {t.darek.osobniQrTitulek}
          </p>
        )}
        {/* Obojí je hotový rastr — `next/image` by tu jen přidal runtime a
            kontrast QR kódu musí zůstat bit za bitem stejný, ať ho čtečka vždy
            chytne. Stejný přístup jako katalogy v `/sortiment/*`. */}
        <img
          src={maOsobni && osobniQr ? osobniQr : DAREK_QR_SOUBOR}
          alt={
            maOsobni
              ? t.darek.altOsobni(odkazText)
              : t.darek.altStaticky(odkazText)
          }
          width={480}
          height={480}
          /* Bez stropu 17 rem: osobní QR nese delší URL, má tedy hustší matici
             a na 375 px vychází ~6 px na modul. Přes celou šířku karty je to
             ~6,8 px — rozdíl, který na slunci a na promáčklém displeji
             rozhoduje. `ring` odlišuje bílou plochu QR od krémové karty. */
          className="mx-auto h-auto w-full max-w-[22rem] rounded-2xl bg-white p-3 ring-1 ring-inkoust/10"
        />
        <a
          href={maOsobni && osobniUrl ? osobniUrl : DAREK_KVIZ_URL}
          className="odkaz mt-4 block break-all text-[0.8125rem] font-semibold text-inkoust/80"
        >
          {odkazText}
        </a>

        {/* Počítadlo patří k osobnímu QR — jako patka jedné karty, ne jako
            samostatná deska o kus níž. Nulový stav drží nižší váhu, ať se
            „zatím nikdo“ netváří jako úspěch. */}
        {maOsobni && (
          <p
            className={`-mx-5 -mb-5 mt-5 border-t border-inkoust/10 bg-inkoust/[0.04] px-5 py-3.5 text-sm leading-relaxed ${
              pozvanych > 0
                ? "font-black text-inkoust"
                : "font-semibold text-inkoust/70"
            }`}
          >
            {t.darek.pocitadlo(pozvanych)}
          </p>
        )}
      </section>

      {/* Výzva jen nepřihlášeným. Přihlášenému, kterému se osobní QR nepovedlo
          vyrobit, by „přihlas se“ nedávalo smysl — ten dostane statické QR
          mlčky a dárek mu funguje dál. */}
      {!user && (
        <div className="karta space-y-3 text-center">
          <p className="text-sm leading-relaxed text-kokos-50/85">
            {t.darek.prihlaseniVyzva}
          </p>
          <Link
            href={`/prihlaseni?next=${encodeURIComponent("/darek")}`}
            className="tlacitko-hlavni"
          >
            {t.spolecne.prihlasitSe}
          </Link>
        </div>
      )}

      <p className="px-3 text-center text-xs leading-relaxed text-kokos-50/60">
        {t.darek.patka}
      </p>

      <Link href="/" className="tlacitko-vedlejsi">
        {t.spolecne.zpetNaRozcestnik}
      </Link>
    </div>
  );
}
