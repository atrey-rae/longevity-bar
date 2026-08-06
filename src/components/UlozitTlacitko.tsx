"use client";

import { useFormStatus } from "react-dom";

import { useT } from "@/lib/i18n/client";

/**
 * Odesílací tlačítko formuláře se server action.
 *
 * `useFormStatus` čte stav NEJBLIŽŠÍHO nadřazeného `<form>`, proto musí být
 * tlačítko vlastní komponenta uvnitř formuláře — ve stránce samotné by pending
 * stav zůstal navždy `false`. Bez toho vypadalo pomalé uložení kontaktu jako
 * mrtvé tlačítko a host ho mačkal znovu.
 */
export default function UlozitTlacitko({
  className = "tlacitko-zapad w-full",
}: {
  className?: string;
}) {
  const t = useT();
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-70`}
    >
      {pending ? t.spolecne.ukladam : t.spolecne.ulozit}
    </button>
  );
}
