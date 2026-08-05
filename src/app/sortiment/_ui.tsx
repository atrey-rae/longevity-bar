/**
 * Sdílené stavební prvky obou katalogů (/sortiment/longevity a /sortiment/wild-coco).
 * Cíl: obě stránky vypadají jako jeden systém — stejná hlavička sekce, stejná
 * kotvicí navigace, stejné odvození monogramu pro položky bez fotky.
 */

/** Kotva sekce — diakritika pryč, aby fungoval odkaz `#kava-kakao`. */
export function kotva(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** První písmeno názvu jako monogram na krémové dlaždici. */
export function monogram(name: string): string {
  const znak = name.match(/\p{L}|\p{N}/u);
  return (znak ? znak[0] : "•").toLocaleUpperCase("cs-CZ");
}

/** Přilepený pás s kotvami na kategorie. */
export function KotvyKategorii({
  popisek,
  kategorie,
}: {
  popisek: string;
  kategorie: readonly string[];
}) {
  return (
    <div className="nav-kategorie-obal">
      <nav aria-label={popisek} className="nav-kategorie">
        {kategorie.map((kategorieNazev) => (
          <a
            key={kategorieNazev}
            href={`#${kotva(kategorieNazev)}`}
            className="nav-kategorie-polozka"
          >
            {kategorieNazev}
          </a>
        ))}
      </nav>
    </div>
  );
}

/** Hlavička sekce — jeden vzor pro oba katalogy. */
export function HlavickaSekce({
  nadpis,
  popis,
}: {
  nadpis: string;
  popis: string;
}) {
  return (
    <div className="border-l-[3px] border-mango-400 pl-4">
      <h2 className="text-[1.375rem] leading-tight text-kokos-50 sm:text-2xl">
        {nadpis}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-kokos-50/[0.68]">
        {popis}
      </p>
    </div>
  );
}

/**
 * USP jako štítky pod popisem — drží kartu nízkou a text čitelný.
 * `dole` zarovná štítky na spodní hranu karty; používá se jen tam, kde mají
 * všechny karty v řadě stejnou stavbu (WILD&COCO). V Longevity katalogu se
 * míchají karty s fotkou a bez ní, a zarovnávání dolů by dělalo díry.
 */
export function StitkyUsp({
  usps,
  dole = false,
}: {
  usps: readonly string[];
  dole?: boolean;
}) {
  return (
    <ul className={`flex flex-wrap gap-1.5 pt-1 ${dole ? "mt-auto" : ""}`}>
      {usps.map((usp) => (
        <li key={usp} className="chip-usp">
          {usp}
        </li>
      ))}
    </ul>
  );
}
