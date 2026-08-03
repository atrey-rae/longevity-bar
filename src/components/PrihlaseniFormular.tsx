"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/client";

type Krok = "email" | "kod";

const CEKANI_NA_ZNOVUPOSLANI_S = 45;

/**
 * Přihlášení: Google OAuth (hlavní cesta) + e-mail s 6místným kódem.
 */
export default function PrihlaseniFormular({ next }: { next: string }) {
  const router = useRouter();

  const [krok, setKrok] = useState<Krok>("email");
  const [email, setEmail] = useState("");
  const [kod, setKod] = useState("");
  const [nacita, setNacita] = useState<null | "google" | "kod" | "overeni">(
    null,
  );
  const [chyba, setChyba] = useState<string | null>(null);
  const [odpocet, setOdpocet] = useState(0);

  useEffect(() => {
    if (odpocet <= 0) return;
    const id = window.setTimeout(() => setOdpocet((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [odpocet]);

  async function prihlasitGoogle() {
    setChyba(null);
    setNacita("google");
    try {
      const supabase = getBrowserSupabase();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // Prohlížeč se přesměruje na Google.
    } catch {
      setNacita(null);
      setChyba("Přihlášení přes Google se nepodařilo. Zkus e-mail níže.");
    }
  }

  async function poslatKod(znovu = false) {
    const cistyEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cistyEmail)) {
      setChyba("Zadej prosím platný e-mail.");
      return;
    }
    setChyba(null);
    setNacita("kod");
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cistyEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setEmail(cistyEmail);
      setKrok("kod");
      setOdpocet(CEKANI_NA_ZNOVUPOSLANI_S);
      if (znovu) setKod("");
    } catch (e) {
      const zprava = e instanceof Error ? e.message : "";
      setChyba(
        zprava.toLowerCase().includes("rate")
          ? "Moc pokusů po sobě. Zkus to prosím za chvíli."
          : "E-mail s kódem se nepodařilo odeslat. Zkus to prosím znovu.",
      );
    } finally {
      setNacita(null);
    }
  }

  async function overitKod() {
    const cistyKod = kod.replace(/\D/g, "");
    if (cistyKod.length !== 6) {
      setChyba("Kód má 6 číslic.");
      return;
    }
    setChyba(null);
    setNacita("overeni");
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cistyKod,
        type: "email",
      });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch {
      setNacita(null);
      setChyba("Kód nesedí nebo už vypršel. Zkus ho opsat znovu.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Google */}
      <button
        type="button"
        onClick={() => void prihlasitGoogle()}
        disabled={nacita !== null}
        className="tlacitko-svetle disabled:opacity-70"
      >
        <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden>
          <path
            fill="#EA4335"
            d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.7h12.7c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.5-10.3 6.5-16.8z"
          />
          <path
            fill="#FBBC05"
            d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.4 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
          />
        </svg>
        {nacita === "google" ? "Přesměrovávám…" : "Pokračovat přes Google"}
      </button>

      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-kokos-50/50">
        <span className="h-px flex-1 bg-white/20" />
        nebo e-mailem
        <span className="h-px flex-1 bg-white/20" />
      </div>

      {krok === "email" ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-bold uppercase tracking-wider text-kokos-50/80">
              Tvůj e-mail
            </span>
            <input
              className="vstup"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="jmeno@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void poslatKod();
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void poslatKod()}
            disabled={nacita !== null}
            className="tlacitko-hlavni disabled:opacity-70"
          >
            {nacita === "kod" ? "Odesílám…" : "Poslat ověřovací kód"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-kokos-50/80">
            Poslali jsme 6místný kód na{" "}
            <strong className="font-bold text-mango-400">{email}</strong>.
            <br />
            Zkontroluj i spam.
          </p>
          <input
            className="vstup text-center text-3xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void overitKod();
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <button
            type="button"
            onClick={() => void overitKod()}
            disabled={nacita !== null}
            className="tlacitko-hlavni disabled:opacity-70"
          >
            {nacita === "overeni" ? "Ověřuji…" : "Přihlásit se"}
          </button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              className="odkaz"
              onClick={() => {
                setKrok("email");
                setKod("");
                setChyba(null);
              }}
            >
              Změnit e-mail
            </button>
            <button
              type="button"
              className="odkaz disabled:opacity-50 disabled:no-underline"
              disabled={odpocet > 0 || nacita !== null}
              onClick={() => void poslatKod(true)}
            >
              {odpocet > 0 ? `Poslat znovu (${odpocet} s)` : "Poslat znovu"}
            </button>
          </div>
        </div>
      )}

      {chyba && (
        <p
          role="alert"
          className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
        >
          {chyba}
        </p>
      )}
    </div>
  );
}
