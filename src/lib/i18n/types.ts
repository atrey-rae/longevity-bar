/**
 * Tvar slovníku. Odvozuje se z české verze, takže `cs.ts` je jediné místo, kde
 * se zavádí nový klíč — anglická verze ho pak MUSÍ doplnit, jinak neprojde
 * `tsc` ani `scripts/check-i18n.ts`.
 */

import type { cs } from "./cs";

export type Dict = typeof cs;
