"use server";

import {
  ESHOP_URL,
  KUPON_PODMINKY,
  KUPON_PODMINKY_FALLBACK,
  SLEVA_PROCENT,
  kodKuponu,
  najitBavice,
  najitProdukt,
  type Bavic,
  type KvizProdukt,
} from "@/lib/kviz";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server action kvízu bavičů fronty.
 *
 * POZOR: endpoint je VEŘEJNÝ a bez session (návštěvník festivalu nic
 * nepřihlašuje). Všechno se proto validuje tady a název produktu i kód kupónu
 * se berou ze statického katalogu — klientu se nevěří nic než dva slugy.
 */

export type VysledekKuponu =
  | {
      stav: "ok";
      kod: string;
      produkt: string;
      emoji: string;
      email: string;
      /** Nepodařilo-li se odeslat e-mail, návštěvník si kód opíše z obrazovky. */
      emailOdeslan: boolean;
      /** Podmínky se liší podle toho, zda vznikl personalizovaný kupón. */
      podminky: string;
    }
  | { stav: "chyba"; zprava: string };

/** Stejný e-mail u stejného baviče smí projít jednou za tolik minut. */
const LIMIT_MINUT = 10;

const ODESILATEL = "Longevity Bar <bar@updates.wildandcoco.com>";
const RESEND_URL = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 8000;

/** Kam jde upozornění, že osobní kupón nevznikl. */
const NOTIFIKACE_KOMU = "atrey@wildandcoco.com";
/** Kratší než u kupónového e-mailu — notifikace nesmí zdržet odpověď hostovi. */
const NOTIFIKACE_TIMEOUT_MS = 4000;

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function chyba(zprava: string): VysledekKuponu {
  return { stav: "chyba", zprava };
}

/** 9 číslic bez předvolby = české číslo (stejné pravidlo jako v `app/actions.ts`). */
function normalizovatTelefon(vstup: string): string | null {
  const cislice = vstup.replace(/[\s()./-]/g, "");
  if (!/^\+?\d{9,15}$/.test(cislice)) return null;
  if (cislice.startsWith("+")) return cislice;
  return cislice.length === 9 ? `+420${cislice}` : `+${cislice}`;
}

export async function odeslatKvizLead(
  _predchozi: VysledekKuponu | null,
  formData: FormData,
): Promise<VysledekKuponu> {
  /* --- Validace ---------------------------------------------------------- */
  const bavic = najitBavice(text(formData, "bavic"));
  const produkt = najitProdukt(text(formData, "produkt"));
  if (!bavic || !produkt) {
    return chyba("Něco se rozbilo. Načti prosím QR kód znovu.");
  }

  const jmeno = text(formData, "jmeno").slice(0, 80);
  if (jmeno.length < 2) return chyba("Napiš nám prosím svoje křestní jméno.");

  const email = text(formData, "email").toLowerCase().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return chyba("Zkontroluj prosím e-mail — kupón ti na něj pošleme.");
  }

  const telefon = normalizovatTelefon(text(formData, "telefon"));
  if (!telefon) return chyba("Telefon nám nesedí. Zkus ho zadat znovu.");

  // Kód se skládá ze slugů znovu ověřených proti katalogu (allowlist).
  const sdilenyKod = kodKuponu(bavic.slug, produkt.slug);
  if (!sdilenyKod) return chyba("Něco se rozbilo. Načti prosím QR kód znovu.");

  // Personalizovaný kupón vázaný na e-mail (Atrey 3. 8.): do 31. 12. 2026,
  // bez limitu počtu objednávek. Když API e-shopu neodpoví, spadneme na
  // sdílený předgenerovaný kód (přísnější podmínky, ale funguje) a pošleme
  // o tom notifikaci — tichý fallback by se na festivalu nikdy nezjistil.
  const osobni = await vytvoritOsobniKupon({ bavic, produkt, email, sdilenyKod });
  const duvodFallbacku = "chyba" in osobni ? osobni.chyba : null;
  const kod = "kod" in osobni ? osobni.kod : sdilenyKod;
  const podminky = duvodFallbacku ? KUPON_PODMINKY_FALLBACK : KUPON_PODMINKY;

  /* --- Rate-limit + zápis leadu ------------------------------------------ */
  // Vše kolem databáze je v try/catch: výjimka ze server action by vyhodila
  // error boundary a návštěvník by přišel o celý kvíz.
  try {
    const admin = createAdminClient();

    const od = new Date(Date.now() - LIMIT_MINUT * 60_000).toISOString();
    const { data: nedavne, error: chybaLimitu } = await admin
      .from("quiz_leads")
      .select("id")
      .eq("email", email)
      .eq("bavic", bavic.kod)
      .gte("created_at", od)
      .limit(1);

    if (chybaLimitu) {
      // Nepouštíme návštěvníka k ledu kvůli našemu výpadku — jen to hlasitě logujeme.
      console.warn("[kviz] rate-limit dotaz selhal:", chybaLimitu.message);
    } else if (nedavne && nedavne.length > 0) {
      return chyba(
        "Kupón už jsme ti před chvílí poslali — mrkni do e-mailu, i do spamu.",
      );
    }

    const { error: chybaZapisu } = await admin.from("quiz_leads").insert({
      bavic: bavic.kod,
      product_slug: produkt.slug,
      product_name: produkt.nazev,
      coupon_code: kod,
      first_name: jmeno,
      email,
      phone: telefon,
    });

    if (chybaZapisu) {
      console.error("[kviz] zápis leadu selhal:", chybaZapisu.message);
      return chyba("Nepodařilo se to uložit. Zkus to prosím ještě jednou.");
    }
  } catch (e) {
    console.error("[kviz] databáze není dostupná:", e);
    return chyba("Nepodařilo se to uložit. Zkus to prosím ještě jednou.");
  }

  /* --- E-maily (best-effort) --------------------------------------------- */
  // Paralelně, ať notifikace o fallbacku nepřidá návštěvníkovi ani vteřinu.
  // Obě funkce si chyby řeší samy a nikdy nevyhodí výjimku.
  const [emailOdeslan] = await Promise.all([
    poslatKupon({ email, jmeno, kod, produkt, podminky }),
    duvodFallbacku
      ? oznamitFallback({
          bavic,
          produkt,
          jmeno,
          email,
          telefon,
          sdilenyKod,
          duvod: duvodFallbacku,
        })
      : Promise.resolve(),
  ]);

  return {
    stav: "ok",
    kod,
    produkt: produkt.nazev,
    emoji: produkt.emoji,
    email,
    emailOdeslan,
    podminky,
  };
}

/* -------------------------------------------------------------------------- */
/* Personalizovaný kupón přes CloudSailor care-api                             */
/* -------------------------------------------------------------------------- */

const CARE_API_URL = "https://www.wildandcoco.com/care-api/v1/coupons";
const CARE_API_TIMEOUT_MS = 8000;

/** Výsledek pokusu o osobní kupón — buď kód, nebo lidsky čitelný důvod selhání. */
type VysledekOsobnihoKuponu = { kod: string } | { chyba: string };

/**
 * Založí v e-shopu kupón vázaný na e-mail návštěvníka.
 *
 * NIKDY nevyhodí výjimku — při jakémkoli selhání vrací `{ chyba }` s krátkým
 * důvodem, který jde rovnou do notifikačního e-mailu. Volající pak pokračuje
 * se sdíleným kódem.
 */
async function vytvoritOsobniKupon({
  bavic,
  produkt,
  email,
  sdilenyKod,
}: {
  bavic: Bavic;
  produkt: KvizProdukt;
  email: string;
  sdilenyKod: string;
}): Promise<VysledekOsobnihoKuponu> {
  const user = process.env.CS_CARE_USER;
  const password = process.env.CS_CARE_PASSWORD;
  if (!user || !password) {
    console.warn("[kviz] CS_CARE_USER/PASSWORD chybí — jede sdílený kupón.");
    return { chyba: "chybí CS_CARE_USER/CS_CARE_PASSWORD" };
  }

  try {
    // Náhodný suffix odliší personalizované kódy od sdílených a mezi sebou.
    const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => "ABCDEFGHJKMNPQRSTVWXYZ23456789"[b % 30])
      .join("");
    const kod = `${sdilenyKod}-${suffix}`;
    const dnes = new Date().toISOString().slice(0, 10);

    const odpoved = await fetch(CARE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: kod,
        name: `Healing kvíz ${SLEVA_PROCENT} % — ${produkt.nazev} (${bavic.kod}, osobní)`,
        discountType: "eachProduct",
        priceSource: "price",
        discountRate: SLEVA_PROCENT,
        dependentProductCode: produkt.kod,
        couponGroupCode: "HEALING-DYNAMIC",
        // Vázaný na e-mail z formuláře; počet použití neomezen (Atrey 3. 8.).
        dependentEmail: email,
        minOrderTotalPrice: 500,
        validFrom: dnes,
        validTo: "2026-12-31",
        visibility: true,
        internalDescription: `Kvíz bavičů Healing 2026 · ${bavic.kod} ${bavic.jmeno} · personalizovaný pro lead`,
      }),
      signal: AbortSignal.timeout(CARE_API_TIMEOUT_MS),
    });

    if (!odpoved.ok) {
      const detail = await odpoved.text().catch(() => "");
      const chyba = `HTTP ${odpoved.status}: ${detail.slice(0, 200)}`;
      console.warn("[kviz] care-api odmítl kupón:", chyba);
      return { chyba };
    }
    const data = (await odpoved.json()) as { code?: string };
    return { kod: typeof data.code === "string" ? data.code : kod };
  } catch (e) {
    const chyba = popisChyby(e, CARE_API_TIMEOUT_MS);
    console.warn("[kviz] care-api nedostupné:", chyba);
    return { chyba };
  }
}

/** `AbortSignal.timeout` hází DOMException `TimeoutError` — přeložíme do češtiny. */
function popisChyby(e: unknown, timeoutMs: number): string {
  if (e instanceof Error) {
    if (e.name === "TimeoutError") return `timeout po ${timeoutMs / 1000} s`;
    return e.message || e.name;
  }
  return String(e);
}

/* -------------------------------------------------------------------------- */
/* E-mail přes Resend                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Pošle kupón e-mailem. Selhání NIKDY neshodí flow — kód už je uložený
 * a návštěvník ho vidí na obrazovce. Chyby jen logujeme.
 */
async function poslatKupon({
  email,
  jmeno,
  kod,
  produkt,
  podminky,
}: {
  email: string;
  jmeno: string;
  kod: string;
  produkt: KvizProdukt;
  podminky: string;
}): Promise<boolean> {
  const klic = process.env.RESEND_API_KEY;
  if (!klic) {
    console.warn("[kviz] RESEND_API_KEY chybí — kupón se posílá jen na obrazovku.");
    return false;
  }

  try {
    const odpoved = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${klic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ODESILATEL,
        to: [email],
        subject: `Tvůj kupón ${SLEVA_PROCENT} % na ${produkt.nazev}`,
        html: teloHtml({ jmeno, kod, produkt, podminky }),
        text: teloText({ jmeno, kod, produkt, podminky }),
      }),
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    });

    if (!odpoved.ok) {
      const detail = await odpoved.text().catch(() => "");
      console.warn("[kviz] Resend odmítl e-mail:", odpoved.status, detail);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[kviz] odeslání e-mailu selhalo:", e);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Notifikace o fallbacku na sdílený kupón                                     */
/* -------------------------------------------------------------------------- */

/**
 * Upozorní nás, že osobní kupón nevznikl a host dostal sdílený kód.
 *
 * Čistě best-effort: nikdy nevyhodí výjimku a nikdy nemění výsledek pro hosta.
 * Běží paralelně s kupónovým e-mailem a s vlastním kratším timeoutem, aby
 * serverless funkci neprotáhla přes limit.
 */
async function oznamitFallback({
  bavic,
  produkt,
  jmeno,
  email,
  telefon,
  sdilenyKod,
  duvod,
}: {
  bavic: Bavic;
  produkt: KvizProdukt;
  jmeno: string;
  email: string;
  telefon: string;
  sdilenyKod: string;
  duvod: string;
}): Promise<void> {
  const klic = process.env.RESEND_API_KEY;
  if (!klic) {
    console.warn("[kviz] RESEND_API_KEY chybí — notifikaci o fallbacku neposíláme.");
    return;
  }

  const cas = new Date().toLocaleString("cs-CZ", {
    timeZone: "Europe/Prague",
    dateStyle: "short",
    timeStyle: "medium",
  });

  const telo = [
    "Osobní kupón se nepodařilo založit — host dostal SDÍLENÝ kód.",
    "",
    `Bavič:   ${bavic.kod} — ${bavic.jmeno}`,
    `Produkt: ${produkt.nazev} (slug ${produkt.slug}, CS kód ${produkt.kod})`,
    `Lead:    ${jmeno} · ${email} · ${telefon}`,
    `Kód:     ${sdilenyKod}`,
    `Důvod:   ${duvod}`,
    `Čas:     ${cas} (Europe/Prague)`,
    "",
    `Sdílený kupón má přísnější podmínky: ${KUPON_PODMINKY_FALLBACK}`,
  ].join("\n");

  try {
    const odpoved = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${klic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ODESILATEL,
        to: [NOTIFIKACE_KOMU],
        subject: `⚠️ Kvíz: fallback na sdílený kupón (${bavic.kod})`,
        text: telo,
      }),
      signal: AbortSignal.timeout(NOTIFIKACE_TIMEOUT_MS),
    });

    if (!odpoved.ok) {
      const detail = await odpoved.text().catch(() => "");
      console.warn(
        "[kviz] Resend odmítl notifikaci o fallbacku:",
        odpoved.status,
        detail.slice(0, 200),
      );
    }
  } catch (e) {
    console.warn(
      "[kviz] notifikaci o fallbacku se nepodařilo odeslat:",
      popisChyby(e, NOTIFIKACE_TIMEOUT_MS),
    );
  }
}

function teloText({
  jmeno,
  kod,
  produkt,
  podminky,
}: {
  jmeno: string;
  kod: string;
  produkt: KvizProdukt;
  podminky: string;
}): string {
  return [
    `Ahoj ${jmeno},`,
    "",
    `tady je tvůj kupón na ${SLEVA_PROCENT} % slevy na ${produkt.nazev}:`,
    "",
    kod,
    "",
    `Kód vlož v košíku na ${ESHOP_URL}.`,
    podminky,
    "",
    "Ať ti chutná!",
    "Wild & Coco · Longevity Bar",
  ].join("\n");
}

function teloHtml({
  jmeno,
  kod,
  produkt,
  podminky,
}: {
  jmeno: string;
  kod: string;
  produkt: KvizProdukt;
  podminky: string;
}): string {
  return `<!doctype html>
<html lang="cs">
  <body style="margin:0;padding:24px;background:#042b29;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0b201d;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fffaf0;border-radius:24px;padding:28px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:15px;">Ahoj ${escapovat(jmeno)},</p>
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;">Tvůj kupón na ${SLEVA_PROCENT} % 👑</h1>
        <p style="margin:0 0 20px;font-size:16px;">
          Platí na <strong>${produkt.emoji} ${escapovat(produkt.nazev)}</strong>.
        </p>
        <div style="background:#ffc247;border-radius:16px;padding:18px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Kód kupónu</p>
          <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:1px;">${kod}</p>
        </div>
        <p style="margin:20px 0;text-align:center;">
          <a href="${ESHOP_URL}" style="display:inline-block;background:#ff6b35;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:14px;">
            Nakoupit na wildandcoco.com
          </a>
        </p>
        <p style="margin:0 0 4px;font-size:13px;color:#0b201d;opacity:.7;">
          Kód vlož v košíku na <a href="${ESHOP_URL}" style="color:#0e8781;">${ESHOP_URL.replace("https://", "")}</a>.
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#0b201d;opacity:.7;">${podminky}</p>
        <p style="margin:0;font-size:13px;color:#0b201d;opacity:.6;">Wild &amp; Coco · Longevity Bar</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Jméno i název produktu jdou do HTML — pro jistotu escapujeme. */
function escapovat(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
