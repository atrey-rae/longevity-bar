/**
 * Český slovník Bar.app — jediný zdroj pravdy pro české texty rozhraní.
 *
 * PRAVIDLO: česká znění se tímhle souborem NEMĚNÍ. Tam, kde už text bydlel ve
 * schválené konstantě (`lib/kviz.ts`, `lib/darek.ts`, `lib/loyalty.ts`,
 * `lib/kviz-profil*.ts`, katalogy), slovník tu konstantu jen PŘEBÍRÁ — nikdy ji
 * neopisuje. Díky tomu se schválené texty nemohou rozejít a kontrolní skripty
 * můžou číst česká znění odsud místo z hardcode řetězců.
 *
 * Soubor se načítá i pod `tsx` v `scripts/`, takže nesmí importovat React,
 * `next/*` ani nic serverového — jen čisté moduly.
 */

import {
  LONGEVITY_BAR_CATALOG,
  type CatalogCategory,
} from "../catalog-longevity";
import {
  WILD_COCO_CATALOG,
  type WildCocoCatalogCategory,
} from "../catalog-wild-coco";
import {
  DAREK_KVIZ_ODKAZ_TEXT,
  DAREK_NADPIS,
  DAREK_OSOBNI_QR_TITULEK,
  DAREK_PODTEXT,
  DAREK_PRIHLASENI_VYZVA,
  darekPocitadloText,
} from "../darek";
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
  SLEVA_PROCENT,
  type Kategorie,
  type OdpovedQ1,
  type OdpovedQ2,
  type OdpovedQ3,
} from "../kviz";
import {
  PROFILY,
  PROFIL_DISCLAIMER,
  PROFIL_HOOK,
  PROFIL_OTAZKY,
} from "../kviz-profil";
import {
  PERSONY,
  POSTREHY_TEXTY,
  VYHODNOCENI_TEXTY,
} from "../kviz-profil-vyhodnoceni";
import {
  CATEGORY_LABEL,
  CATEGORY_LABEL_LONG,
  STAMPS_PER_TIER,
} from "../loyalty";
import { katalogTexty } from "./katalog";
import { minuty, razitka } from "../text";
import type { ProductCategory } from "../types";

/* -------------------------------------------------------------------------- */
/* Pomocné odvozené mapy                                                       */
/* -------------------------------------------------------------------------- */

/** Texty odpovědí otázky podle jejich hodnoty — komponenta pak nesahá na pole. */
function moznostiPodleHodnoty<T extends string>(
  moznosti: readonly { hodnota: T; text: string }[],
): Record<T, string> {
  return Object.fromEntries(moznosti.map((m) => [m.hodnota, m.text])) as Record<
    T,
    string
  >;
}

/** Podnadpisy sekcí katalogu Longevity Baru (dřív v `app/sortiment/longevity`). */
const LONGEVITY_PODNADPIS: Record<CatalogCategory, string> = {
  "Studené nápoje": "Vychlazené, fermentované i míchané přímo na baru",
  "Káva & kakao": "Výběrová káva a kakaové rituály v našem podání",
  Přídavky: "Malé botanické detaily, kterými si nápoj doladíš",
  Jídlo: "Snídaně, slané jídlo i sladká festivalová tečka",
  Retail: "Oblíbené produkty WILD&COCO, které si odneseš domů",
};

/** Popisy sekcí katalogu WILD&COCO (dřív v `app/sortiment/wild-coco`). */
const WILD_COCO_POPIS: Record<WildCocoCatalogCategory, string> = {
  "Fermentovaný kokos":
    "Naše cesta začíná u mladého kokosu a času, který dostane k fermentaci.",
  Nápoje:
    "Čisté kokosové osvěžení pro chvíle, kdy chceš jednoduchost bez kompromisu.",
  Wellbeing:
    "Promyšlené formáty, které snadno zapadnou do tvé každodenní rutiny.",
  "Granoly & kakao":
    "Křupavé snídaně a hluboká kakaová chuť pro pomalé i rychlé momenty.",
  Pomazánky:
    "Hedvábné textury, prémiové suroviny a lžička, kterou se nechce odkládat.",
  "Slané jídlo":
    "Fermentovaná zelenina a rostlinné základy pro plnohodnotné domácí jídlo.",
  "Kokosová spíž":
    "Kokosové základy, se kterými dostaneš krémovost do sladkého i slaného vaření.",
};

/** Kategorie katalogů jsou zároveň klíč i český popisek — identita. */
const LONGEVITY_KATEGORIE: Record<CatalogCategory, string> = {
  "Studené nápoje": "Studené nápoje",
  "Káva & kakao": "Káva & kakao",
  Přídavky: "Přídavky",
  Jídlo: "Jídlo",
  Retail: "Retail",
};

const WILD_COCO_KATEGORIE: Record<WildCocoCatalogCategory, string> = {
  "Fermentovaný kokos": "Fermentovaný kokos",
  Nápoje: "Nápoje",
  Wellbeing: "Wellbeing",
  "Granoly & kakao": "Granoly & kakao",
  Pomazánky: "Pomazánky",
  "Slané jídlo": "Slané jídlo",
  "Kokosová spíž": "Kokosová spíž",
};

/* -------------------------------------------------------------------------- */
/* Slovník                                                                     */
/* -------------------------------------------------------------------------- */

export const cs = {
  /* --- Napříč appkou ----------------------------------------------------- */
  spolecne: {
    zpetNaRozcestnik: "Zpět na rozcestník",
    zpetNaKartu: "Zpět na kartu",
    zpet: "← Zpět",
    zavrit: "Zavřít",
    prihlasitSe: "Přihlásit se",
    odhlasit: "Odhlásit",
    ulozit: "Uložit",
    ukladam: "Ukládám…",
    administrace: "Administrace",
    pravidlaAGdpr: "Pravidla & GDPR",
    krestniJmeno: "Křestní jméno",
    email: "E-mail",
    emailPlaceholder: "jmeno@email.cz",
    telefonPlaceholder: "Telefon (např. 601 123 456)",
    nemasSignal: "Nemáš signál? Zkontroluj připojení a zkus to znovu.",
    prepnoutJazyk: "Přepnout jazyk",
  },

  /* --- Hlavička, patička, metadata --------------------------------------- */
  layout: {
    titulek: "Longevity Bar — věrnostní karta",
    popis:
      "Věrnostní karta stánku Longevity Bar (Wild & Coco) na Healing Festivalu. Za každá 4 razítka odměna dle vlastního výběru.",
    znackaPred: "Longevity",
    znackaPo: "Bar",
    festival: "Healing Festival",
    patickaZnacka: "Peace & Coco · Longevity Bar",
    patickaEshop: "Wild & Coco",
  },

  /* --- Rozcestník -------------------------------------------------------- */
  rozcestnik: {
    titulek: "Longevity Bar",
    popis:
      "Odměny, mikrobiomový kvíz a festivalový sortiment Longevity Baru od WILD&COCO.",
    misto: "Healing Festival · Světlá nad Sázavou",
    nadpis: "Vyber si svůj zážitek v Longevity Baru",
    podnadpis: "Od první ochutnávky až po odměnu. Vše, co potřebuješ, najdeš tady.",
    navigaceLabel: "Co chceš v Longevity Baru zažít",
    potvrdEmailNadpis: "Odměny ještě čekají",
    potvrdEmail: "Potvrď e-mail",
    prihlasenyPred: "Jsi přihlášený. Věrnostní kartu a nastavení účtu najdeš v",
    prihlasenyOdkaz: "odměnách",
    prihlasenyPo: ".",
    neprihlaseny:
      "Pro prohlížení sortimentu se přihlašovat nemusíš. Přihlášení potřebuješ pro věrnostní kartu a před vstupem do kvízu.",
    karty: {
      odmeny: {
        eyebrow: "Věrnostní karta",
        title: "Získej dárky na Longevity baru",
        copy: "Sbírej razítka za návštěvy a vybírej si odměny, které ti chutnají.",
      },
      kviz: {
        eyebrow: "Pár rychlých otázek",
        title: "Kvíz o Tvém mikrobiomu",
        copy: "Najdi chuťový směr a produkty WILD&COCO, které by tě mohly bavit.",
      },
      longevity: {
        eyebrow: "Co ochutnáš na místě",
        title: "Projdi si náš Longevity Bar sortiment",
        copy: "Nápoje, káva, kakao, jídlo i festivalové speciality v jednom přehledu.",
      },
      wildCoco: {
        eyebrow: "Vezmi si WILD&COCO domů",
        title: "Projdi si náš WILD&COCO sortiment",
        copy: "Objev fermentované kokosové produkty, rostlinná jídla a naše další favority.",
      },
      darek: {
        eyebrow: "Dárek přátelům",
        title: "Daruj kamarádům slevu 21 %",
        copy: "Ukaž jim QR kód, vyplní kvíz a kupón jim přijde na e-mail.",
      },
      kredit: {
        eyebrow: "Máš u nás kredit",
        title: "Kredit na Longevity Baru",
        copy: "Vyber si, co si dáš, a ukaž objednávku obsluze u baru.",
      },
    },
  },

  /* --- Přihlášení -------------------------------------------------------- */
  prihlaseni: {
    titulek: "Přihlášení",
    nadpis: "Přihlas se a sbírej razítka",
    podnadpisSken:
      "Ještě krok — po přihlášení otevřeme kartu a razítko připíšeme, pokud je QR kód platný právě dnes.",
    podnadpisOdmeny:
      "Po přihlášení otevřeme tvoji věrnostní kartu a všechny nasbírané odměny.",
    podnadpisObecny: "Za každá 4 razítka si vybereš odměnu zdarma.",
    /* --- Vstup do kvízu (`next` míří na /kviz/…) ------------------------- */
    nadpisKviz: `Ještě krok ke slevě ${SLEVA_PROCENT} %`,
    podnadpisKvizPred: "Kvíz ti posílá",
    podnadpisKvizPo:
      "z Longevity Baru — po přihlášení tě vrátíme přesně tam, kde jsi skončil.",
    podnadpisKvizBezBavice:
      "Po přihlášení tě vrátíme rovnou zpátky do kvízu, kde jsi skončil.",
    procTelefonKviz: `Telefon po tobě chceme proto, že kupón na ${SLEVA_PROCENT} % je osobní — vydáme ho jednou a jen tobě, ať ho nikdo nezneužije.`,
    souhlasKvizPred:
      "Přihlášením souhlasíš se zpracováním telefonu. E-mail zadáš až v kvízu a použijeme ho k odeslání kupónu — do věrnostního programu tě tím nepřihlašujeme. Detaily v",
    chybaOauth:
      "Přihlášení přes Google se nedokončilo. Zkus to prosím znovu nebo použij telefon.",
    souhlasPred:
      "Přihlášením souhlasíš se zpracováním telefonu a následně zadaného e-mailu pro účely věrnostního programu. Detaily v",
    souhlasOdkaz: "pravidlech",
    souhlasPo: ".",
    formular: {
      tvujTelefon: "Tvůj telefon",
      telefonPlaceholder: "601 123 456",
      poslatSms: "Poslat SMS kód",
      odesilam: "Odesílám…",
      poslaliJsmeKodPred: "Poslali jsme 4místný kód na",
      poslaliJsmeKodPo: ".",
      overuji: "Ověřuji…",
      zmenitTelefon: "Změnit telefon",
      poslatZnovu: "Poslat znovu",
      poslatZnovuOdpocet: (sekund: number) => `Poslat znovu (${sekund} s)`,
      kodPlati: "Kód platí 10 minut.",
      nebo: "nebo",
      presmerovavam: "Přesměrovávám…",
      google: "Přihlásit existující účet přes Google",
      legacyShrnuti: "Přihlásit existující účet e-mailem",
      legacyPoslat: "Poslat kód na e-mail",
      legacyPoslano: (email: string) => `6místný kód jsme poslali na ${email}.`,
      legacyOverit: "Ověřit e-mailový kód",
      chybaTelefon: "Zadej prosím platné telefonní číslo.",
      chybaSms: "SMS se nepodařilo odeslat.",
      chybaSmsKod: "SMS s kódem se nepodařilo odeslat.",
      chybaDelkaKodu: "Kód má 4 číslice.",
      /* Rate limit SMS. Znění je stejné pro KAŽDÉ číslo — nesmí prozradit,
         jestli u nás účet existuje. */
      chybaLimitSms:
        "Kód jsme za posledních 15 minut poslali už 3×. Zkus to za pár minut, nebo se přihlas přes Google.",
      chybaKod: "Kód nesedí nebo vypršel.",
      chybaKodVyprsel: "Kód nesedí nebo už vypršel.",
      chybaGoogle: "Přihlášení přes Google se nepodařilo. Zkus telefon výše.",
      chybaLegacyEmail: "Zadej platný e-mail existujícího účtu.",
      chybaLegacyPoslani:
        "Kód se nepodařilo poslat. Zkontroluj, že účet už existuje.",
      chybaLegacyDelka: "E-mailový kód má 6 číslic.",
      chybaLegacyKod: "E-mailový kód nesedí nebo vypršel.",
    },
  },

  /* --- Potvrzení e-mailu -------------------------------------------------- */
  emailOnboarding: {
    nadpis: "Potvrď si e-mail",
    popis:
      "Razítka už sbíráš. Pro výběr a vyzvednutí odměny ještě potvrď svůj e-mail.",
    tlacitko: "Poslat ověřovací e-mail",
    odesilam: "Odesílám…",
    uspech:
      "Mrkni se do Tvého inboxu i do spamu, v jednom z nich od nás máš ověřovací email.",
    throttled:
      "Ověřovací e-mail jsme poslali před chvílí. Další můžeš poslat po 10 minutách.",
    chyba: "E-mail se nepodařilo odeslat.",
  },

  /* --- Věrnostní karta ---------------------------------------------------- */
  odmeny: {
    titulek: "Věrnostní karta",
    emailOveren: "E-mail je potvrzený. Odměny máš odemčené ✓",
    emailChyba: "Odkaz už neplatí. Nech si poslat nový ověřovací e-mail.",
    bezPristupu: "Do administrace nemáš přístup.",
    postupNaLevel: (level: number) =>
      `Tvoje tělo jásá, posouváš se na Level ${level}!`,
    vyhravas: "Vyhráváš! 🎉",
    vyberSiOdmenu: "Vyber si odměnu →",
    cekaNaVyzvednuti: "Odměna čeká na vyzvednutí",
    ukazatUPokladny: "Ukázat u pokladny",
    specialniVyhry: "Speciální výhry 🎁",
    specialniVyhryPopis:
      "Nech nám křestní jméno a telefon — ať tě u baru poznáme a můžeme ti poslat speciální výhry.",
    levelSplneny: (level: number, dalsi: number) =>
      `Level ${level} splněný ✓ — Tvoje tělo jásá, posouváš se na Level ${dalsi}!`,
    level: (cislo: number) => `Level ${cislo}`,
    kolo: (cislo: number) => `${cislo}. kolo`,
    hotovoVse: "Máš hotovo všechny tři odměny. Díky, že jsi s námi! 💛",
    kartaPlna: "Karta je plná — vyber si odměnu výše ☝️",
    zbyvaPred: (pocet: number) => `Ještě ${razitka(pocet)} a máš`,
    zbyvaPo: "zdarma.",
    naviRazitka: (pocet: number) =>
      `Máš navíc ${razitka(pocet)} naspořeno na další odměnu — nic ti nepropadá.`,
    prehledNadpis: `Odměny po ${STAMPS_PER_TIER} razítkách`,
    prehledTed: "teď",
    prehledPopis: (celkem: number) =>
      `Po třetí odměně se cyklus opakuje od začátku. Celkem máš ${razitka(celkem)}.`,
    historieNadpis: "Vyzvednuté odměny",
    historieVydano: "✓ vydáno",
    telefonniUcet: "Telefonní účet",
  },

  /* --- Výběr odměny ------------------------------------------------------- */
  vyber: {
    titulek: "Vyber si odměnu",
    nadpis: "Vyhráváš! Vyber si:",
    poznamka:
      "Vybíráš jen z toho, co je právě skladem. Po výběru ukážeš obrazovku obsluze u pokladny.",
    nicSkladem:
      "Momentálně není nic skladem 😢 Zeptej se prosím obsluhy u pokladny.",
    vybiram: "Vybírám…",
    chybaVyberu: "Výběr se nepodařil, zkus to prosím znovu.",
  },

  /* --- Vstupenka na odměnu ------------------------------------------------ */
  odmena: {
    titulek: "Tvoje odměna",
    vydano: "Vydáno",
    chciDalSbirat: "Chci dál sbírat odměny",
    dikyZaNakup:
      "Díky za nákup! Další razítko dostaneš u pokladny při dalším nákupu.",
    ukazUPokladny: "Ukaž u pokladny",
    obsluhaOveri: "Obsluha ověří živou obrazovku",
    odmenaZdarma: "Odměna zdarma · Longevity Bar",
    obsluhaVydaPred: "Obsluha vydá produkt a",
    obsluhaVydaZvyraznene: "podrží 3 s",
    obsluhaVydaPo: "tlačítko níže.",
    jenObsluhaOdmena:
      "Tlačítko mačká jen obsluha. Když ho zmáčkneš sám, o odměnu přijdeš.",
  },

  /* --- Tlačítko VYDAT ----------------------------------------------------- */
  vydat: {
    vydanoHotovo: "Vydáno ✓",
    pinObsluhy: "PIN obsluhy",
    zpracovavam: "Zpracovávám…",
    vydat: "Vydat",
    drzJeste: (sekund: number) => `Drž ještě ${sekund} s`,
    jenObsluha: "Jen obsluha · podrž 3 sekundy",
    ariaPodrzet: "Podrž 3 sekundy pro výdej odměny",
    chyba: "Výdej se nepodařil. Zkus to prosím znovu.",
  },

  /* --- Skenování QR a instalace ------------------------------------------- */
  sken: {
    naskenovat: "Naskenovat QR kód",
    dialogNadpis: "Naskenuj QR u pokladny",
    dialogPopis: "Namiř živou kameru na celý kód. Fotku z galerie vybrat nejde.",
    zavritKameru: "Zavřít kameru",
    zivyObraz: "Živý obraz zadní kamery",
    spoustime: "Spouštíme kameru…",
    nacteno: "QR načten — ověřujeme razítko…",
    kameraZablokovana: (host: string) =>
      `Kamera je zablokovaná. Povol ji pro ${host} v nastavení prohlížeče a zkus to znovu.`,
    kameraChybi:
      "Na tomto zařízení jsme nenašli kameru. Otevři aplikaci na telefonu s kamerou.",
    kameraObecnaChyba:
      "Kameru se nepodařilo spustit. Zkontroluj její povolení a zkus to znovu.",
    jinaAdresa: (host: string) =>
      `QR je pro jinou adresu (${host}). Otevři aplikaci na stejné adrese jako QR.`,
    neplatnyKod: "Tohle není platný QR kód Longevity Baru. Zkus jiný kód.",
    hlasky: {
      okNadpis: "Razítko připsáno!",
      cooldownNadpis: "Razítko už máš",
      cooldownText: (min: number) =>
        `Další si můžeš připsat za ${minuty(min)}. Jedno razítko = jeden nákup.`,
      limitNadpis: "Denní limit vyčerpán",
      limitText: (limit: number) =>
        `Dnes už máš maximum (${razitka(limit)}). Přijď zase zítra!`,
      spatnyDenNadpis: "Tenhle QR kód dnes neplatí",
      spatnyDenText: (datum: string) =>
        `Kód patří ke dni ${datum}. U pokladny si nech ukázat dnešní kód.`,
      spatnyDenBezData: "U pokladny si nech ukázat dnešní kód.",
      vypnutyNadpis: "QR kód je vypnutý",
      vypnutyText: "Zeptej se prosím obsluhy u pokladny.",
      neznamyNadpis: "Neznámý QR kód",
      neznamyText: "Nech si prosím ukázat aktuální kód u pokladny.",
      chybaNadpis: "Něco se pokazilo",
      chybaText: "Zkus prosím QR kód sejmout znovu.",
    },
  },

  instalace: {
    eyebrow: "Rychlejší příště",
    nadpis: "Přidat Longevity Bar na plochu?",
    pripomenoutZitra: "Připomenout zítra",
    iosVAplikaciPred: "Otevři stránku v Safari a tam klepni na",
    iosSdilet: "Sdílet",
    iosPridatNaPlochu: "Přidat na plochu",
    iosSafariPred: "V Safari klepni na",
    iosSafariMezi: "a potom na",
    androidPred: "V nabídce prohlížeče (⋮) zvol",
    androidNebo: "nebo",
    androidInstalovat: "Instalovat aplikaci",
    uzMamNaPlose: "Už mám na ploše",
    nativniPopis: "Otevřeš věrnostní kartu jedním klepnutím a zůstaneš přihlášený.",
    pridatAplikaci: "Přidat aplikaci",
    tedNe: "Teď ne — připomeň zítra",
  },

  /* --- Nenalezeno --------------------------------------------------------- */
  nenalezeno: {
    nadpis: "Tady nic není",
    popis: "Stránka neexistuje nebo už neplatí. Zkus to od věrnostní karty.",
  },

  /* --- Pravidla a GDPR ---------------------------------------------------- */
  pravidla: {
    titulek: "Pravidla a GDPR",
    nadpis: "Pravidla věrnostního programu",
    razitkaNadpis: "Jak se sbírají razítka",
    razitkaBody: [
      "Jeden nákup na stánku Longevity Bar = **1 razítko**.",
      "Razítko získáš sejmutím QR kódu, který ti obsluha ukáže **po zaplacení**.",
      "QR kód platí **jen v daný festivalový den**.",
      "Mezi dvěma razítky je krátká prodleva a platí denní limit razítek — chrání to program před zneužitím.",
      "Razítka se počítají průběžně. I s nevyzvednutou odměnou sbíráš dál a nic ti nepropadá.",
    ],
    odmenyNadpis: "Odměny",
    odmenyUvod: (razitek: number) =>
      `Za každá **${razitek} razítka** získáš jednu odměnu zdarma. Odměny se střídají v tomto pořadí:`,
    odmenyZaver:
      "Po třetí odměně se cyklus opakuje od začátku. Vybírat lze jen z produktů, které jsou právě skladem.",
    vyzvednutiNadpis: "Vyzvednutí odměny",
    vyzvednutiBody: [
      "Po výběru produktu ukážeš obrazovku obsluze u pokladny.",
      "Obrazovka je živá (animace + běžící hodiny) — screenshot obsluha nepřijme.",
      "Výdej potvrzuje **obsluha** podržením tlačítka „Vydat“ na tvém telefonu. Odměna se tím jednorázově znehodnotí.",
      "Když si tlačítko zmáčkneš sám bez převzetí produktu, o odměnu přijdeš.",
      "Ztracená nebo zavřená obrazovka nevadí — všechno je uložené na serveru, stačí appku otevřít znovu.",
    ],
    reklamaceNadpis: "Reklamace",
    reklamaceText:
      "Nepřipsalo se razítko nebo se odměna omylem znehodnotila? Obrať se na obsluhu stánku — má možnost stav ručně opravit.",
    gdprNadpis: "Ochrana osobních údajů (GDPR)",
    gdprSpravce:
      "Správcem údajů je **WILD&COCO s.r.o.**, provozovatel stánku Longevity Bar (Peace & Coco).",
    gdprVernostNadpis: "Věrnostní program (razítka)",
    gdprVernostBody: [
      "Zpracováváme **telefonní číslo a e-mail** (a jméno, pokud se přihlásíš přes Google) a **historii razítek a odměn**.",
      "Účel: přihlášení, provoz věrnostního programu a zasílání Longevity tipů po festivalu, nejdéle do 31. 12. 2026. Údaje nikomu neprodáváme.",
      "Kontaktní údaje pro Longevity tipy používáme nejdéle do 31. 12. 2026; poté je smažeme nebo ponecháme jen tehdy, pokud pro to máme jiný platný důvod (například tvůj samostatný souhlas či nákup).",
    ],
    gdprKvizNadpis: "Kvíz „Odemkni potenciál svého mikrobiomu“ (kupóny)",
    gdprKvizBody: [
      "Zpracováváme **jméno, e-mail a telefonní číslo**, které vyplníš ve formuláři, vybraný produkt s kódem kupónu a variantu kvízu. **Odpovědi na otázky kvízu se neukládají** — zůstávají jen v tvém prohlížeči.",
      "Účel: zaslání kupónu a **Longevity tipů od WILD&COCO s.r.o.** — kontaktní údaje k tomu používáme **nejdéle do 31. 12. 2026**, a to ve velmi omezené formě: **maximálně 6 přátelských zpráv**.",
      "Další komunikace je možná jen v případě, že se staneš zákazníkem internetového obchodu www.wildandcoco.com / .de / .sk / .at / .ch.",
      "Souhlas můžeš kdykoli odvolat — odpovědí na zprávu nebo u obsluhy stánku; kontakty pak přestaneme používat.",
    ],
    gdprSpolecneNadpis: "Společné",
    gdprSpolecneBody: [
      "Data jsou uložena u zpracovatele Supabase (EU) a appka běží na Vercelu.",
      "O výmaz svých údajů můžeš požádat kdykoli u obsluhy stánku nebo na e-shopu.",
      "Cookies používáme pouze technické — pro udržení přihlášení a zvoleného jazyka. Žádné sledovací ani reklamní cookies.",
    ],
  },

  /* --- Dárek přátelům ----------------------------------------------------- */
  darek: {
    titulek: "Dárek přátelům",
    popisMeta:
      "Ukaž kamarádům QR kód, vyplní kvíz a dostanou slevu 21 % na produkt WILD&COCO podle svého mikrobiomu.",
    eyebrow: "Dárek přátelům",
    nadpis: DAREK_NADPIS,
    podtext: DAREK_PODTEXT,
    osobniQrTitulek: DAREK_OSOBNI_QR_TITULEK,
    prihlaseniVyzva: DAREK_PRIHLASENI_VYZVA,
    odkazText: DAREK_KVIZ_ODKAZ_TEXT,
    altOsobni: (odkaz: string) =>
      `Tvůj osobní QR kód na mikrobiomový kvíz — ${odkaz}`,
    altStaticky: (odkaz: string) => `QR kód na mikrobiomový kvíz — ${odkaz}`,
    pocitadlo: darekPocitadloText,
    patka:
      "Kupón dostane kamarád na svůj e-mail a platí na e-shopu wildandcoco.com, ne u stánku.",
  },

  /* --- Kredit na baru ----------------------------------------------------- */
  kredit: {
    titulek: "Kredit na Longevity Baru",
    eyebrow: "Kredit na Longevity Baru",
    zadnyNadpis: "Kredit tu na tebe nečeká",
    zadnyPopis:
      "Kredit na Longevity Baru mají hosté festivalu, kterým ho přidělil tým v Healing appce. Když si myslíš, že tam tvůj je, ozvi se obsluze u baru.",
    /* Třetí stav: NEVÍME. Nesmí tvrdit, že host nárok nemá — jen že se stav
       teď nepodařilo zjistit. */
    nedostupnyNadpis: "Kredit se teď nedaří načíst",
    nedostupnyPopis:
      "Zkus to prosím za chvíli, nebo ukaž tuhle obrazovku obsluze u baru.",
    zkusitZnovu: "Zkusit znovu",
    zustatek: (zbyva: string, celkem: string) =>
      `zbývá z ${zbyva} · utraceno ${celkem}`,
    ukazObsluze: "Ukaž obsluze u baru",
    ukazObsluzeVice: "Ukaž obsluze u baru (čeká víc objednávek)",
    coSiDas: "Co si dáš?",
    vycerpano: "Kredit máš vyčerpaný. Díky, že jsi ho utratil u nás!",
    uzVydano: "Už vydáno",
    objednavkaZKreditu: "Objednávka z kreditu",
    jenObsluha:
      "Tlačítko mačká jen obsluha. Když ho zmáčkneš sám, objednávka se odepíše z kreditu.",
    vybrano: "Vybráno",
    prekroceno: (zbyva: string) =>
      `To je víc, než ti zbývá (${zbyva}). Uber prosím něco z výběru.`,
    objednat: "Objednat",
    objednavam: "Objednávám…",
    ubrat: (nazev: string) => `Ubrat ${nazev}`,
    pridat: (nazev: string) => `Přidat ${nazev}`,
    chybaObjednavky: "Objednávku se nepodařilo odeslat. Zkus to znovu.",
  },

  /* --- Sortiment ---------------------------------------------------------- */
  sortiment: {
    kategorieLabel: "Kategorie sortimentu",
    longevity: {
      titulek: "Sortiment Longevity Baru",
      popisMeta:
        "Nápoje, káva, jídlo a retail sortiment Longevity Baru na Healing Festivalu.",
      eyebrow: "Longevity Bar · festivalové menu",
      nadpis: "Najdi si, na co máš právě chuť",
      podnadpis:
        "Od čerstvé kokosové vody přes výběrovou kávu až po snídaňové bowls. Sortiment jsme poskládali tak, aby sis mohl dát rychlé osvěžení i celý chuťový rituál.",
      zpet: "← Zpět na rozcestník",
      ctaNadpis: "Už máš svého favorita?",
      ctaPopis: "Stav se za námi u baru a nech si poradit podle chuti.",
      ctaTlacitko: "Otevřít věrnostní kartu",
      kategorie: LONGEVITY_KATEGORIE,
      podnadpisy: LONGEVITY_PODNADPIS,
      polozky: katalogTexty(LONGEVITY_BAR_CATALOG, {}, "longevity/cs"),
    },
    wildCoco: {
      titulek: "Sortiment WILD&COCO",
      popisMeta:
        "Kurátorovaný výběr fermentovaných kokosových produktů, rostlinného jídla a wellbeing sortimentu WILD&COCO.",
      eyebrow: "WILD&COCO · living food",
      nadpis: "Vezmi si chuť Longevity Baru domů",
      podnadpis:
        "Vybrali jsme produktové rodiny, ke kterým se vracíme každý den — od fermentovaného mladého kokosu přes rostlinná jídla až po kokosovou spíž. Každý produkt otevřeš přímo v oficiálním e-shopu.",
      zpet: "← Zpět na rozcestník",
      kategorieLabel: "Kategorie produktů WILD&COCO",
      otevritVEshopu: (nazev: string) => `${nazev} — otevřít v e-shopu`,
      prohlednout: "Prohlédnout v e-shopu",
      ctaEyebrow: "Nevíš, čím začít?",
      ctaNadpis: "Najdi svůj produkt podle chuti",
      ctaPopis:
        "Rychlý mikrobiomový kvíz ti ukáže produkty, které by tě mohly bavit.",
      ctaTlacitko: "Spustit kvíz",
      kategorie: WILD_COCO_KATEGORIE,
      popisy: WILD_COCO_POPIS,
      polozky: katalogTexty(WILD_COCO_CATALOG, {}, "wild-coco/cs"),
    },
  },

  /* --- Věrnostní kategorie ------------------------------------------------ */
  vernost: {
    kategorie: CATEGORY_LABEL as Record<ProductCategory, string>,
    kategorieDlouhe: CATEGORY_LABEL_LONG as Record<ProductCategory, string>,
    razitkoZiskano: (cislo: number) => `Razítko ${cislo} získáno`,
    volnePolicko: (cislo: number) => `Volné políčko ${cislo}`,
  },

  /* --- Kvíz: společné + varianta „mikrobiom“ ------------------------------ */
  kviz: {
    titulek: "Odemkni potenciál svého mikrobiomu — kvíz",
    vyberNadpis: "Vyber si svůj kvíz",
    vyberPopis:
      "Každý můžeš dokončit jednou. Odpovědi zůstávají jen ve tvém telefonu.",
    variantaMikrobiom: "Mikrobiom",
    variantaMikrobiomPopis: "Rychlý kvíz · 3 otázky",
    variantaProfil: "Longevity profil",
    variantaProfilPopis: "Podrobnější kvíz · 9 otázek",
    doporuceny: "Doporučený pro tento QR",
    hotovo: "Hotovo ✓",
    vybrat: "Vybrat →",
    posilaTePred: "Posílá tě",
    posilaTePo: "z Longevity Baru.",

    /* Obě varianty dokončené — rozcestník nesmí skončit dvěma šedými kartami. */
    obeHotovoNadpis: "Oba kvízy máš hotové",
    obeHotovoPopis:
      "Další kupón z kvízu už na tebe nečeká — zato můžeš slevu darovat kamarádům nebo si projít celý sortiment.",
    obeHotovoDarek: "Darovat slevu kamarádům →",
    obeHotovoSortiment: "Prohlédnout sortiment WILD&COCO →",

    uvodNadpisPred: "Odemkni potenciál",
    uvodNadpisPo: "svého mikrobiomu!",
    hook: HOOK,
    odemknout: "Odemknout →",

    otazkaZe: (cislo: number, celkem: number) => `Otázka ${cislo} ze ${celkem}`,
    odemceno: "Odemčeno 🔓",
    nebo: "— nebo —",
    oblibeny: OBLIBENY_TEXT,

    q1: { text: OTAZKA_1_TEXT, moznosti: moznostiPodleHodnoty(OTAZKA_1) },
    q2: { text: OTAZKA_2_TEXT, moznosti: moznostiPodleHodnoty(OTAZKA_2) },
    q3: { text: OTAZKA_3_TEXT, moznosti: moznostiPodleHodnoty(OTAZKA_3) },

    vyberOblibenyNadpis: "Tvůj oblíbený produkt",
    vyberDoporuceneNadpis: "Tohle tvůj mikrobiom miluje",
    vyberOblibenyPopis: `Najdi ten svůj — na který produkt chceš mít až do konce roku slevu ${SLEVA_PROCENT} %?`,
    vyberDoporucenePopisPred: "Odemkni jeho potenciál každé ráno. Vyber si",
    vyberJedenProdukt: "jeden produkt",
    vyberDoporucenePopisPo: `— na něj dostaneš kupón ${SLEVA_PROCENT} %.`,
    kuponPlatiVEshopu: "Kupón platí na e-shopu wildandcoco.com, ne u stánku.",

    formularNadpis: "Kam ti kupón pošleme?",
    formularSlevaPred: `${SLEVA_PROCENT} % na`,
    zmenitProdukt: "Změnit produkt",
    posilam: "Posílám…",
    chciKupon: `Chci kupón ${SLEVA_PROCENT} %`,
    souhlas:
      "Kontakt použijeme na poslání kupónu a Longevity tipů od WILD&COCO nejdéle do 31. 12. 2026 (max. 6 zpráv). Souhlas můžeš kdykoli odvolat, detaily v Pravidlech níže. Odpovědi z kvízu si neukládáme.",

    vyhraNadpis: "Máš to! 🎉",
    vyhraKuponPred: `Kupón ${SLEVA_PROCENT} % na`,
    kodKuponu: "Kód kupónu",
    nakoupit: "Nakoupit na wildandcoco.com",
    pokracovatDoAppky: "Pokračovat do Longevity Bar appky →",
    emailOdeslanPred: "Kupón ti letí i na",
    emailOdeslanPo: "— mrkni i do spamu.",
    emailNeodeslanPred: "E-mail se nám teď nepodařilo odeslat — kód si prosím",
    emailNeodeslanZvyraznene: "vyfoť nebo opiš",
    emailNeodeslanPo: ".",

    podminky: KUPON_PODMINKY,
    podminkyFallback: KUPON_PODMINKY_FALLBACK,

    kategorie: KATEGORIE_LABEL as Record<Kategorie, string>,
  },

  /* --- Kvíz: varianta „Longevity profil“ ---------------------------------- */
  kvizProfil: {
    uvodNadpisPred: "Najdi si svou",
    uvodNadpisPo: "WILD&COCO rutinu",
    hook: PROFIL_HOOK,
    disclaimer: PROFIL_DISCLAIMER,
    jdemeNaTo: "Jdeme na to →",
    hotovo: "Hotovo ✨",
    otazkaZ: (cislo: number, celkem: number) => `Otázka ${cislo} z ${celkem}`,
    vyberNadpis: "Tvoje rutina na míru",
    vyberPopisPred: "Vyber si",
    vyberJedenProdukt: "jeden produkt",
    vyberPopisPo: `— na něj dostaneš kupón ${SLEVA_PROCENT} %.`,

    /** Texty otázek v pořadí `PROFIL_OTAZKY`. */
    otazky: PROFIL_OTAZKY.map((o) => o.text) as string[],
    /** Odpovědi `[index otázky][index možnosti]`. */
    moznosti: PROFIL_OTAZKY.map((o) => o.moznosti.map((m) => m.text)) as string[][],
    /** Názvy profilů P1–P10 — produktové kategorie, ne diagnózy. */
    profily: Object.fromEntries(
      PROFILY.map((p) => [p.id, p.nazev]),
    ) as Record<string, string>,

    vyhodnoceni: VYHODNOCENI_TEXTY as Record<string, string>,
    persony: Object.fromEntries(
      PERSONY.map((p) => [
        p.profilId,
        {
          persona: p.persona,
          esence: p.esence,
          pribeh: p.pribeh,
          procProdukty: p.procProdukty,
        },
      ]),
    ) as Record<
      string,
      { persona: string; esence: string; pribeh: string; procProdukty: string }
    >,
    postrehy: POSTREHY_TEXTY as Record<string, string>,
  },

  /* --- Chybové hlášky serveru --------------------------------------------- */
  chyby: {
    neprihlasen: "Nejsi přihlášený.",
    neplatnyPozadavek: "Neplatný požadavek.",
    rozbiloSe: "Něco se rozbilo. Načti prosím QR kód znovu.",
    prihlasSeAOtevriKviz:
      "Nejdřív se prosím přihlas telefonním číslem a kvíz otevři znovu.",
    kuponUzPoslan:
      "Kupón už jsme ti před chvílí poslali — mrkni do e-mailu, i do spamu.",
    variantaHotova:
      "Tuto variantu kvízu už máš dokončenou. Vyber si prosím druhou.",
    kvizNedokoncen: "Kvíz se teď nepodařilo dokončit. Zkus to prosím znovu.",
    osobniKuponSelhal:
      "Osobní kupón se nepodařilo vytvořit. Zkus to prosím za chvíli znovu.",
    zapisSelhal: "Nepodařilo se to uložit. Zkus to prosím ještě jednou.",
    potvrzeniSelhalo:
      "Kvíz je uložený, ale potvrzení se nepodařilo. Obrať se prosím na tým Longevity Baru.",
    napisJmeno: "Napiš nám prosím svoje křestní jméno.",
    zkontrolujEmail: "Zkontroluj prosím e-mail — kupón ti na něj pošleme.",
    telefonNesedi: "Telefon nám nesedí. Zkus ho zadat znovu.",
    kodNesedi: "Kód nesedí nebo vypršel.",
    overeniSelhalo: "Ověření se nepodařilo. Zkus to znovu.",
    vyberSelhal: "Výběr se nepodařil, zkus to prosím znovu.",
    vydejSelhal: "Výdej se nepodařil, zkus to prosím znovu.",
    kreditNedostupny: "Kredit se teď nepodařilo načíst. Zkus to prosím za chvíli.",
    kreditNemas: "Kredit na Longevity Baru pro tebe nemáme.",
    objednavkaNesmysl: "Objednávka nedává smysl. Zkus výběr znovu.",
    chybiObjednavka: "Chybí objednávka k výdeji.",
    objednavkaVydana: "Tahle objednávka už je vydaná, nebo neexistuje.",
    zadejPlatnyEmail: "Zadej platný e-mail.",
    zadejPlatnyTelefon: "Zadej platné telefonní číslo.",
    prilisMnohoPokusu: "Příliš mnoho pokusů. Nech si poslat nový kód.",
    kodNeodeslan: "Kód se teď nepodařilo odeslat. Zkus to za chvíli.",
    aktivacniEmailNepripraven: "Aktivační e-mail se nepodařilo připravit.",
    aktivacniEmailNeodeslan: "Aktivační e-mail se nepodařilo odeslat.",
    /** Stavy z `lib/loyalty-server.ts` — klíč = `status` z odpovědi. */
    odmena: {
      email_unverified:
        "Nejdřív potvrď svůj e-mail. Poslali jsme ti nový ověřovací e-mail, pokud od posledního uběhlo alespoň 10 minut.",
      no_reward: "Zatím nemáš nárok na odměnu.",
      bad_product: "Tenhle produkt teď nejde vybrat — nejspíš je vyprodaný.",
      already_redeemed: "Tahle odměna už byla vydaná.",
      not_selected: "Nejdřív je potřeba vybrat konkrétní produkt.",
      not_found: "Odměnu se nepodařilo najít.",
      bad_pin: "Nesprávný PIN obsluhy.",
    },
  },

  /* --- E-maily ------------------------------------------------------------ */
  email: {
    kuponPredmet: (produkt: string) =>
      `Tvůj kupón ${SLEVA_PROCENT} % na ${produkt}`,
    kuponPozdrav: (jmeno: string) => `Ahoj ${jmeno},`,
    kuponNadpis: `Tvůj kupón na ${SLEVA_PROCENT} % 🦠`,
    kuponUvodPred: "Tvůj mikrobiom si řekl o",
    kuponUvodPo: ".",
    kuponTextUvod: (produkt: string) =>
      `tvůj mikrobiom si dnes řekl o ${produkt} — tady je kupón na ${SLEVA_PROCENT} % slevy:`,
    kuponKodLabel: "Kód kupónu",
    kuponTlacitko: "Nakoupit na wildandcoco.com",
    kuponVlozPred: "Kód vlož v košíku na",
    kuponVlozPo: ".",
    kuponRozlouceni: "Ať ti chutná!",
    kuponPodpis: "Wild & Coco · Longevity Bar",
    aktivacePredmet: "Aktivuj si odměny v Longevity Baru",
    aktivaceTelo:
      "Ahoj! Vítej ve věrnostním programu Longevity baru. Jsi ready na naše odměny? Pokud ano, aktivuj svůj účet zde.",
    aktivaceOdkazSlovo: "zde",
  },
};
