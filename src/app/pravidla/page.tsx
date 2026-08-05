import type { Metadata } from "next";
import Link from "next/link";

import {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL_LONG,
  STAMPS_PER_TIER,
} from "@/lib/loyalty";

export const metadata: Metadata = { title: "Pravidla a GDPR" };

export default function PravidlaPage() {
  return (
    <div className="obal space-y-5">
      <h1 className="text-stin">Pravidla věrnostního programu</h1>

      <section className="karta space-y-3 text-[0.9375rem] leading-relaxed text-kokos-50/90">
        <h2 className="flex items-center gap-2.5 border-b border-white/10 pb-2.5 text-lg text-kokos-50">
          <span
            className="h-4 w-1 shrink-0 rounded-full bg-mango-400"
            aria-hidden
          />Jak se sbírají razítka</h2>
        <ul className="list-disc space-y-2 pl-5 marker:text-mango-400">
          <li>
            Jeden nákup na stánku Longevity Bar = <strong>1 razítko</strong>.
          </li>
          <li>
            Razítko získáš sejmutím QR kódu, který ti obsluha ukáže{" "}
            <strong>po zaplacení</strong>.
          </li>
          <li>
            QR kód platí <strong>jen v daný festivalový den</strong>.
          </li>
          <li>
            Mezi dvěma razítky je krátká prodleva a platí denní limit razítek —
            chrání to program před zneužitím.
          </li>
          <li>
            Razítka se počítají průběžně. I s nevyzvednutou odměnou sbíráš dál a
            nic ti nepropadá.
          </li>
        </ul>
      </section>

      <section className="karta space-y-3 text-[0.9375rem] leading-relaxed text-kokos-50/90">
        <h2 className="flex items-center gap-2.5 border-b border-white/10 pb-2.5 text-lg text-kokos-50">
          <span
            className="h-4 w-1 shrink-0 rounded-full bg-mango-400"
            aria-hidden
          />Odměny</h2>
        <p>
          Za každá <strong>{STAMPS_PER_TIER} razítka</strong> získáš jednu
          odměnu zdarma. Odměny se střídají v tomto pořadí:
        </p>
        <ol className="space-y-2">
          {CATEGORIES.map((kat, i) => (
            <li
              key={kat}
              className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-xl"
                aria-hidden
              >
                {CATEGORY_EMOJI[kat]}
              </span>
              <span className="font-semibold leading-snug">
                {i + 1}. {CATEGORY_LABEL_LONG[kat]}
              </span>
            </li>
          ))}
        </ol>
        <p>
          Po třetí odměně se cyklus opakuje od začátku. Vybírat lze jen z
          produktů, které jsou právě skladem.
        </p>
      </section>

      <section className="karta space-y-3 text-[0.9375rem] leading-relaxed text-kokos-50/90">
        <h2 className="flex items-center gap-2.5 border-b border-white/10 pb-2.5 text-lg text-kokos-50">
          <span
            className="h-4 w-1 shrink-0 rounded-full bg-mango-400"
            aria-hidden
          />Vyzvednutí odměny</h2>
        <ul className="list-disc space-y-2 pl-5 marker:text-mango-400">
          <li>Po výběru produktu ukážeš obrazovku obsluze u pokladny.</li>
          <li>
            Obrazovka je živá (animace + běžící hodiny) — screenshot obsluha
            nepřijme.
          </li>
          <li>
            Výdej potvrzuje <strong>obsluha</strong> podržením tlačítka „Vydat“
            na tvém telefonu. Odměna se tím jednorázově znehodnotí.
          </li>
          <li>
            Když si tlačítko zmáčkneš sám bez převzetí produktu, o odměnu
            přijdeš.
          </li>
          <li>
            Ztracená nebo zavřená obrazovka nevadí — všechno je uložené na
            serveru, stačí appku otevřít znovu.
          </li>
        </ul>
      </section>

      <section className="karta space-y-3 text-[0.9375rem] leading-relaxed text-kokos-50/90">
        <h2 className="flex items-center gap-2.5 border-b border-white/10 pb-2.5 text-lg text-kokos-50">
          <span
            className="h-4 w-1 shrink-0 rounded-full bg-mango-400"
            aria-hidden
          />Reklamace</h2>
        <p>
          Nepřipsalo se razítko nebo se odměna omylem znehodnotila? Obrať se na
          obsluhu stánku — má možnost stav ručně opravit.
        </p>
      </section>

      <section className="karta space-y-3 text-[0.9375rem] leading-relaxed text-kokos-50/90">
        <h2 className="flex items-center gap-2.5 border-b border-white/10 pb-2.5 text-lg text-kokos-50">
          <span
            className="h-4 w-1 shrink-0 rounded-full bg-mango-400"
            aria-hidden
          />Ochrana osobních údajů (GDPR)</h2>
        <p>
          Správcem údajů je <strong>WILD&amp;COCO s.r.o.</strong>, provozovatel
          stánku Longevity Bar (Peace &amp; Coco).
        </p>
        <h3 className="pt-1 text-[0.8125rem] font-black uppercase tracking-[0.12em] text-mango-400">Věrnostní program (razítka)</h3>
        <ul className="list-disc space-y-2 pl-5 marker:text-mango-400">
          <li>
            Zpracováváme <strong>telefonní číslo a e-mail</strong> (a jméno,
            pokud se přihlásíš přes Google) a <strong>historii razítek a odměn</strong>.
          </li>
          <li>
            Účel: přihlášení, provoz věrnostního programu a zasílání Longevity
            tipů po festivalu, nejdéle do 31. 12. 2026. Údaje nikomu neprodáváme.
          </li>
          <li>
            Kontaktní údaje pro Longevity tipy používáme nejdéle do 31. 12.
            2026; poté je smažeme nebo ponecháme jen tehdy, pokud pro to máme
            jiný platný důvod (například tvůj samostatný souhlas či nákup).
          </li>
        </ul>
        <h3 className="pt-1 text-[0.8125rem] font-black uppercase tracking-[0.12em] text-mango-400">
          Kvíz „Odemkni potenciál svého mikrobiomu“ (kupóny)
        </h3>
        <ul className="list-disc space-y-2 pl-5 marker:text-mango-400">
          <li>
            Zpracováváme <strong>jméno, e-mail a telefonní číslo</strong>,
            které vyplníš ve formuláři, vybraný produkt s kódem kupónu a
            variantu kvízu. <strong>Odpovědi na otázky kvízu se neukládají</strong>{" "}
            — zůstávají jen v tvém prohlížeči.
          </li>
          <li>
            Účel: zaslání kupónu a{" "}
            <strong>Longevity tipů od WILD&amp;COCO s.r.o.</strong> —
            kontaktní údaje k tomu používáme{" "}
            <strong>nejdéle do 31. 12. 2026</strong>, a to ve velmi omezené
            formě: <strong>maximálně 6 přátelských zpráv</strong>.
          </li>
          <li>
            Další komunikace je možná jen v případě, že se staneš zákazníkem
            internetového obchodu www.wildandcoco.com&nbsp;/&nbsp;.de&nbsp;/
            &nbsp;.sk&nbsp;/&nbsp;.at&nbsp;/&nbsp;.ch.
          </li>
          <li>
            Souhlas můžeš kdykoli odvolat — odpovědí na zprávu nebo u obsluhy
            stánku; kontakty pak přestaneme používat.
          </li>
        </ul>
        <h3 className="pt-1 text-[0.8125rem] font-black uppercase tracking-[0.12em] text-mango-400">Společné</h3>
        <ul className="list-disc space-y-2 pl-5 marker:text-mango-400">
          <li>
            Data jsou uložena u zpracovatele Supabase (EU) a appka běží na
            Vercelu.
          </li>
          <li>
            O výmaz svých údajů můžeš požádat kdykoli u obsluhy stánku nebo na
            e-shopu.
          </li>
          <li>
            Cookies používáme pouze technické — pro udržení přihlášení. Žádné
            sledovací ani reklamní cookies.
          </li>
        </ul>
      </section>

      <Link href="/odmeny" className="tlacitko-vedlejsi">
        Zpět na kartu
      </Link>
    </div>
  );
}
