/**
 * Pozvánka pro hosta na jedno ťuknutí — `https://bar.peaceandcoco.com/<token>`.
 *
 * Token vzniká v `/api/internal/invite/create` (volá Healing.app) a konzumuje
 * se v root catch-all routě `src/app/[token]/route.ts`, tedy na téhle straně,
 * kde žije session.
 *
 * DÉLKA JE SOUČÁST KONTRAKTU. Celá adresa musí zůstat do 45 znaků, jinak zvací
 * SMS přeteče do druhého segmentu a platí se dvakrát. Odtud token rovnou za
 * doménou (žádná cesta) a jen 16 znaků. Když se cokoli z toho prodlouží,
 * rozbije se rozpočet SMS — hlídá to `scripts/check-invite-links.ts`.
 *
 * POZOR na root catch-all: `[token]` chytá KAŽDÝ jednosegmentový path, který
 * nemá vlastní statickou routu. Next.js dává statickým segmentům přednost, ale
 * kdyby někdo založil top-level routu o 16 znacích base64url (dnes je nejblíž
 * `aktivovat-email` s 15), catch-all by ji tiše přebil. Výčet všech cest proti
 * formátu tokenu proto hlídá check.
 *
 * Čtyři pravidla, na kterých modul stojí:
 *
 *   1. SERVEROVÝ modul — sahá na pepper i service-role klienta a nesmí se
 *      dostat do klientského bundlu (stejná ruční pojistka jako v
 *      `lib/healing-credit.ts`).
 *   2. PLAINTEXT NIKDY NEOPUSTÍ ODPOVĚĎ. V databázi leží jen HMAC-SHA256
 *      s peppertem `BAR_AUTH_PEPPER` (`hashSecret`) — stejný postup jako
 *      u PINů a e-mailových tokenů. Token se nikdy neloguje, ani při chybě.
 *   3. HASHUJE SE SAMOTNÝ TOKEN, ne „telefon:token". Ověření zná z URL jen
 *      token, telefon by nemělo z čeho vzít; vazba na číslo se drží sloupcem
 *      `phone` v témže řádku a čte se až PO shodě hashe.
 *   4. ŽÁDNÉ ORÁKULUM. Neplatný, prošlý i revokovaný token vrací tentýž
 *      výsledek jako token neexistující. Volající z toho nesmí poznat,
 *      jestli odkaz někdy existoval.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/invite-links.ts sahá na pepper a service-role klienta — nesmí do klientského bundlu.",
  );
}

import { randomBytes, timingSafeEqual } from "node:crypto";

import { normalizeCzechPhone } from "./phone-auth";
import { hashIp, hashSecret } from "./phone-auth-server";
import { createAdminClient } from "./supabase/admin";

/** Jak dlouho pozvánka platí. Festival + příprava + doprodej se vejdou. */
export const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Okno a strop rate limitu na IP (vzor `phone_auth_challenges`). */
export const INVITE_RATE_WINDOW_MS = 15 * 60 * 1000;
export const INVITE_RATE_MAX = 20;

/**
 * Kolik bajtů entropie má token. 12 B = 96 bitů → přesně 16 znaků base64url
 * (12 je dělitelné třemi, takže žádný padding).
 *
 * Proč 96 bitů stačí: odkaz platí 30 dní, `/i/<token>` je rate-limitovaný na IP
 * a doručuje se jednorázově SMS. Uhodnout jeden z 2^96 tokenů přes limitovaný
 * HTTP endpoint není reálné. Delší token by v SMS jen ujídal segment.
 */
const TOKEN_BYTES = 12;

/**
 * PŘESNÁ délka raženého tokenu ve znacích base64url.
 *
 * ODVOZENÁ z `TOKEN_BYTES`, ne napsaná ručně — dvě nezávislá čísla by se dřív
 * nebo později rozešla a validace by přestala pouštět čerstvě ražené tokeny
 * (nebo naopak). Pro base64url bez paddingu platí `ceil(bajty * 4 / 3)`,
 * pro 12 B tedy přesně 16 znaků. Že to sedí, ověřuje `check-invite-links.ts`
 * na skutečně vyrobených tokenech.
 */
export const TOKEN_LENGTH = Math.ceil((TOKEN_BYTES * 4) / 3);

/** Strop délky celé adresy, aby se zvací SMS vešla do jednoho segmentu. */
export const MAX_DELKA_URL = 45;

/** Povolená abeceda base64url — nic jiného se do URL nedostane. */
const TOKEN_TVAR = /^[A-Za-z0-9_-]+$/;

/** Nový token pozvánky — kryptografické RNG, URL-safe abeceda. */
export function novyInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Hash tokenu do databáze. HMAC-SHA256 s `BAR_AUTH_PEPPER` — únik databáze
 * sám o sobě nestačí, bez pepperu z hashe token nikdo neodvodí.
 */
export function hashInviteToken(token: string): string {
  return hashSecret("invite:v1", token);
}

/**
 * Má token vůbec tvar, se kterým má smysl chodit do databáze?
 *
 * Délka se porovnává na PŘESNOU shodu, ne na spodní hranici. S `>=` propadlo
 * do „to je token" cokoli delšího z povolené abecedy — a protože tahle funkce
 * rozhoduje mezi 404 a přihlášením, poslal třeba překlep
 * `/tohle-fakt-neexistuje-vubec-nikde` (33 znaků) člověka na přihlášení místo
 * na 404. Bezpečnostní díra to nebyla (žádné orákulum, všechny neplatné tokeny
 * reagují stejně), ale 404 stránku to appce ubíralo. Ražené tokeny mají vždy
 * `TOKEN_LENGTH` znaků, takže volnější podmínka nikdy k ničemu nebyla.
 */
export function jePouzitelnyTvarTokenu(token: string): boolean {
  return token.length === TOKEN_LENGTH && TOKEN_TVAR.test(token);
}

export type VytvorenaPozvanka = { url: string; expiresAt: string };

/**
 * Založí pozvánku pro dané číslo a vrátí ADRESU s plaintext tokenem.
 *
 * Opakované volání pro stejné číslo vyrábí NOVÝ token a starý nechává platný
 * (host mohl dostat víc SMS a kliknout na kteroukoli). Zneplatnění řeší
 * `revoked_at`, na které zatím není UI.
 *
 * @param baseUrl veřejná adresa appky bez lomítka na konci
 */
export async function vytvoritPozvanku(
  rawPhone: string,
  baseUrl: string,
): Promise<VytvorenaPozvanka | null> {
  const phone = normalizeCzechPhone(rawPhone);
  const token = novyInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const admin = createAdminClient();
  const zapis = await admin
    .from("invite_links")
    .insert({ phone, token_hash: hashInviteToken(token), expires_at: expiresAt })
    .select("id")
    .single();
  // Detail chyby jde do logu, token NIKDY — ani sem, ani do odpovědi.
  if (zapis.error || !zapis.data) {
    console.error("[invite] pozvánku se nepodařilo uložit:", zapis.error?.message);
    return null;
  }

  return { url: `${baseUrl}/${token}`, expiresAt };
}

/**
 * Rate limit na IP. Fail-closed: když se počet pokusů nepodaří zjistit,
 * request se odmítne (nezjištěný stav není důvod pustit útočníka dál).
 *
 * Vrací `true`, když se smí pokračovat.
 */
export async function zapsatPokusAOveritLimit(rawIp: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const ipHash = hashIp(rawIp);
    const oknoOd = new Date(Date.now() - INVITE_RATE_WINDOW_MS).toISOString();

    const pocet = await admin
      .from("invite_link_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oknoOd);
    if (pocet.error) return false;
    if ((pocet.count ?? 0) >= INVITE_RATE_MAX) return false;

    const zapis = await admin.from("invite_link_attempts").insert({ ip_hash: ipHash });
    if (zapis.error) return false;
    return true;
  } catch (e) {
    console.warn("[invite] rate limit se nepodařilo vyhodnotit:", e);
    return false;
  }
}

/**
 * Ověří token a vrátí telefon, kterému pozvánka patří.
 *
 * `null` znamená „nepustíme dál" a je NEROZLIŠITELNÉ pro všechny důvody:
 * špatný tvar, neexistující token, prošlá platnost i revokace. Volající na to
 * musí reagovat vždycky stejně.
 */
export async function telefonZPozvanky(token: string): Promise<string | null> {
  if (!jePouzitelnyTvarTokenu(token)) return null;

  try {
    const admin = createAdminClient();
    const ocekavany = hashInviteToken(token);
    const radek = await admin
      .from("invite_links")
      .select("id, phone, token_hash, expires_at, revoked_at")
      .eq("token_hash", ocekavany)
      .maybeSingle();
    if (radek.error || !radek.data) return null;

    // Vyhledání proběhlo rovností v databázi, takže samo o sobě nic neprozradí.
    // Porovnání v konstantním čase je pojistka pro případ, že by se sem někdy
    // dostal řádek jinou cestou (např. přes `phone` nebo `id`).
    const ulozeny = Buffer.from(radek.data.token_hash);
    const kandidat = Buffer.from(ocekavany);
    if (ulozeny.length !== kandidat.length) return null;
    if (!timingSafeEqual(ulozeny, kandidat)) return null;

    if (radek.data.revoked_at !== null) return null;
    if (Date.parse(radek.data.expires_at) <= Date.now()) return null;

    await admin
      .from("invite_links")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", radek.data.id);

    return radek.data.phone;
  } catch (e) {
    // Ani tady se token nesmí objevit — jen holá informace, že to selhalo.
    console.warn("[invite] pozvánku se nepodařilo ověřit:", e);
    return null;
  }
}
