"use client";

/** Spustí tiskový dialog prohlížeče. */
export default function TiskTlacitko() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="tlacitko-hlavni no-print"
    >
      🖨️ Vytisknout
    </button>
  );
}
