import { getT } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/types";
import type { Lang } from "@/lib/i18n/lang";
import type { ScanStatus } from "@/lib/loyalty-server";
import { formatDate } from "@/lib/time";

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
  t: Dict,
  lang: Lang,
  min?: number,
  limit?: number,
  den?: string,
): { ton: Tón; nadpis: string; text?: string } | null {
  const h = t.sken.hlasky;
  switch (status as ScanStatus) {
    case "ok":
      return { ton: "uspech", nadpis: h.okNadpis };
    case "cooldown":
      return {
        ton: "varovani",
        nadpis: h.cooldownNadpis,
        text: h.cooldownText(min && min > 0 ? min : 1),
      };
    case "daily_limit":
      return {
        ton: "varovani",
        nadpis: h.limitNadpis,
        text: h.limitText(limit ?? 4),
      };
    case "wrong_day":
      return {
        ton: "chyba",
        nadpis: h.spatnyDenNadpis,
        text: den ? h.spatnyDenText(formatDate(den, lang)) : h.spatnyDenBezData,
      };
    case "inactive_day":
      return {
        ton: "chyba",
        nadpis: h.vypnutyNadpis,
        text: h.vypnutyText,
      };
    case "unknown_token":
      return {
        ton: "chyba",
        nadpis: h.neznamyNadpis,
        text: h.neznamyText,
      };
    case "error":
      return {
        ton: "chyba",
        nadpis: h.chybaNadpis,
        text: h.chybaText,
      };
    default:
      return null;
  }
}

/** Výsledek skenu QR (zobrazí se na věrnostní kartě po přesměrování). */
export default async function SkenHlaska({
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
  const { lang, t } = await getT();
  const data = obsah(status, t, lang, min, limit, den);
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
