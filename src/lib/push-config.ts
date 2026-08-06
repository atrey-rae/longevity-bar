/**
 * Konfigurace oznámení (Web Push) — VAPID klíče z env.
 *
 * Schválně oddělené od `lib/push.ts`: ten táhne knihovnu `web-push` (Node),
 * kdežto tenhle modul potřebuje i obyčejná stránka, aby věděla, jestli má
 * tlačítko „Zapnout oznámení" vůbec nabídnout.
 *
 * BEZ KLÍČŮ SE FUNKCE TIŠE VYPNE. Žádná chyba, žádná hláška hostovi — jen se
 * oznámení nenabízejí. Festival tak poběží i s nedodělanou konfigurací.
 *
 * Klíče se NEGENERUJÍ v repozitáři. Orchestrátor je vyrobí jednou:
 *   npx web-push generate-vapid-keys
 * a nastaví ve Vercelu → Settings → Environment Variables:
 *   VAPID_PUBLIC_KEY   … veřejný klíč (jde do prohlížeče, není tajný)
 *   VAPID_PRIVATE_KEY  … PRIVÁTNÍ klíč (nikdy nesmí opustit server)
 *   VAPID_SUBJECT      … kontakt, např. `mailto:atrey@wildandcoco.com`
 */

/** Veřejný VAPID klíč. Smí do prohlížeče — bez něj nejde zavolat `subscribe`. */
export function vapidVerejnyKlic(): string | null {
  const klic = process.env.VAPID_PUBLIC_KEY?.trim();
  return klic ? klic : null;
}

/**
 * Je odesílání kompletně nakonfigurované?
 *
 * Klíčové je, že se ptáme i na PRIVÁTNÍ klíč: nabídnout hostovi zapnutí
 * oznámení, která pak nemá kdo odeslat, je horší než je nenabízet vůbec.
 */
export function jePushNakonfigurovany(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

/**
 * Veřejný klíč pro klienta — `null`, když cokoli z konfigurace chybí.
 * Tohle volají stránky, které tlačítko montují.
 */
export function verejnyKlicProKlienta(): string | null {
  return jePushNakonfigurovany() ? vapidVerejnyKlic() : null;
}
