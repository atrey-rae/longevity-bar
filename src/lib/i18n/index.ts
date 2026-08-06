/**
 * Slovníky Bar.app. Čistý modul bez Reactu a bez `next/*` — načte ho i `tsx`
 * v kontrolních skriptech.
 *
 * Serverová varianta žije v `./server`, klientská v `./client`.
 */

import { cs } from "./cs";
import { en } from "./en";
import { DEFAULT_LANG, type Lang } from "./lang";
import type { Dict } from "./types";

export const DICTS: Record<Lang, Dict> = { cs, en };

/** Slovník pro daný jazyk; neznámá hodnota spadne na výchozí jazyk. */
export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? DICTS[DEFAULT_LANG];
}

export { cs, en };
export type { Dict };
export * from "./lang";
