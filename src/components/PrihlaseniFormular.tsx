"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLang, useT } from "@/lib/i18n/client";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Krok = "telefon" | "kod";

const CEKANI_NA_ZNOVUPOSLANI_S = 45;

/**
 * Primární přihlášení telefonem; Google zůstává jako sekundární recovery/admin cesta.
 */
export default function PrihlaseniFormular({ next }: { next: string }) {
  const t = useT();
  const f = t.prihlaseni.formular;
  const lang = useLang();
  const router = useRouter();

  const [krok, setKrok] = useState<Krok>("telefon");
  const [telefon, setTelefon] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [kod, setKod] = useState("");
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyKod, setLegacyKod] = useState("");
  const [legacyCekaNaKod, setLegacyCekaNaKod] = useState(false);
  const [nacita, setNacita] = useState<null | "google" | "kod" | "overeni">(
    null,
  );
  const [chyba, setChyba] = useState<string | null>(null);
  // Chyby ze zabaleného e-mailového přihlášení mají vlastní místo přímo
  // v `<details>` — jinak by hlásily problém dva bloky nad formulářem.
  const [chybaLegacy, setChybaLegacy] = useState<string | null>(null);
  const [odpocet, setOdpocet] = useState(0);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("longevity-phone-auth");
      if (!raw) return;
      const saved = JSON.parse(raw) as { krok?: Krok; telefon?: string; challengeId?: string; expiresAt?: string; next?: string };
      if (saved.next !== next || saved.krok !== "kod" || !saved.telefon || !saved.challengeId) return;
      if (saved.expiresAt && Date.parse(saved.expiresAt) <= Date.now()) {
        window.sessionStorage.removeItem("longevity-phone-auth");
        return;
      }
      setTelefon(saved.telefon);
      setChallengeId(saved.challengeId);
      setExpiresAt(saved.expiresAt ?? null);
      setKrok("kod");
    } catch {
      window.sessionStorage.removeItem("longevity-phone-auth");
    }
  }, [next]);

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
      setChyba(f.chybaGoogle);
    }
  }

  async function poslatKod(znovu = false) {
    if (telefon.replace(/\D/g, "").length < 9) {
      setChyba(f.chybaTelefon);
      return;
    }
    setChyba(null);
    setNacita("kod");
    try {
      const response = await fetch("/api/auth/telefon/poslat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: telefon, lang }),
      });
      const data = await response.json() as {
        challengeId?: string | null;
        expiresAt?: string | null;
        retryAfterSeconds?: number | null;
        error?: string;
      };
      // Rate limit: server ho hlásí stejně pro každé číslo, takže hláška
      // nemůže prozradit, jestli u nás účet existuje.
      if (!data.challengeId && typeof data.retryAfterSeconds === "number") {
        throw new Error(f.chybaLimitSms);
      }
      if (!response.ok || !data.challengeId) throw new Error(data.error || f.chybaSms);
      setChallengeId(data.challengeId);
      setExpiresAt(data.expiresAt ?? null);
      setKrok("kod");
      window.sessionStorage.setItem("longevity-phone-auth", JSON.stringify({
        krok: "kod", telefon, challengeId: data.challengeId, expiresAt: data.expiresAt, next,
      }));
      setOdpocet(CEKANI_NA_ZNOVUPOSLANI_S);
      if (znovu) setKod("");
    } catch (e) {
      setChyba(e instanceof Error ? e.message : f.chybaSmsKod);
    } finally {
      setNacita(null);
    }
  }

  async function overitKod() {
    const cistyKod = kod.replace(/\D/g, "");
    if (cistyKod.length !== 4 || !challengeId) {
      setChyba(f.chybaDelkaKodu);
      return;
    }
    setChyba(null);
    setNacita("overeni");
    try {
      const response = await fetch("/api/auth/telefon/overit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, phone: telefon, code: cistyKod, next }),
      });
      const data = await response.json() as { tokenHash?: string; next?: string; error?: string };
      if (!response.ok || !data.tokenHash) throw new Error(data.error || f.chybaKod);
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.verifyOtp({ token_hash: data.tokenHash, type: "email" });
      if (error) throw error;
      window.sessionStorage.removeItem("longevity-phone-auth");
      router.replace(data.next || next);
      router.refresh();
    } catch (error) {
      setNacita(null);
      setChyba(error instanceof Error ? error.message : f.chybaKodVyprsel);
    }
  }

  async function poslatLegacyEmailKod() {
    const email = legacyEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setChybaLegacy(f.chybaLegacyEmail); return;
    }
    setNacita("kod"); setChybaLegacy(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error;
      setLegacyEmail(email); setLegacyCekaNaKod(true);
    } catch { setChybaLegacy(f.chybaLegacyPoslani); }
    finally { setNacita(null); }
  }

  async function overitLegacyEmailKod() {
    if (!/^\d{6}$/.test(legacyKod)) { setChybaLegacy(f.chybaLegacyDelka); return; }
    setNacita("overeni"); setChybaLegacy(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.verifyOtp({ email: legacyEmail, token: legacyKod, type: "email" });
      if (error) throw error;
      router.replace(next); router.refresh();
    } catch { setChybaLegacy(f.chybaLegacyKod); setNacita(null); }
  }

  return (
    <div className="space-y-5">
      {krok === "telefon" ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-bold uppercase tracking-wider text-kokos-50/80">{f.tvujTelefon}</span>
            <input className="vstup" type="tel" inputMode="tel" autoComplete="tel" placeholder={f.telefonPlaceholder} value={telefon} onChange={(e) => setTelefon(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void poslatKod(); }} />
          </label>
          <button type="button" onClick={() => void poslatKod()} disabled={nacita !== null} className="tlacitko-hlavni disabled:opacity-70">
            {nacita === "kod" ? f.odesilam : f.poslatSms}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-kokos-50/80">{f.poslaliJsmeKodPred} <strong className="font-bold text-mango-400">{telefon}</strong>{f.poslaliJsmeKodPo}</p>
          <input className="vstup text-center text-3xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="0000" value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") void overitKod(); }} autoFocus />
          <button type="button" onClick={() => void overitKod()} disabled={nacita !== null} className="tlacitko-hlavni disabled:opacity-70">{nacita === "overeni" ? f.overuji : t.spolecne.prihlasitSe}</button>
          <div className="flex justify-between text-sm">
            <button type="button" className="odkaz" onClick={() => { setKrok("telefon"); setKod(""); setChallengeId(null); setExpiresAt(null); setChyba(null); window.sessionStorage.removeItem("longevity-phone-auth"); }}>{f.zmenitTelefon}</button>
            <button type="button" className="odkaz disabled:opacity-50 disabled:no-underline" disabled={odpocet > 0 || nacita !== null} onClick={() => void poslatKod(true)}>{odpocet > 0 ? f.poslatZnovuOdpocet(odpocet) : f.poslatZnovu}</button>
          </div>
          {expiresAt && <p className="text-center text-xs text-kokos-50/50">{f.kodPlati}</p>}
        </div>
      )}

      {/* Chyba patří pod krok, který ji způsobil — dole pod Google blokem si jí
          na mobilu nikdo nevšiml, protože byla mimo obrazovku. */}
      {chyba && (
        <p
          role="alert"
          className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
        >
          {chyba}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-kokos-50/50"><span className="h-px flex-1 bg-white/20" />{f.nebo}<span className="h-px flex-1 bg-white/20" /></div>

      {/* Google – sekundární cesta pro existující účet a administraci. */}
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
        {nacita === "google" ? f.presmerovavam : f.google}
      </button>

      <details className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
        <summary className="cursor-pointer text-center text-sm font-bold text-kokos-50/75">{f.legacyShrnuti}</summary>
        <div className="mt-3 space-y-2">
          {!legacyCekaNaKod ? <>
            <input className="vstup" type="email" inputMode="email" autoComplete="email" placeholder={t.spolecne.emailPlaceholder} value={legacyEmail} onChange={(event) => setLegacyEmail(event.target.value)} />
            <button type="button" className="tlacitko-vedlejsi w-full" disabled={nacita !== null} onClick={() => void poslatLegacyEmailKod()}>{f.legacyPoslat}</button>
          </> : <>
            <p className="text-center text-xs text-kokos-50/70">{f.legacyPoslano(legacyEmail)}</p>
            <input className="vstup text-center text-2xl tracking-[0.35em]" inputMode="numeric" maxLength={6} value={legacyKod} onChange={(event) => setLegacyKod(event.target.value.replace(/\D/g, ""))} />
            <button type="button" className="tlacitko-vedlejsi w-full" disabled={nacita !== null} onClick={() => void overitLegacyEmailKod()}>{f.legacyOverit}</button>
          </>}
          {chybaLegacy && (
            <p
              role="alert"
              className="rounded-xl bg-zapad-600/90 px-4 py-3 text-center text-sm font-bold text-white"
            >
              {chybaLegacy}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
