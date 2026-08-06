"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { odeslatOznameni, type OznameniStav } from "../actions";

const PRAZDNY: OznameniStav = { stav: "klid" };

function Odeslat({ potvrzeno }: { potvrzeno: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !potvrzeno}
      className="tlacitko-hlavni disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-kokos-50/50 disabled:shadow-none"
    >
      {pending ? "Odesílám…" : "Odeslat oznámení"}
    </button>
  );
}

/**
 * Formulář hromadného oznámení.
 *
 * Dvě pojistky proti překlepu, který už nejde vzít zpět:
 *   1. živý NÁHLED přesně toho, co hostovi vyskočí na telefonu,
 *   2. povinné ZAŠKRTNUTÍ potvrzení — teprve pak jde tlačítko zmáčknout.
 */
export default function OznameniFormular({
  pocetVsichni,
  pocetPrihlaseni,
}: {
  pocetVsichni: number;
  pocetPrihlaseni: number;
}) {
  const [titulek, setTitulek] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [filtr, setFiltr] = useState<"vsichni" | "prihlaseni">("vsichni");
  const [potvrzeno, setPotvrzeno] = useState(false);
  const [vysledek, setVysledek] = useState<OznameniStav>(PRAZDNY);

  const prijemcu = filtr === "prihlaseni" ? pocetPrihlaseni : pocetVsichni;
  const pripraveno = titulek.trim().length > 0 && text.trim().length > 0;

  return (
    <form
      action={async (formData: FormData) => {
        setVysledek(await odeslatOznameni(formData));
        setPotvrzeno(false);
      }}
      className="space-y-4"
    >
      <label className="block space-y-1">
        <span className="text-sm font-bold">Titulek</span>
        <input
          name="titulek"
          value={titulek}
          onChange={(e) => setTitulek(e.target.value)}
          maxLength={80}
          required
          className="vstup"
          placeholder="Máš odměnu!"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold">Text</span>
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          required
          rows={3}
          className="vstup"
          placeholder="Nasbíral jsi 4 razítka. Vyber si, co si dáš."
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold">
          Odkaz <span className="font-normal text-kokos-50/60">(nepovinné)</span>
        </span>
        <input
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="vstup"
          placeholder="/kredit"
        />
        <span className="block text-xs text-kokos-50/60">
          Musí začínat lomítkem. Prázdné = rozcestník.
        </span>
      </label>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-bold">Komu</legend>
        {(
          [
            ["vsichni", `Všem se zapnutými oznámeními (${pocetVsichni})`],
            ["prihlaseni", `Jen přihlášeným (${pocetPrihlaseni})`],
          ] as const
        ).map(([hodnota, popis]) => (
          <label key={hodnota} className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="filtr"
              value={hodnota}
              checked={filtr === hodnota}
              onChange={() => setFiltr(hodnota)}
              className="h-4 w-4"
            />
            <span>{popis}</span>
          </label>
        ))}
      </fieldset>

      {/* Náhled: přesně to, co hostovi vyskočí na zamčené obrazovce. */}
      <div className="space-y-1.5">
        <p className="text-sm font-bold">Náhled</p>
        <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-black/30 p-3">
          <span aria-hidden className="text-2xl">
            🥥
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-kokos-50">
              {titulek.trim() || "Longevity Bar"}
            </span>
            <span className="block text-xs leading-snug text-kokos-50/75">
              {text.trim() || "Text oznámení…"}
            </span>
          </span>
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-2xl border border-mango-400/40 bg-mango-400/10 p-3 text-sm">
        <input
          type="checkbox"
          checked={potvrzeno}
          onChange={(e) => setPotvrzeno(e.target.checked)}
          disabled={!pripraveno}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          Rozumím, že tohle oznámení dorazí na <strong>{prijemcu}</strong>{" "}
          {prijemcu === 1 ? "zařízení" : "zařízení"} a nejde vzít zpět.
        </span>
      </label>

      <Odeslat potvrzeno={potvrzeno && pripraveno} />

      {vysledek.stav === "ok" && (
        <p className="rounded-xl bg-list-600/90 px-4 py-3 text-sm font-bold text-kokos-50">
          Odesláno: {vysledek.odeslano} · uklizeno mrtvých odběrů:{" "}
          {vysledek.smazano} · selhalo: {vysledek.selhalo}
        </p>
      )}
      {vysledek.stav === "chyba" && (
        <p role="alert" className="rounded-xl bg-zapad-600/90 px-4 py-3 text-sm font-bold text-white">
          {vysledek.zprava}
        </p>
      )}
    </form>
  );
}
