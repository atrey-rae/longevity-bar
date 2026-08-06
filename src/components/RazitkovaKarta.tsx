import { getT } from "@/lib/i18n/server";
import { STAMPS_PER_TIER } from "@/lib/loyalty";

/**
 * Věrnostní karta — 4 velká políčka na razítka.
 */
export default async function RazitkovaKarta({
  zaplneno,
  zvyraznitPosledni = false,
}: {
  zaplneno: number;
  zvyraznitPosledni?: boolean;
}) {
  const { t } = await getT();
  const policka = Array.from({ length: STAMPS_PER_TIER }, (_, i) => i);

  return (
    <div className="grid grid-cols-2 gap-3">
      {policka.map((i) => {
        const plne = i < zaplneno;
        const nove = zvyraznitPosledni && i === zaplneno - 1;

        return (
          <div
            key={i}
            className={[
              "relative flex aspect-square items-center justify-center rounded-3xl border-4 transition",
              plne
                ? "border-mango-400 bg-gradient-to-br from-mango-400 to-zapad-500 shadow-karta"
                : "border-dashed border-white/25 bg-white/5",
            ].join(" ")}
            aria-label={
              plne
                ? t.vernost.razitkoZiskano(i + 1)
                : t.vernost.volnePolicko(i + 1)
            }
          >
            {plne ? (
              <>
                {nove && (
                  <span className="animate-pulsRing absolute inset-0 rounded-3xl border-4 border-mango-400" />
                )}
                <span
                  className={[
                    "text-5xl drop-shadow",
                    nove ? "animate-popIn" : "",
                  ].join(" ")}
                  aria-hidden
                >
                  🥥
                </span>
              </>
            ) : (
              <span className="text-3xl font-black text-white/25" aria-hidden>
                {i + 1}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
