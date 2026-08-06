"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  LANGS,
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  LANG_LABEL,
  type Lang,
} from "@/lib/i18n/lang";

/**
 * Přepínač CZ/EN vpravo v hlavičce.
 *
 * Volba se ukládá do cookie `lang` a `router.refresh()` nechá server znovu
 * vykreslit stránku už v novém jazyce. URL se NEMĚNÍ — festival běží a odkazy
 * i QR kódy musí zůstat platné (žádný `/en/...` prefix).
 *
 * Cookie se zapisuje z klienta záměrně: server action ani API endpoint by tu
 * nepřinesly nic navíc a přepnutí jazyka je bez rizika (žádný `httpOnly` obsah).
 */
export default function PrepinacJazyka({ aktivni }: { aktivni: Lang }) {
  const router = useRouter();
  const [ceka, startTransition] = useTransition();

  function prepnout(lang: Lang) {
    if (lang === aktivni) return;
    // `SameSite=Lax` stačí — cookie se čte jen při navigaci na vlastní doménu.
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Language · Jazyk"
      className={`flex items-center gap-0.5 rounded-full border border-white/20 bg-white/[0.07] p-0.5 ${
        ceka ? "opacity-70" : ""
      }`}
    >
      {LANGS.map((lang) => {
        const zvoleny = lang === aktivni;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => prepnout(lang)}
            aria-pressed={zvoleny}
            /* Jazyk popisku je vždy ten cílový, ne přeložený — „EN“ musí být
               čitelné i pro toho, kdo česky neumí ani slovo. */
            lang={lang}
            className={[
              "grid min-h-9 min-w-9 place-items-center rounded-full px-2 text-[0.7rem] font-black uppercase tracking-wider transition",
              zvoleny
                ? "bg-mango-400 text-inkoust shadow-tlacitko"
                : "text-kokos-50/65 hover:bg-white/10 hover:text-kokos-50",
            ].join(" ")}
          >
            {LANG_LABEL[lang]}
          </button>
        );
      })}
    </div>
  );
}
