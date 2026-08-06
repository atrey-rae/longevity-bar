/**
 * Kontrola dvojjazyčnosti Bar.app (čeština + angličtina).
 *
 * Hlídá pět věcí, na kterých překlad stojí:
 *   1. PARITA — každý klíč z `cs` existuje i v `en`, se stejným typem, stejnou
 *      délkou polí a bez klíčů navíc na anglické straně,
 *   2. NEPRÁZDNOST — žádný řetězec (ani výsledek funkce slovníku) není prázdný,
 *   3. ZAKÁZANÁ SLOVA — texty kvízu a katalogů neobsahují zdravotní tvrzení,
 *      a to v OBOU jazycích. Skenuje se stejný rozsah textů jako v češtině
 *      (`check-kviz-profil.ts`, `check-longevity-catalog.ts`), aby se pravidla
 *      mezi jazyky nerozešla,
 *   4. ČESKÁ ZNĚNÍ — schválené konstanty (`lib/darek.ts`, `lib/kviz.ts`,
 *      `lib/loyalty.ts`) jsou ve slovníku PŘEVZATÉ, ne opsané. Slovník tedy
 *      nemůže tiše přepsat text schválený Atreyem,
 *   5. MECHANISMUS — detekce jazyka nesahá do `src/middleware.ts`, přepínač je
 *      v hlavičce a cookie `lang` se čte na serveru.
 *
 * Spuštění: `npx tsx scripts/check-i18n.ts`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  DAREK_KVIZ_ODKAZ_TEXT,
  DAREK_NADPIS,
  DAREK_OSOBNI_QR_TITULEK,
  DAREK_PODTEXT,
  DAREK_PRIHLASENI_VYZVA,
} from "../src/lib/darek";
import { cs } from "../src/lib/i18n/cs";
import { en } from "../src/lib/i18n/en";
import {
  DEFAULT_LANG,
  LANGS,
  LANG_COOKIE,
  langFromAcceptLanguage,
  normalizeLang,
  resolveLang,
} from "../src/lib/i18n/lang";
import {
  HOOK,
  KATEGORIE_LABEL,
  KUPON_PODMINKY,
  KUPON_PODMINKY_FALLBACK,
  OBLIBENY_TEXT,
  OTAZKA_1,
  OTAZKA_1_TEXT,
  OTAZKA_2,
  OTAZKA_2_TEXT,
  OTAZKA_3,
  OTAZKA_3_TEXT,
} from "../src/lib/kviz";
import { PROFILY, PROFIL_DISCLAIMER, PROFIL_HOOK, PROFIL_OTAZKY } from "../src/lib/kviz-profil";
import {
  PERSONY,
  POSTREHY_TEXTY,
  VYHODNOCENI_TEXTY,
} from "../src/lib/kviz-profil-vyhodnoceni";
import { CATEGORY_LABEL, CATEGORY_LABEL_LONG } from "../src/lib/loyalty";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (cesta: string) => readFileSync(`${root}/${cesta}`, "utf8");

const chyby: string[] = [];
let kontrol = 0;

function overit(popis: string, podminka: boolean): void {
  kontrol += 1;
  if (!podminka) chyby.push(popis);
}

/* ========================================================================== */
/* 1) + 2) Parita a neprázdnost                                               */
/* ========================================================================== */

/** Argumenty pro zavolání funkce slovníku — číslo i řetězec, ať projde obojí. */
const VZORKY: unknown[] = [2, "X"];

function typNazev(hodnota: unknown): string {
  if (Array.isArray(hodnota)) return "array";
  if (hodnota === null) return "null";
  return typeof hodnota;
}

let klicu = 0;

function porovnat(ceska: unknown, anglicka: unknown, cesta: string): void {
  const typCs = typNazev(ceska);
  const typEn = typNazev(anglicka);

  if (typCs !== typEn) {
    chyby.push(`${cesta}: typ cs=${typCs}, en=${typEn}`);
    return;
  }

  if (typCs === "string") {
    klicu += 1;
    if ((ceska as string).trim().length === 0) chyby.push(`${cesta}: prázdný cs text`);
    if ((anglicka as string).trim().length === 0) chyby.push(`${cesta}: prázdný en text`);
    return;
  }

  // `null` je platná hodnota jediného volitelného pole slovníku — formátu
  // položky katalogu („beze slova, vezmi ho ze zdroje“). Shoda typů výš už
  // ohlídala, že se null nesejde se stringem jen v jednom jazyce.
  if (typCs === "null") {
    klicu += 1;
    return;
  }

  if (typCs === "function") {
    klicu += 1;
    const arita = Math.max(1, (ceska as (...a: unknown[]) => unknown).length);
    for (const vzorek of VZORKY) {
      const argumenty = new Array(arita).fill(vzorek);
      for (const [jazyk, fn] of [
        ["cs", ceska],
        ["en", anglicka],
      ] as const) {
        try {
          const vysledek = (fn as (...a: unknown[]) => unknown)(...argumenty);
          if (typeof vysledek !== "string" || vysledek.trim().length === 0) {
            chyby.push(`${cesta}: ${jazyk}(${String(vzorek)}) nevrátil neprázdný text`);
          }
        } catch (e) {
          chyby.push(`${cesta}: ${jazyk}(${String(vzorek)}) vyhodil ${String(e)}`);
        }
      }
    }
    return;
  }

  if (typCs === "array") {
    const a = ceska as unknown[];
    const b = anglicka as unknown[];
    if (a.length !== b.length) {
      chyby.push(`${cesta}: pole má cs ${a.length}, en ${b.length} položek`);
      return;
    }
    a.forEach((polozka, i) => porovnat(polozka, b[i], `${cesta}[${i}]`));
    return;
  }

  if (typCs === "object") {
    const a = ceska as Record<string, unknown>;
    const b = anglicka as Record<string, unknown>;
    for (const klic of Object.keys(a)) {
      if (!(klic in b)) {
        chyby.push(`${cesta}.${klic}: chybí v en`);
        continue;
      }
      porovnat(a[klic], b[klic], `${cesta}.${klic}`);
    }
    for (const klic of Object.keys(b)) {
      if (!(klic in a)) chyby.push(`${cesta}.${klic}: klíč navíc v en`);
    }
    return;
  }

  chyby.push(`${cesta}: nepodporovaný typ ${typCs}`);
}

porovnat(cs, en, "");
kontrol += klicu;

/* ========================================================================== */
/* 3) Zakázaná slova — stejný rozsah textů v obou jazycích                    */
/* ========================================================================== */

/**
 * Rozsah skenu je ZÁMĚRNĚ užší než celý slovník: „Healing Festival“ je vlastní
 * jméno akce a v angličtině obsahuje `heal`. Skenují se proto jen texty, které
 * mluví o produktu nebo o zdraví hosta — přesně tam, kde tvrzení vzniká.
 * Odpovídá to rozsahu, jaký hlídají `check-kviz-profil.ts` (vyhodnocení kvízu)
 * a `check-longevity-catalog.ts` (popisy produktů).
 */
const SKENOVANE_CESTY = [
  "kviz.q1",
  "kviz.q2",
  "kviz.q3",
  "kviz.podminky",
  "kviz.podminkyFallback",
  "kviz.souhlas",
  "kviz.kategorie",
  "kvizProfil.otazky",
  "kvizProfil.moznosti",
  "kvizProfil.profily",
  "kvizProfil.vyhodnoceni",
  "kvizProfil.persony",
  "kvizProfil.postrehy",
  "kvizProfil.disclaimer",
  "sortiment.longevity.polozky",
  "sortiment.wildCoco.polozky",
] as const;

/**
 * Zdravotní tvrzení, která se do textů kvízu a katalogů nesmí dostat.
 * Porovnává se na malých písmenech a na kmeni slova.
 *
 * Anglická sada je překlad té české z `check-kviz-profil.ts`. Pozor na zrádné
 * podřetězce: `heal` chytí i „healthy“ a „healing“, `cure` i „secure“ — to je
 * záměr, ne chyba. V textech píšeme „fermented“, „live cultures“, „microbiome“.
 */
const ZAKAZANA: Record<string, string[]> = {
  cs: ["léčí", "vyléčí", "nemoc", "diagnóz", "alergi", "intoleranc", "probiotik"],
  en: ["cure", "heal", "disease", "diagnos", "allerg", "intoleran", "probiotic"],
};

/** Marketingové fráze na hraně tvrzení (mirror `check-longevity-catalog.ts`). */
const RIZIKOVE_FRAZE: Record<string, string[]> = {
  cs: [
    "podporuje imunitu",
    "podporuje mikrobiom",
    "pro zdravá střeva",
    "uklidňuje",
    "detox",
  ],
  en: [
    "supports immunity",
    "supports the microbiome",
    "for a healthy gut",
    "soothes",
    "detox",
  ],
};

function vyzvednout(slovnik: unknown, cesta: string): unknown {
  return cesta
    .split(".")
    .reduce<unknown>(
      (uzel, klic) =>
        uzel && typeof uzel === "object"
          ? (uzel as Record<string, unknown>)[klic]
          : undefined,
      slovnik,
    );
}

function sesbirat(uzel: unknown, cesta: string): [string, string][] {
  if (typeof uzel === "string") return [[cesta, uzel]];
  if (Array.isArray(uzel)) {
    return uzel.flatMap((v, i) => sesbirat(v, `${cesta}[${i}]`));
  }
  if (uzel && typeof uzel === "object") {
    return Object.entries(uzel as Record<string, unknown>).flatMap(([k, v]) =>
      sesbirat(v, `${cesta}.${k}`),
    );
  }
  return [];
}

for (const [jazyk, slovnik] of [
  ["cs", cs],
  ["en", en],
] as const) {
  const texty = SKENOVANE_CESTY.flatMap((cesta) => {
    const uzel = vyzvednout(slovnik, cesta);
    if (uzel === undefined) {
      chyby.push(`sken: cesta ${cesta} ve slovníku ${jazyk} neexistuje`);
      return [];
    }
    return sesbirat(uzel, cesta);
  });

  overit(`${jazyk}: sken našel nějaké texty`, texty.length > 0);

  for (const [cesta, text] of texty) {
    const male = text.toLowerCase();
    for (const slovo of ZAKAZANA[jazyk]) {
      if (male.includes(slovo)) {
        chyby.push(`${jazyk} ${cesta}: zdravotní tvrzení „${slovo}" — ${text.slice(0, 70)}`);
      }
    }
    for (const fraze of RIZIKOVE_FRAZE[jazyk]) {
      if (male.includes(fraze)) {
        chyby.push(`${jazyk} ${cesta}: riziková fráze „${fraze}"`);
      }
    }
  }
  kontrol += texty.length;
}

/* ========================================================================== */
/* 4) Česká znění se slovníkem nesmí změnit                                   */
/* ========================================================================== */

const PREVZATE: [string, string, string][] = [
  ["darek.nadpis", cs.darek.nadpis, DAREK_NADPIS],
  ["darek.podtext", cs.darek.podtext, DAREK_PODTEXT],
  ["darek.osobniQrTitulek", cs.darek.osobniQrTitulek, DAREK_OSOBNI_QR_TITULEK],
  ["darek.prihlaseniVyzva", cs.darek.prihlaseniVyzva, DAREK_PRIHLASENI_VYZVA],
  ["darek.odkazText", cs.darek.odkazText, DAREK_KVIZ_ODKAZ_TEXT],
  ["kviz.hook", cs.kviz.hook, HOOK],
  ["kviz.oblibeny", cs.kviz.oblibeny, OBLIBENY_TEXT],
  ["kviz.q1.text", cs.kviz.q1.text, OTAZKA_1_TEXT],
  ["kviz.q2.text", cs.kviz.q2.text, OTAZKA_2_TEXT],
  ["kviz.q3.text", cs.kviz.q3.text, OTAZKA_3_TEXT],
  ["kviz.podminky", cs.kviz.podminky, KUPON_PODMINKY],
  ["kviz.podminkyFallback", cs.kviz.podminkyFallback, KUPON_PODMINKY_FALLBACK],
  ["kvizProfil.hook", cs.kvizProfil.hook, PROFIL_HOOK],
  ["kvizProfil.disclaimer", cs.kvizProfil.disclaimer, PROFIL_DISCLAIMER],
];

for (const [popis, ve_slovniku, v_konstante] of PREVZATE) {
  overit(
    `${popis}: slovník musí přebírat schválenou konstantu (má „${ve_slovniku.slice(0, 40)}…")`,
    ve_slovniku === v_konstante,
  );
}

for (const moznost of OTAZKA_1) {
  overit(
    `kviz.q1.moznosti.${moznost.hodnota} odpovídá katalogu odpovědí`,
    cs.kviz.q1.moznosti[moznost.hodnota] === moznost.text,
  );
}
for (const moznost of OTAZKA_2) {
  overit(
    `kviz.q2.moznosti.${moznost.hodnota} odpovídá katalogu odpovědí`,
    cs.kviz.q2.moznosti[moznost.hodnota] === moznost.text,
  );
}
for (const moznost of OTAZKA_3) {
  overit(
    `kviz.q3.moznosti.${moznost.hodnota} odpovídá katalogu odpovědí`,
    cs.kviz.q3.moznosti[moznost.hodnota] === moznost.text,
  );
}

overit(
  "kviz.kategorie přebírá KATEGORIE_LABEL",
  JSON.stringify(cs.kviz.kategorie) === JSON.stringify(KATEGORIE_LABEL),
);
overit(
  "vernost.kategorie přebírá CATEGORY_LABEL",
  JSON.stringify(cs.vernost.kategorie) === JSON.stringify(CATEGORY_LABEL),
);
overit(
  "vernost.kategorieDlouhe přebírá CATEGORY_LABEL_LONG",
  JSON.stringify(cs.vernost.kategorieDlouhe) === JSON.stringify(CATEGORY_LABEL_LONG),
);
overit(
  "kvizProfil.vyhodnoceni přebírá VYHODNOCENI_TEXTY",
  JSON.stringify(cs.kvizProfil.vyhodnoceni) === JSON.stringify(VYHODNOCENI_TEXTY),
);
overit(
  "kvizProfil.postrehy přebírá POSTREHY_TEXTY",
  JSON.stringify(cs.kvizProfil.postrehy) === JSON.stringify(POSTREHY_TEXTY),
);

overit(
  "kvizProfil.otazky odpovídá PROFIL_OTAZKY",
  cs.kvizProfil.otazky.join("|") === PROFIL_OTAZKY.map((o) => o.text).join("|"),
);
overit(
  "kvizProfil.moznosti odpovídá PROFIL_OTAZKY",
  JSON.stringify(cs.kvizProfil.moznosti) ===
    JSON.stringify(PROFIL_OTAZKY.map((o) => o.moznosti.map((m) => m.text))),
);
for (const profil of PROFILY) {
  overit(
    `kvizProfil.profily.${profil.id} přebírá název profilu`,
    cs.kvizProfil.profily[profil.id] === profil.nazev,
  );
  overit(
    `kvizProfil.profily.${profil.id} má anglický protějšek`,
    typeof en.kvizProfil.profily[profil.id] === "string" &&
      en.kvizProfil.profily[profil.id].trim().length > 0,
  );
}
for (const persona of PERSONY) {
  overit(
    `kvizProfil.persony.${persona.profilId} přebírá českou personu`,
    cs.kvizProfil.persony[persona.profilId]?.persona === persona.persona,
  );
}

/* --- Anglické persony se od českých musí lišit (skutečný překlad) ---------- */
for (const persona of PERSONY) {
  const anglicka = en.kvizProfil.persony[persona.profilId];
  overit(
    `kvizProfil.persony.${persona.profilId}: en je přeložená, ne kopie cs`,
    Boolean(anglicka) && anglicka.pribeh !== persona.pribeh,
  );
}

/* ========================================================================== */
/* 5) Mechanismus detekce a přepínání jazyka                                  */
/* ========================================================================== */

overit("jazyky jsou právě cs a en", LANGS.join(",") === "cs,en");
overit("výchozí jazyk je čeština", DEFAULT_LANG === "cs");
overit("cookie se jmenuje lang", LANG_COOKIE === "lang");

overit("normalizeLang zná cs", normalizeLang("cs") === "cs");
overit("normalizeLang zná EN velkými", normalizeLang("EN") === "en");
overit("normalizeLang odmítne nesmysl", normalizeLang("de") === null);
overit("normalizeLang odmítne objekt", normalizeLang({}) === null);

// Auto-detekce podle jazyka mobilu.
overit("cs-CZ → čeština", langFromAcceptLanguage("cs-CZ,cs;q=0.9,en;q=0.8") === "cs");
overit("sk-SK → čeština", langFromAcceptLanguage("sk-SK,sk;q=0.9") === "cs");
overit("en-US → angličtina", langFromAcceptLanguage("en-US,en;q=0.9") === "en");
overit("de-DE → angličtina", langFromAcceptLanguage("de-DE,de;q=0.9") === "en");
overit("fr → angličtina", langFromAcceptLanguage("fr") === "en");
overit("prázdná hlavička → výchozí", langFromAcceptLanguage("") === DEFAULT_LANG);
overit("chybějící hlavička → výchozí", langFromAcceptLanguage(null) === DEFAULT_LANG);
overit(
  "nižší q u češtiny nepřebije angličtinu",
  langFromAcceptLanguage("en-GB,cs;q=0.2") === "en",
);
overit(
  "cs s vyšším q vyhrává",
  langFromAcceptLanguage("de;q=0.3,cs;q=0.9") === "cs",
);
overit("hvězdička → výchozí", langFromAcceptLanguage("*") === DEFAULT_LANG);
overit(
  "hlavička delší než strop nespadne",
  typeof langFromAcceptLanguage("x".repeat(5000)) === "string",
);

overit("cookie přebíjí hlavičku", resolveLang("en", "cs-CZ") === "en");
overit("rozbitá cookie spadne na hlavičku", resolveLang("klingon", "cs-CZ") === "cs");
overit("bez cookie rozhoduje hlavička", resolveLang(undefined, "de") === "en");

/* --- Zapojení v aplikaci --------------------------------------------------- */
// Middleware vlastní obnova Supabase session; jazyk se do něj NESMÍ vloudit.
// Hlídá se konkrétní zapojení, ne holý podřetězec „lang“ — ten by se dal
// potkat i v nesouvisejícím auth kódu a dělal by falešné poplachy.
const middleware = read("src/middleware.ts");
for (const [popis, vzor] of [
  ["neimportuje slovník", /from\s+["'][^"']*i18n/],
  ["nečte cookie lang", /LANG_COOKIE|cookies\(\)[\s\S]{0,40}["']lang["']|get\(["']lang["']\)/],
  ["nečte Accept-Language", /accept-language/i],
  ["neremapuje URL na jazyk", /\/(cs|en)\//],
] as const) {
  overit(`middleware ${popis}`, !vzor.test(middleware));
}

const layout = read("src/app/layout.tsx");
overit("layout čte jazyk na serveru", /getT\(\)/.test(layout));
overit("layout nastavuje <html lang>", /<html lang=\{HTML_LANG\[lang\]\}>/.test(layout));
overit("layout montuje LangProvider", /<LangProvider lang=\{lang\}>/.test(layout));
overit("layout montuje přepínač", /<PrepinacJazyka aktivni=\{lang\} \/>/.test(layout));

const prepinac = read("src/components/PrepinacJazyka.tsx");
overit("přepínač zapisuje cookie lang", /\$\{LANG_COOKIE\}=\$\{lang\}/.test(prepinac));
overit("přepínač obnoví server komponenty", /router\.refresh\(\)/.test(prepinac));
overit("přepínač nabízí oba jazyky", /LANGS\.map/.test(prepinac));
overit(
  "přepínač nemění URL (žádný push ani replace)",
  !/router\.(push|replace)\(/.test(prepinac),
);

const server = read("src/lib/i18n/server.ts");
overit("server čte cookie", /cookieStore\.get\(LANG_COOKIE\)/.test(server));
overit("server čte Accept-Language", /accept-language/.test(server));

/* --- Kupónový e-mail jede v jazyce, ve kterém host kvíz vyplnil ----------- */
for (const [jmeno, zdroj] of [
  ["KvizFlow", read("src/components/KvizFlow.tsx")],
  ["KvizFlowProfil", read("src/components/KvizFlowProfil.tsx")],
] as const) {
  overit(
    `${jmeno}: formulář posílá jazyk do server action`,
    /<input type="hidden" name="lang" value=\{lang\} \/>/.test(zdroj),
  );
}
const kvizLead = read("src/lib/kviz-lead.ts");
overit("parseKvizFormData čte pole lang", /normalizeLang\(text\(formData, "lang"\)\)/.test(kvizLead));
overit(
  "jazyk se do quiz_leads NEZAPISUJE",
  !/lang/.test(kvizLead.slice(kvizLead.indexOf("export function sestavitQuizLeadZaznam"))),
);
const kvizActions = read("src/app/kviz/actions.ts");
overit("server action skládá e-mail podle jazyka", /getDict\(lang\)/.test(kvizActions));

/* ========================================================================== */

if (chyby.length > 0) {
  console.error(`✗ check-i18n: ${chyby.length} chyb z ${kontrol} kontrol`);
  for (const c of chyby.slice(0, 40)) console.error(`  · ${c}`);
  if (chyby.length > 40) console.error(`  · … a dalších ${chyby.length - 40}`);
  process.exit(1);
}

assert.equal(chyby.length, 0);
console.log(
  `✓ check-i18n: ${kontrol} kontrol OK · ${klicu} klíčů v paritě cs↔en · ` +
    `${SKENOVANE_CESTY.length} skenovaných namespaců bez zdravotních tvrzení ` +
    `(${ZAKAZANA.cs.length} slov v cs, ${ZAKAZANA.en.length} v en) · ` +
    `detekce jazyka mimo middleware`,
);
