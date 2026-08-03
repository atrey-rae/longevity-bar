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

      <section className="karta space-y-3 text-sm leading-relaxed">
        <h2>Jak se sbírají razítka</h2>
        <ul className="list-disc space-y-1.5 pl-5">
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

      <section className="karta space-y-3 text-sm leading-relaxed">
        <h2>Odměny</h2>
        <p>
          Za každá <strong>{STAMPS_PER_TIER} razítka</strong> získáš jednu
          odměnu zdarma. Odměny se střídají v tomto pořadí:
        </p>
        <ol className="space-y-2">
          {CATEGORIES.map((kat, i) => (
            <li key={kat} className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {CATEGORY_EMOJI[kat]}
              </span>
              <span className="font-semibold">
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

      <section className="karta space-y-3 text-sm leading-relaxed">
        <h2>Vyzvednutí odměny</h2>
        <ul className="list-disc space-y-1.5 pl-5">
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

      <section className="karta space-y-3 text-sm leading-relaxed">
        <h2>Reklamace</h2>
        <p>
          Nepřipsalo se razítko nebo se odměna omylem znehodnotila? Obrať se na
          obsluhu stánku — má možnost stav ručně opravit.
        </p>
      </section>

      <section className="karta space-y-3 text-sm leading-relaxed">
        <h2>Ochrana osobních údajů (GDPR)</h2>
        <p>
          Správcem údajů je provozovatel stánku Longevity Bar (Wild &amp; Coco /
          Peace &amp; Coco).
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Zpracováváme <strong>e-mail</strong> (a jméno, pokud se přihlásíš
            přes Google) a <strong>historii razítek a odměn</strong>.
          </li>
          <li>
            Účel: provoz věrnostního programu. Právní základ: plnění služby, o
            kterou jsi požádal.
          </li>
          <li>
            E-mail <strong>nepoužíváme k marketingu</strong> a nikomu ho
            nepředáváme.
          </li>
          <li>
            Data jsou uložena u zpracovatele Supabase (EU) a appka běží na
            Vercelu.
          </li>
          <li>
            Údaje mažeme nejpozději do 3 měsíců po skončení festivalu. O výmaz
            můžeš požádat kdykoli dřív u obsluhy stánku.
          </li>
          <li>
            Cookies používáme pouze technické — pro udržení přihlášení. Žádné
            sledovací ani reklamní cookies.
          </li>
        </ul>
      </section>

      <Link href="/" className="tlacitko-vedlejsi">
        Zpět na kartu
      </Link>
    </div>
  );
}
