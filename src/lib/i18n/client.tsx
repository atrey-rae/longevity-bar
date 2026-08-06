"use client";

/**
 * Jazyk v klientských komponentách.
 *
 * Provider dostává jazyk z rootového layoutu (server ho zjistil z cookie nebo
 * z `Accept-Language`), takže na klientovi se nic nedetekuje znovu a nehrozí
 * hydration mismatch.
 */

import { createContext, useContext, type ReactNode } from "react";

import { getDict } from "./index";
import { DEFAULT_LANG, type Lang } from "./lang";
import type { Dict } from "./types";

const LangContext = createContext<Lang>(DEFAULT_LANG);

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Aktuální jazyk — pro formátování data, času a `lang` atributů. */
export function useLang(): Lang {
  return useContext(LangContext);
}

/** Slovník aktuálního jazyka. Přístup po klíčích: `t.kviz.hook`. */
export function useT(): Dict {
  return getDict(useContext(LangContext));
}
