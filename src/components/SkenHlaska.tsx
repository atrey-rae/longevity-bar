import type { ScanStatus } from "@/lib/loyalty-server";
import { minuty, razitka } from "@/lib/text";
import { formatCzechDate } from "@/lib/time";

type Tón = "uspech" | "varovani" | "chyba";

const STYL: Record<Tón, string> = {
  uspech: "border-list-500/60 bg-list-500/20 text-white",
  varovani: "border-mango-400/60 bg-mango-400/20 text-white",
  chyba: "border-zapad-500/60 bg-zapad-500/25 text-white",
};

const IKONA: Record<Tón, string> = {
  uspech: "✅",
  varovani: "⏳",
  chyba: "⚠️",
};

function obsah(
  status: string,
  min?: number,
  limit?: number,
  den?: string,
): { ton: Tón; nadpis: string; text?: string } | null {
  switch (status as ScanStatus) {
    case "ok":
      return { ton: "uspech", nadpis: "Razítko připsáno!" };
    case "cooldown":
      return {
        ton: "varovani",
        nadpis: "Razítko už máš",
        text: `Další si můžeš připsat za ${minuty(min && min > 0 ? min : 1)}. Jedno razítko = jeden nákup.`,
      };
    case "daily_limit":
      return {
        ton: "varovani",
        nadpis: "Denní limit vyčerpán",
        text: `Dnes už máš maximum (${razitka(limit ?? 4)}). Přijď zase zítra!`,
      };
    case "wrong_day":
      return {
        ton: "chyba",
        nadpis: "Tenhle QR kód dnes neplatí",
        text: den
          ? `Kód patří ke dni ${formatCzechDate(den)}. U pokladny si nech ukázat dnešní kód.`
          : "U pokladny si nech ukázat dnešní kód.",
      };
    case "inactive_day":
      return {
        ton: "chyba",
        nadpis: "QR kód je vypnutý",
        text: "Zeptej se prosím obsluhy u pokladny.",
      };
    case "unknown_token":
      return {
        ton: "chyba",
        nadpis: "Neznámý QR kód",
        text: "Nech si prosím ukázat aktuální kód u pokladny.",
      };
    case "error":
      return {
        ton: "chyba",
        nadpis: "Něco se pokazilo",
        text: "Zkus prosím QR kód sejmout znovu.",
      };
    default:
      return null;
  }
}

/** Výsledek skenu QR (zobrazí se na věrnostní kartě po přesměrování). */
export default function SkenHlaska({
  status,
  min,
  limit,
  den,
}: {
  status?: string;
  min?: number;
  limit?: number;
  den?: string;
}) {
  if (!status) return null;
  const data = obsah(status, min, limit, den);
  if (!data) return null;

  return (
    <div
      role="status"
      className={`animate-popIn rounded-2xl border-2 px-4 py-3 ${STYL[data.ton]}`}
    >
      <p className="flex items-center gap-2 text-lg font-extrabold">
        <span aria-hidden>{IKONA[data.ton]}</span>
        {data.nadpis}
      </p>
      {data.text && (
        <p className="mt-1 text-sm font-medium text-white/90">{data.text}</p>
      )}
    </div>
  );
}
