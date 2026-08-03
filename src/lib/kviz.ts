/**
 * Kvíz bavičů fronty — „královská snídaně“.
 *
 * Tři otázky dovedou návštěvníka od jeho reálného rána k snídani, která ho
 * nastartuje na celý den, a k jednomu produktu se slevou 21 %.
 *
 * Zdroj pravdy pro produkty i kódy kupónů:
 * `_data/healing-festival-bar/kviz-kupony-mapping.md` (vč. sekce KOREKCE 3. 8. —
 * zrušené slugy a DE varianta SIXBLDE se do kvízu nezařazují).
 *
 * Kupóny už v e-shopu EXISTUJÍ — appka jen deterministicky skládá jejich kód,
 * nikdy je nevytváří.
 */

/** Výše slevy — POUZE pro texty v UI a v e-mailu. */
export const SLEVA_PROCENT = 21;

/**
 * Prefix kódu kupónu. Musí odpovídat kódům kupónů, které už existují
 * v e-shopu — NEodvozovat ze `SLEVA_PROCENT`. Změna procenta v UI nesmí
 * tiše rozbít všechny vygenerované kódy.
 */
const KUPON_PREFIX = "HEAL21";

/** Podmínky kupónu — stejný text na obrazovce i v e-mailu. */
/** Podmínky personalizovaného kupónu (zakládá se přes CloudSailor API per lead). */
export const KUPON_PODMINKY =
  "Platí do 31. 12. 2026 · jen na tvůj e-mail · počet objednávek neomezen · minimální objednávka 500 Kč.";

/** Podmínky sdíleného záložního kupónu — použije se, jen když API e-shopu neodpoví. */
export const KUPON_PODMINKY_FALLBACK =
  "Platí do 30. 9. 2026 · minimální objednávka 500 Kč · 1× na zákazníka.";

export const ESHOP_URL = "https://www.wildandcoco.com";

/* -------------------------------------------------------------------------- */
/* Baviči fronty                                                               */
/* -------------------------------------------------------------------------- */

export type Bavic = {
  /** Část URL — `/kviz/<slug>`. */
  slug: string;
  /** Kód v kupónu (HEAL21-<kod>-<slug produktu>). */
  kod: string;
  jmeno: string;
};

export const BAVICI: Bavic[] = [
  { slug: "a1", kod: "A1", jmeno: "Ivona" },
  { slug: "b2", kod: "B2", jmeno: "Denisa" },
  { slug: "c3", kod: "C3", jmeno: "Amae" },
  { slug: "d4", kod: "D4", jmeno: "Atrey" },
  { slug: "e5", kod: "E5", jmeno: "Kateřina" },
  { slug: "f6", kod: "F6", jmeno: "Leonardo" },
];

export function najitBavice(slug: string): Bavic | undefined {
  const hledany = slug.trim().toLowerCase();
  return BAVICI.find((b) => b.slug === hledany);
}

/* -------------------------------------------------------------------------- */
/* Katalog                                                                     */
/* -------------------------------------------------------------------------- */

/** Věcná kategorie produktu (sortiment). */
export type Kategorie =
  | "streva"
  | "piti"
  | "energie"
  | "suplementy"
  | "sladke"
  | "slane"
  | "vareni";

/** Typ rána z otázky 1 — určuje primární sadu produktů. */
export type Rano = "rychle" | "energie" | "ritual" | "protein";

/** Chuťový tag z otázky 2 — řadí a doplňuje doporučení. */
export type Chut = "coko" | "ovoce" | "kokos" | "slana";

export type KvizProdukt = {
  /** Slug z mapovací tabulky — vstupuje do kódu kupónu. */
  slug: string;
  /** Produktový kód v e-shopu (dependentProductCode pro personalizovaný kupón). */
  kod: string;
  nazev: string;
  emoji: string;
  /** Produkt může patřit do víc kategorií (Cocofir = střeva i pití). */
  kategorie: Kategorie[];
  /** Do jakého typu rána se produkt hodí. Prázdné = jen jako doplněk. */
  rano?: Rano[];
  /** Chuťový profil. Prázdné = chuťově neutrální (kapsle, prášky). */
  chut?: Chut[];
};

export const KATEGORIE_LABEL: Record<Kategorie, string> = {
  streva: "Střeva & imunita",
  piti: "Osvěžení a pití",
  energie: "Energie & výkon",
  suplementy: "Doplňky stravy",
  sladke: "Sladké",
  slane: "Slané",
  vareni: "Na vaření",
};

/**
 * Katalog kvízu — 66 produktů.
 * Pořadí v rámci skupiny určuje pořadí doporučení, proto jsou vlajkové
 * produkty (Cocofir, Cocoguard, vody, Dynamic) nahoře.
 */
export const PRODUKTY: KvizProdukt[] = [
  /* --- Cocofir 250 ml a symbiotické kefíry ------------------------------- */
  { slug: "NTR250", kod: "CCF.BTC.NTR.250ML", nazev: "Cocofir Young Coconut BIO", emoji: "🥥", kategorie: ["streva", "piti"], rano: ["rychle"], chut: ["kokos"] },
  { slug: "MNG250", kod: "CCF.BTC.MNG.250ML", nazev: "Cocofir Mango BIO", emoji: "🥭", kategorie: ["streva", "piti"], rano: ["rychle"], chut: ["ovoce"] },
  { slug: "BB250", kod: "CCF.BTC.BB1.250ML", nazev: "Cocofir Borůvka Bergamot BIO", emoji: "🫐", kategorie: ["streva"], rano: ["rychle"], chut: ["ovoce"] },
  { slug: "RYBIZ", kod: "CCF.BTC.BLC.250ML", nazev: "Cocofir Černý Rybíz BIO", emoji: "🍇", kategorie: ["streva"], rano: ["rychle"], chut: ["ovoce"] },
  { slug: "SC250", kod: "CCF.BTC.SC1.250ML", nazev: "Protein Cocofir Slaný Karamel BIO", emoji: "🍮", kategorie: ["streva", "energie"], rano: ["rychle", "protein"] },
  { slug: "CC250", kod: "CCF.BTC.CC1.250ML", nazev: "Protein Cocofir Chocolate Bliss BIO", emoji: "🍫", kategorie: ["streva", "energie"], rano: ["rychle", "protein"], chut: ["coko"] },
  { slug: "BL250", kod: "CCF.BTC.BL1.250ML", nazev: "Protein Cocofir Banana Lemon BIO", emoji: "🍌", kategorie: ["streva", "energie"], rano: ["rychle", "protein"], chut: ["ovoce"] },
  { slug: "KEFIR", kod: "YG_KEF_250ML", nazev: "Young Coconut Symbiotic Cocofir BIO", emoji: "🥥", kategorie: ["streva"], rano: ["rychle"], chut: ["kokos"] },
  { slug: "KEFMNG", kod: "COF_MANGO_250ML", nazev: "Symbiotic Cocofir Mango", emoji: "🥭", kategorie: ["streva"], rano: ["rychle"], chut: ["ovoce"] },

  /* --- Shoty 6packy ------------------------------------------------------ */
  { slug: "SIXVNL", kod: "CCS.VNL.TC6", nazev: "Cocofir Young Coconut & Vanilla BIO 6 ks", emoji: "🍦", kategorie: ["streva"], rano: ["rychle"], chut: ["kokos"] },
  { slug: "SIXCHC", kod: "CCS.CHC.6PCK", nazev: "Cocofir Cacao Ceremony BIO 6 ks", emoji: "🍫", kategorie: ["streva"], rano: ["rychle", "energie"], chut: ["coko"] },
  { slug: "SIXMNG", kod: "CCS.MNG.MR.CZ6", nazev: "Cocofir Mango Maracuja BIO 6 ks", emoji: "🥭", kategorie: ["streva"], rano: ["rychle"], chut: ["ovoce"] },
  { slug: "SIXCH", kod: "CCS.CH.CZ6", nazev: "Protein Cocofir Chocolate Bliss BIO 6 ks", emoji: "🍫", kategorie: ["streva", "energie"], rano: ["rychle", "protein"], chut: ["coko"] },
  { slug: "SIXBL", kod: "CCS.SHP.TC6", nazev: "Protein Cocofir Banana Lemon BIO 6 ks", emoji: "🍌", kategorie: ["streva", "energie"], rano: ["rychle", "protein"], chut: ["ovoce"] },

  /* --- Cocoguard a jogurty ----------------------------------------------- */
  { slug: "CCG400", kod: "CCG.BTC.YCC.400G", nazev: "Biotic Cocoguard Young Coconut BIO 400 g", emoji: "🥣", kategorie: ["streva"], rano: ["ritual"], chut: ["kokos"] },
  { slug: "CCGYC150", kod: "CCG.BTC.YCC.150G", nazev: "Biotic Cocoguard Young Coconut BIO 150 g", emoji: "🥣", kategorie: ["streva"], rano: ["rychle", "ritual"], chut: ["kokos"] },
  { slug: "CCG150", kod: "CCG.BTC.MNG.150G", nazev: "Biotic Cocoguard Mango BIO 150 g", emoji: "🥭", kategorie: ["streva"], rano: ["rychle", "ritual"], chut: ["ovoce"] },
  { slug: "CCGBB150", kod: "CCG.BTC.BB1.150G", nazev: "Biotic Cocoguard Borůvka Bergamot BIO", emoji: "🫐", kategorie: ["streva"], rano: ["rychle", "ritual"], chut: ["ovoce"] },
  { slug: "PREM300", kod: "CCG.BTP.YCC.300G", nazev: "Biotic Cocoguard Premium BIO 300 g", emoji: "✨", kategorie: ["streva"], rano: ["ritual"], chut: ["kokos"] },
  { slug: "PREM1000", kod: "CCG.BTP.YCC.1000G", nazev: "Cocoguard Premium BIO 1 kg", emoji: "✨", kategorie: ["streva"], rano: ["ritual"], chut: ["kokos"] },
  { slug: "CHIAVAN", kod: "CCG.BTP.CHV.300G", nazev: "Chia Vanilla Biotic Cocoguard Premium BIO", emoji: "🌿", kategorie: ["streva"], rano: ["ritual"], chut: ["kokos"] },
  { slug: "JOGURT1L", kod: "YOG_ULT_1L", nazev: "Young Coconut Symbiotic Cocoguard BIO 1 l", emoji: "🥣", kategorie: ["streva"], rano: ["ritual"], chut: ["kokos"] },

  /* --- Kokosové vody ------------------------------------------------------ */
  { slug: "VODA1", kod: "CCW.RTW.473", nazev: "Thajská raw kokosová voda BIO", emoji: "💧", kategorie: ["piti"], rano: ["rychle"], chut: ["kokos"] },
  { slug: "VODA2", kod: "CCW.WRH.473", nazev: "Wild Raw kokosová voda BIO", emoji: "🌊", kategorie: ["piti"], rano: ["rychle"], chut: ["kokos"] },
  { slug: "VODA3", kod: "ROV.473ML", nazev: "Kokosová voda Royal Virgin BIO RAW", emoji: "👑", kategorie: ["piti"], rano: ["rychle"], chut: ["kokos"] },

  /* --- Energie ------------------------------------------------------------ */
  { slug: "ESSDNM", kod: "ESS.DNM.320G", nazev: "Essential Dynamic", emoji: "⚡", kategorie: ["energie"], rano: ["energie"] },
  { slug: "PROTEIN", kod: "ESSENTIAL_PROTEIN", nazev: "Essential Protein 180 tablet", emoji: "💪", kategorie: ["energie"], rano: ["protein"] },
  { slug: "JECMEN", kod: "MLADYJECMEN", nazev: "Sušená šťáva z mladého ječmene BIO", emoji: "🌱", kategorie: ["energie", "suplementy"], rano: ["energie"] },

  /* --- Doplňky stravy ----------------------------------------------------- */
  { slug: "SYMB", kod: "SYMBIOTICS-SUPERHUMAN-2-0-10-K", nazev: "Symbiotics Superhuman 2.0 — 10 kapslí", emoji: "💊", kategorie: ["suplementy", "streva"] },
  { slug: "SYMB30", kod: "SYMBIOTICS-SUPERHUMAN-2-0-30-K", nazev: "Symbiotics Superhuman 2.0 — 30 kapslí", emoji: "💊", kategorie: ["suplementy"] },
  { slug: "SYMBNOC", kod: "SYMBIO-SPRHMN_NOVTMC_2-0-30", nazev: "Symbiotics Superhuman No-vitC 2.0 — 30 kapslí", emoji: "💊", kategorie: ["suplementy"] },
  { slug: "SH10", kod: "PROBIO_SH10", nazev: "Symbiotics Superhuman — 10 kapslí", emoji: "💊", kategorie: ["suplementy"] },
  { slug: "SH30", kod: "PROBIO_SH30", nazev: "Symbiotics Superhuman — 30 kapslí", emoji: "💊", kategorie: ["suplementy"] },
  { slug: "HISTA60", kod: "PRO.HB1.60", nazev: "Histabiotics 1.0 — 60 kapslí", emoji: "🌸", kategorie: ["suplementy"] },
  { slug: "HISTA30", kod: "PRO.HB2.30", nazev: "Histabiotics 2.0 — 30 kapslí", emoji: "🌸", kategorie: ["suplementy"] },

  /* --- Sladké ------------------------------------------------------------- */
  { slug: "GRNSTR", kod: "GRN.STR.220G.CDS", nazev: "Strawberry Quinoa Coconut Granola", emoji: "🍓", kategorie: ["sladke"], rano: ["ritual", "energie"], chut: ["ovoce"] },
  { slug: "GRN250", kod: "GRANOLA_250G", nazev: "Crunchy Granola Coconut & Cacao", emoji: "🍫", kategorie: ["sladke"], rano: ["ritual", "energie"], chut: ["coko"] },
  { slug: "CACAO", kod: "WLC.CRM.190G", nazev: "Wild Cacao Ceremony", emoji: "🍫", kategorie: ["sladke"], rano: ["energie", "ritual"], chut: ["coko"] },
  { slug: "POMCOKO", kod: "CHOCO_300G_NEW", nazev: "Kokosová pomazánka čokoládová BIO", emoji: "🍫", kategorie: ["sladke"], rano: ["ritual", "energie"], chut: ["coko"] },
  { slug: "POMMACA", kod: "SPREAD_MACA_280G", nazev: "Macadamia Heavenly Spread BIO", emoji: "🥜", kategorie: ["sladke"], rano: ["ritual"] },
  { slug: "POMKESU", kod: "SPREAD_CASHEW_300G", nazev: "Kokosová pomazánka kešu BIO", emoji: "🥜", kategorie: ["sladke"], rano: ["ritual"] },
  { slug: "POMNAT", kod: "BUTTER_CREAMY_300GR", nazev: "Kokosová pomazánka natural BIO", emoji: "🥥", kategorie: ["sladke"], rano: ["ritual"], chut: ["kokos"] },
  { slug: "PEPPER", kod: "PEPPER_CARAMELADE_150G", nazev: ".Pepper..caramelade", emoji: "🌶️", kategorie: ["sladke"], rano: ["ritual"] },

  /* --- Slané -------------------------------------------------------------- */
  { slug: "KIMCHI", kod: "KMCH.280G", nazev: "Superhuman Kimchi BIO", emoji: "🌶️", kategorie: ["slane"], rano: ["ritual"], chut: ["slana"] },
  { slug: "GREENCHI", kod: "GRNCH.280G", nazev: "Superhuman Greenchi BIO", emoji: "🥬", kategorie: ["slane"], rano: ["ritual"], chut: ["slana"] },
  { slug: "FLOWERCHI", kod: "FLWCH.280G", nazev: "Superhuman Flowerchi BIO", emoji: "🌼", kategorie: ["slane"], rano: ["ritual"], chut: ["slana"] },
  { slug: "GARLICCHI", kod: "GRLCH.280G", nazev: "Superhuman Garlic-chi BIO", emoji: "🧄", kategorie: ["slane"], rano: ["ritual"], chut: ["slana"] },
  { slug: "TEMPLNT", kod: "TMP.LNT.170G", nazev: "Tempeh čočkový BIO", emoji: "🫘", kategorie: ["slane"], rano: ["protein"], chut: ["slana"] },
  { slug: "TEMPHRACH", kod: "TMP.GRP.170G", nazev: "Tempeh hrachový BIO", emoji: "🫘", kategorie: ["slane"], rano: ["protein"], chut: ["slana"] },
  { slug: "TEMPLPN", kod: "TMP.LPN.200G", nazev: "Lupinový tempeh v olivovém oleji BIO", emoji: "🫘", kategorie: ["slane"], rano: ["protein"], chut: ["slana"] },
  { slug: "BURGER", kod: "VGT.BRG.200G", nazev: "Superfood burger BIO 2×100 g", emoji: "🍔", kategorie: ["slane"], rano: ["protein"], chut: ["slana"] },
  { slug: "NUGETKY", kod: "PEA.MDL.220G", nazev: "Bliss nugetky BIO 4×55 g", emoji: "🍢", kategorie: ["slane"], rano: ["protein"], chut: ["slana"] },
  { slug: "NUGKOPR", kod: "DIL.NGT.220G", nazev: "Koprové nugetky BIO 4×55 g", emoji: "🍢", kategorie: ["slane"], rano: ["protein"], chut: ["slana"] },
  { slug: "FOCACCIA", kod: "FOCACCIA.4PCS", nazev: "Wild Focaccia BIO 4 ks", emoji: "🫓", kategorie: ["slane"], rano: ["ritual"], chut: ["slana"] },
  { slug: "CHLEBAMA", kod: "AMA.BRD.530G", nazev: "Proteinový kváskový chléb s amarantem", emoji: "🍞", kategorie: ["slane"], rano: ["ritual", "protein"], chut: ["slana"] },
  { slug: "CHLEBSSM", kod: "SSM.BRD.530G", nazev: "Sezamový chléb BIO 530 g", emoji: "🍞", kategorie: ["slane"], rano: ["ritual"], chut: ["slana"] },
  { slug: "MAYO", kod: "PROBIOMAYO", nazev: "Coco Mayo BIO", emoji: "🥚", kategorie: ["slane"], chut: ["slana"] },
  { slug: "PESTO", kod: "CHI.PST.280", nazev: "Chi Pesto", emoji: "🌿", kategorie: ["slane"], chut: ["slana"] },

  /* --- Na vaření ---------------------------------------------------------- */
  { slug: "MILK17", kod: "MILK_400ML", nazev: "Kokosové mléko BIO 17 %", emoji: "🥛", kategorie: ["vareni"], chut: ["kokos"] },
  { slug: "SMET400", kod: "SMET_400ML", nazev: "Kokosové mléko BIO 22 % — 400 ml", emoji: "🥛", kategorie: ["vareni"], chut: ["kokos"] },
  { slug: "SMET200", kod: "SMET_200ML", nazev: "Kokosové mléko BIO 22 % — 200 ml", emoji: "🥛", kategorie: ["vareni"], chut: ["kokos"] },
  { slug: "MLEKO", kod: "MLK.BIO.300G", nazev: "Sušené kokosové mléko BIO", emoji: "🥛", kategorie: ["vareni"], chut: ["kokos"] },
  { slug: "OLEJ", kod: "OIL_300ML", nazev: "Panenský raw kokosový olej BIO", emoji: "🫒", kategorie: ["vareni"], chut: ["kokos"] },
  { slug: "DUZINA", kod: "DUZ_500G", nazev: "Dužina z mladého kokosu BIO", emoji: "🥥", kategorie: ["vareni"], rano: ["ritual"], chut: ["kokos"] },
  { slug: "PYRE", kod: "PUREE_250G", nazev: "Pyré z mladého kokosu raw BIO", emoji: "🥥", kategorie: ["vareni"], rano: ["ritual"], chut: ["kokos"] },
  { slug: "NEKTAR2", kod: "CCN.NCT", nazev: "Kokosový nektar BIO", emoji: "🍯", kategorie: ["vareni"], rano: ["ritual"], chut: ["kokos"] },
];

export function najitProdukt(slug: string): KvizProdukt | undefined {
  const hledany = slug.trim().toUpperCase();
  return PRODUKTY.find((p) => p.slug === hledany);
}

export function produktyVKategorii(kategorie: Kategorie): KvizProdukt[] {
  return PRODUKTY.filter((p) => p.kategorie.includes(kategorie));
}

/**
 * HEAL21-<bavič>-<produkt>. Kupón s tímto kódem už v e-shopu existuje.
 *
 * Bere slugy, ne objekty, a oba si znovu ověří proti katalogu (allowlist) —
 * do kódu kupónu se tak nikdy nepropíše řetězec od uživatele.
 * `null` = neznámý bavič nebo produkt; volající to musí ošetřit jako chybu.
 */
export function kodKuponu(
  bavicSlug: string,
  produktSlug: string,
): string | null {
  const bavic = najitBavice(bavicSlug);
  const produkt = najitProdukt(produktSlug);
  if (!bavic || !produkt) return null;
  return `${KUPON_PREFIX}-${bavic.kod}-${produkt.slug}`;
}

/* -------------------------------------------------------------------------- */
/* Otázky — cesta ke „královské snídani“                                       */
/* -------------------------------------------------------------------------- */

/** Otázka 1 = typ rána, hodnoty odpovídají tagům `rano`. */
export type OdpovedQ1 = Rano;
/** Otázka 2 = chuť, hodnoty odpovídají tagům `chut`. */
export type OdpovedQ2 = Chut;
/** Otázka 3 = „koruna“ snídaně; `nic` = bez doplňků. */
export type OdpovedQ3 = "sila" | "fokus" | "streva" | "nic";

export type Moznost<T extends string> = {
  hodnota: T;
  emoji: string;
  text: string;
};

export const HOOK =
  "Sestav si královskou snídani — 3 otázky, 30 vteřin, sleva 21 % na míru.";

export const OTAZKA_1_TEXT = "Jak vypadá tvoje ráno?";
export const OTAZKA_1: Moznost<OdpovedQ1>[] = [
  { hodnota: "rychle", emoji: "⏰", text: "Spěch — káva na stojáka" },
  { hodnota: "energie", emoji: "😴", text: "Dlouho se rozjíždím" },
  { hodnota: "ritual", emoji: "🥣", text: "Snídám v klidu" },
  { hodnota: "protein", emoji: "🏃", text: "Ráno makám / trénink" },
];

export const OTAZKA_2_TEXT = "Na jakou chuť se ráno těšíš?";
export const OTAZKA_2: Moznost<OdpovedQ2>[] = [
  { hodnota: "coko", emoji: "🍫", text: "Čokoládová" },
  { hodnota: "ovoce", emoji: "🥭", text: "Ovocná a svěží" },
  { hodnota: "kokos", emoji: "🥥", text: "Čistě kokosová" },
  { hodnota: "slana", emoji: "🧂", text: "Slaná" },
];

export const OTAZKA_3_TEXT = "Co dodá tvé snídani královskou korunu?";
export const OTAZKA_3: Moznost<OdpovedQ3>[] = [
  { hodnota: "sila", emoji: "💪", text: "Síla a protein" },
  { hodnota: "fokus", emoji: "🧠", text: "Klid a fokus" },
  { hodnota: "streva", emoji: "🦠", text: "Zdravá střeva" },
  { hodnota: "nic", emoji: "✨", text: "Nic — jen poctivé jídlo" },
];

/* -------------------------------------------------------------------------- */
/* Doporučení                                                                  */
/* -------------------------------------------------------------------------- */

const MIN_DOPORUCENI = 6;
const MAX_DOPORUCENI = 8;

/**
 * „Korunovační“ doplňky k otázce 3 — ručně seřazené, první jsou ty
 * nejvýstižnější. Záměrně jde o krátký kurátorský výběr, ne o filtr.
 */
const KORUNA: Record<Exclude<OdpovedQ3, "nic">, string[]> = {
  sila: ["PROTEIN", "SC250", "CC250", "BL250", "SIXCH", "SIXBL"],
  fokus: ["ESSDNM", "CACAO", "SIXCHC", "JECMEN"],
  streva: [
    "SYMB",
    "HISTA60",
    "SYMB30",
    "SH10",
    "HISTA30",
    "SYMBNOC",
    "SH30",
    "KEFIR",
    "PREM300",
    "CCG400",
  ],
};

function korunovacniProdukty(q3: OdpovedQ3): KvizProdukt[] {
  if (q3 === "nic") return [];
  return KORUNA[q3]
    .map((slug) => najitProdukt(slug))
    .filter((p): p is KvizProdukt => p !== undefined);
}

/**
 * Doporučí 6–8 produktů pro královskou snídani.
 *
 * Otázka 1 určí primární sadu, otázka 2 ji seřadí podle chuti (a doplní
 * 2 chuťové tipy mimo sadu), otázka 3 přidá 1–2 korunovační doplňky.
 * Primární sada je vždy první.
 */
export function doporucitProdukty(
  q1: OdpovedQ1,
  q2: OdpovedQ2,
  q3: OdpovedQ3,
): KvizProdukt[] {
  const primarni = PRODUKTY.filter((p) => p.rano?.includes(q1));
  const chutove = PRODUKTY.filter((p) => p.chut?.includes(q2));
  const sediChut = (p: KvizProdukt): boolean => p.chut?.includes(q2) === true;

  const vybrane: KvizProdukt[] = [];
  const pridat = (zdroj: KvizProdukt[], kolik: number): void => {
    let zbyva = kolik;
    for (const p of zdroj) {
      if (zbyva <= 0 || vybrane.length >= MAX_DOPORUCENI) return;
      if (vybrane.includes(p)) continue;
      vybrane.push(p);
      zbyva -= 1;
    }
  };

  // Primární sada seřazená tak, aby chuťově sedící produkty šly první.
  pridat(
    [...primarni.filter(sediChut), ...primarni.filter((p) => !sediChut(p))],
    4,
  );
  pridat(chutove, 2);
  pridat(korunovacniProdukty(q3), 2);

  // Dorovnání na minimum — nejdřív primární sada, pak chuť, pak zbytek katalogu.
  if (vybrane.length < MIN_DOPORUCENI) {
    pridat(primarni, MIN_DOPORUCENI - vybrane.length);
  }
  if (vybrane.length < MIN_DOPORUCENI) {
    pridat(chutove, MIN_DOPORUCENI - vybrane.length);
  }
  if (vybrane.length < MIN_DOPORUCENI) {
    pridat(PRODUKTY, MIN_DOPORUCENI - vybrane.length);
  }

  return vybrane;
}
