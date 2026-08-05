/**
 * Obsah obrazovky „Longevity profil“ — vyhodnocení profilového kvízu.
 *
 * VŠECHNY texty vyhodnocení žijí tady, ne v komponentě. Důvod je budoucí
 * anglická lokalizace: přeloží se tenhle jeden modul, komponenta zůstane.
 *
 * Vyhodnocení je čistá funkce odpovědí — stejných devět indexů dá vždy stejný
 * text. Nic se nikam neukládá, na server jde jen varianta kvízu a vybraný
 * produkt (zákaz z handoffu 5. 8. 2026).
 *
 * PRÁVNÍ RÁMEC: žádná zdravotní tvrzení. Mluvíme o rutině, chuti, praktičnosti,
 * fermentaci a mikrobiomu jako o péči — nikdy o léčbě, nemoci ani diagnóze.
 * Zakázaná slova hlídá `scripts/check-kviz-profil.ts` (léčí, vyléčí, nemoc,
 * diagnóz, alergi, intoleranc, probiotik). Slovo „probiotický“ se v nových
 * textech nepoužívá — píšeme „fermentované“, „kultury“, „mikrobiom“.
 */

import { PROFILY, PROFIL_OTAZKY, vyhodnotitProfil } from "./kviz-profil";

/* -------------------------------------------------------------------------- */
/* Statické texty obrazovky                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Popisky UI vyhodnocení. Emoji nadpisu je záměrně samostatné pole: v `h1` by
 * rozbilo sazbu i účaří (stejná lekce jako v `KvizFlow.tsx`), proto se vykresluje
 * nad nadpisem, ne v něm.
 */
export const VYHODNOCENI_TEXTY = {
  /** Věta na vstupní obrazovce profilové varianty. */
  uvodniOtazka: "Zajímá tě, jaký je tvůj Longevity profil?",
  nadpisEmoji: "🧬",
  nadpisPrefix: "Tvůj Longevity profil:",
  nadpisPostrehy: "Co z tvých odpovědí čteme",
  nadpisProcProdukty: "Proč právě tyhle produkty",
  tlacitkoNabidka: "Zobraz mi nabídku",
  tlacitkoKatalog: "Chci si vybrat z celého sortimentu",
  katalogEmoji: "🛍️",
} as const;

/* -------------------------------------------------------------------------- */
/* Persona vrstva — archetyp ke každému profilu P1–P10                         */
/* -------------------------------------------------------------------------- */

export type PersonaProfil = {
  /** „P1“ … „P10“ — musí odpovídat `PROFILY` v `kviz-profil.ts`. */
  profilId: string;
  /** Krátké lidské jméno archetypu. Bez zdravotních konotací. */
  persona: string;
  /** Jedna věta do souvětí při remíze — esence archetypu. */
  esence: string;
  /** 2–3 věty: co ta rutina o člověku říká, co ho baví a co potřebuje. */
  pribeh: string;
  /** 2–3 věty: proč tahle sada produktů odpovídá jeho odpovědím. */
  procProdukty: string;
};

/**
 * Deset archetypů ke schválené mapě profilů. Pořadí kopíruje `PROFILY`, ale
 * hledá se přes `profilId` — přeházení pole nesmí rozbít párování.
 */
export const PERSONY: PersonaProfil[] = [
  {
    profilId: "P1",
    persona: "Domácí tvůrce",
    esence: "jídlo tě baví nejvíc ve chvíli, kdy vzniká pod tvýma rukama",
    pribeh:
      "Baví tě, když jídlo vzniká pod tvýma rukama, ne když ho jen vyndáš z obalu. " +
      "Máš doma sklenice, trpělivost a chuť zkoušet, co se příště povede líp. " +
      "Kokos je pro tebe surovina, ne hotový výrobek.",
    procProdukty:
      "Proto ti skládáme základ na domácí výrobu: dužinu, pyré a kokosová mléka, ze kterých si vlastní jogurt uděláš přesně podle sebe. " +
      "Hotový symbiotický jogurt v sadě slouží jako startovací kultura, aby fermentace naskočila bez hádání. " +
      "Kokosový nektar pak doladí sladkost — je to sada na tvoření, ne na jedno použití.",
  },
  {
    profilId: "P2",
    persona: "Svěží minimalista",
    esence: "chceš jednu dobrou věc, otevřít a mít hotovo",
    pribeh:
      "Nepotřebuješ deset kroků a pět ingrediencí — chceš jednu dobrou věc, otevřít a jít dál. " +
      "Tvoje rutina stojí na jednoduchosti a na tom, aby chuť byla čistá. " +
      "Co nepoznáš ze složení, to do košíku nedáváš.",
    procProdukty:
      "Raw kokosová voda je přesně tenhle formát: nic navíc, jen to, co v kokosu vzniklo. " +
      "Vezmeš ji s sebou, vypiješ během pár minut a doplníš tekutiny bez cukrové bomby. " +
      "Tři varianty ti nechají prostor najít tu, která ti chutná nejvíc.",
  },
  {
    profilId: "P3",
    persona: "Kokosový objevitel",
    esence: "zajímá tě, co všechno z jedné suroviny jde vytáhnout",
    pribeh:
      "Kokos tě zajímá dál než jako chuť do smoothie — chceš vědět, co všechno z něj jde. " +
      "Ceníš si lehkosti, svěžesti a produktů, u kterých poznáš, z čeho jsou. " +
      "Objevování tě baví víc než jeden zaběhnutý nákup.",
    procProdukty:
      "Sada mladého kokosu ti otevře celou škálu — od dužiny a pyré přes vodu až po fermentované varianty. " +
      "Můžeš si postupně projít, co ti sedí: co si dáš rovnou, co zamícháš a co necháš vykvasit. " +
      "Fermentované kousky v sadě přitom ukážou, jak jinak umí ta samá surovina chutnat.",
  },
  {
    profilId: "P4",
    persona: "Ranní rituálista",
    esence: "ráno pro tebe není nutnost, ale nejlepší část dne",
    pribeh:
      "Ráno pro tebe není nutnost, ale nejlepší část dne. " +
      "Chceš misku, do které se těšíš, a snídani, která tě v klidu udrží až do oběda. " +
      "Vydatnost a chuť si u tebe nekonkurují.",
    procProdukty:
      "Stavíme proto na krémovém fermentovaném základu, do kterého si přisypeš granolu, chia nebo přidáš pomazánku podle nálady. " +
      "Kokosové kultury a poctivá porce ti dají ráno, které chutná a připravíš ho za minutu. " +
      "Obměňovat můžeš každý den — rituál zůstává stejný.",
  },
  {
    profilId: "P5",
    persona: "Fermentační duše",
    esence: "kyselé a živé chutě ti chybí, když je den nemáš",
    pribeh:
      "Kyselé, živé a výrazné chutě ti nejsou cizí — spíš ti chybí, když je den nemáš. " +
      "Fermentace pro tebe není trend, ale způsob, jak jídlu dát hloubku. " +
      "Poznáš rozdíl mezi dobře a špatně vedeným kvašením a je ti to znát na výběru.",
    procProdukty:
      "Cocofir je fermentovaný nápoj z mladého kokosu — přesně ten typ výrazné chuti, kterou hledáš. " +
      "Různé příchutě ti dovolí střídat, aby to nezevšednělo, a šestikusy udrží zásobu doma. " +
      "Živé kultury tak máš po ruce každý den, a to úplně bez přípravy.",
  },
  {
    profilId: "P6",
    persona: "Dynamický hybatel",
    esence: "strava se přizpůsobuje tvému pohybu, ne naopak",
    pribeh:
      "Jsi v pohybu a tvoje strava se tomu musí přizpůsobit, ne naopak. " +
      "Potřebuješ něco, co zvládneš po tréninku nebo mezi dvěma schůzkami, a co ti dá víc než jen chuť. " +
      "Míchání prášků a shánění lžičky do toho nepatří.",
    procProdukty:
      "Proteinové Cocofiry spojují fermentovaný kokosový základ s porcí bílkovin v jedné lahvičce. " +
      "Otevřeš a jdeš dál — nic se nemíchá, nic se nepřipravuje dopředu. " +
      "Šestikusy dávají smysl ve chvíli, kdy víš, že to budeš potřebovat pravidelně, ne jednou za měsíc.",
  },
  {
    profilId: "P7",
    persona: "Cílený optimalizátor",
    esence: "chceš jasnou formu, jasnou dávku a jasné místo ve dni",
    pribeh:
      "Nechodíš kolem horké kaše — chceš vědět, co bereš a proč. " +
      "Oceňuješ, když má věc jasnou formu, jasnou dávku a jasné místo v denním pořádku. " +
      "Chuť je až druhá otázka, první je, aby to fungovalo v běžném dni.",
    procProdukty:
      "Kapsle jsou nejpřímější způsob, jak dostat kultury do rutiny bez řešení chuti, chlazení a porcování. " +
      "Vezmeš jednu ráno a máš hotovo, ať jsi kdekoli. " +
      "Několik variant ti dovolí vybrat tu, která ti nejlíp sedne do zbytku jídelníčku.",
  },
  {
    profilId: "P8",
    persona: "Rostlinný gurmán",
    esence: "rostlinná kuchyně ti nepřijde jako omezení, ale jako hřiště",
    pribeh:
      "Rostlinná kuchyně ti nepřijde jako omezení, ale jako hřiště. " +
      "Chceš obědy a večeře, u kterých nikomu nic nechybí, protože chuť stojí sama o sobě. " +
      "Poctivý talíř je pro tebe důležitější než rychlé zahnání hladu.",
    procProdukty:
      "Tempeh, kváskové chleby, fermentovaná zelenina a pomazánky jsou stavební kameny, ze kterých složíš plnohodnotný talíř. " +
      "Většina věcí je hotová — jen ohřeješ, nakrájíš a doplníš, co máš doma. " +
      "Fermentované položky navíc přinesou chuťovou hloubku, kterou z čerstvé zeleniny nedostaneš.",
  },
  {
    profilId: "P9",
    persona: "Krémový klasik",
    esence: "jedna miska, lžička a hotovo — nekomplikuješ to",
    pribeh:
      "Vyhovuje ti, když se věci nekomplikují: jedna miska, lžička a hotovo. " +
      "Krémová konzistence a mírná chuť ti sedí víc než výrazné experimenty. " +
      "Chceš mít v lednici jistotu, ne dobrodružství.",
    procProdukty:
      "Cocoguard je fermentovaný kokosový krém — jemný základ, který se hodí ráno, k obědu i večer. " +
      "Můžeš ho jíst samotný, nebo do něj přidat cokoli, na co máš zrovna chuť. " +
      "Různé velikosti balení ti dovolí zvolit podle toho, jak často ho budeš mít doma.",
  },
  {
    profilId: "P10",
    persona: "Vědomý vybírač",
    esence: "než něco koupíš, přečteš si složení — a víš proč",
    pribeh:
      "Než něco koupíš, přečteš si složení — a víš proč. " +
      "Vybíráš pečlivě a chceš mít jistotu, že to, co si dáš, zapadne do tvojí skladby jídelníčku. " +
      "Kompromis v surovinách u tebe nemá šanci.",
    procProdukty:
      "Tahle sada je poskládaná z položek bez mléka a lepku, takže v ní nemusíš nic luštit. " +
      "Najdeš tu chleba, fermentované věci i kokosové základy na vaření — dost na to, aby se den netočil dokola kolem jednoho jídla. " +
      "Všechno je připravené tak, aby to zapadlo do běžného dne bez plánování navíc.",
  },
];

/** Rychlé hledání archetypu podle id profilu. */
const PERSONA_PODLE_ID = new Map(PERSONY.map((p) => [p.profilId, p]));

/**
 * Kontrola při načtení modulu: chybějící archetyp by se jinak projevil až na
 * obrazovce hosta jako prázdný nadpis. Radši spadnout hned při startu appky.
 */
for (const profil of PROFILY) {
  if (!PERSONA_PODLE_ID.has(profil.id)) {
    throw new Error(`kviz-profil-vyhodnoceni: chybí persona pro profil ${profil.id}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Osobní postřehy z odpovědí                                                  */
/* -------------------------------------------------------------------------- */

export type Postreh = {
  emoji: string;
  /** 1–2 věty, přátelské tykání, žádné zdravotní tvrzení. */
  text: string;
};

/** Kolik postřehů se maximálně vejde na obrazovku, aby zůstala čitelná. */
const MAX_POSTREHU = 4;

/**
 * Indexy otázek v `PROFIL_OTAZKY`. Pojmenované konstanty, protože pořadí otázek
 * je jediná vazba mezi tímhle modulem a maticí — číslo v kódu by se při úpravě
 * kvízu tiše rozešlo s významem.
 */
const Q_VARENI = 0;
const Q_STYL = 1;
const Q_PLANOVANI = 4;
const Q_FERMENTY = 6;
const Q_PO_JIDLE = 7;
const Q_TRAVENI = 3;
const Q_REAKTIVITA = 8;

const POSTREHY_TRAVENI: Postreh[] = [
  {
    emoji: "👍",
    text:
      "Trávení ti šlape a to je skvělý základ. " +
      "Dává smysl na něm stavět dlouhodobě — ber fermentované věci jako každodenní zvyk, ne jako jednorázovou akci.",
  },
  {
    emoji: "🌿",
    text:
      "Občas je tvoje trávení citlivější a tomu se dá rutina přizpůsobit. " +
      "Jemná denní dávka fermentovaných produktů funguje líp než velké nárazy — klidně malá porce ke snídani.",
  },
  {
    emoji: "🐢",
    text:
      "Máš citlivé trávení, tak to neber hopem. " +
      "Začni malou porcí, drž ji pravidelně a přidávej až ve chvíli, kdy ti to sedne — pomalý start je tady výhoda.",
  },
];

const POSTREH_REAKTIVITA: Postreh = {
  emoji: "👂",
  text:
    "Píšeš, že po některých jídlech na sobě něco poznáš — tvoje tělo mluví a stojí za to mu naslouchat. " +
    "Vybírej spíš jemné, šetrné varianty a zkoušej novinky po jedné, ať víš, co ti sedí.",
};

const POSTREH_PO_JIDLE: Postreh = {
  emoji: "⚡",
  text:
    "Po jídle na tebe padá únava nebo přijde žízeň. " +
    "Zkus lehčí formáty a menší porce rozložené do dne — a hlídej si pitný režim, často je právě on tím rozdílem.",
};

const POSTREHY_FERMENTY: Postreh[] = [
  {
    emoji: "🫧",
    text:
      "Fermenty máš denně a to je znát. " +
      "Teď už jde spíš o prohlubování — střídej chutě a formáty, ať je rutina pestrá a nezevšední.",
  },
  {
    emoji: "🔁",
    text:
      "Fermentované věci si dáváš občas. " +
      "Zkus z toho udělat pravidelnost — malá porce každý den udělá pro tvůj mikrobiom víc než velká jednou za čas.",
  },
  {
    emoji: "🌱",
    text:
      "S fermenty teprve začínáš, tak do toho jdi v klidu. " +
      "Vyber si jednu chuť, která ti sedne, dej si malou porci a nech si pár dní, než přidáš další.",
  },
];

const POSTREHY_STYL: Postreh[] = [
  {
    emoji: "🏃",
    text:
      "Hýbeš se hodně, takže bílkoviny a pitný režim jsou tvoje dvě hlavní páky. " +
      "Hledej formáty, které vezmeš s sebou a dáš si je hned po pohybu.",
  },
  {
    emoji: "🧘",
    text:
      "Řešíš stres a chceš být odolnější. " +
      "Krátké rituály kolem jídla — pomalá snídaně, teplý nápoj, chvíle bez telefonu — udělají často víc než cokoli v košíku.",
  },
  {
    emoji: "🥗",
    text:
      "Jde ti o dlouhodobou pravidelnost, ne o jednorázový výkon. " +
      "To je ta správná optika — vybírej věci, které si dokážeš dát opravdu každý den.",
  },
];

/**
 * Postřeh z dvojice „vztah k vaření“ + „jak plánuješ jídlo“. Vrací vždy právě
 * jeden — díky tomu má i ta nejméně vyhraněná kombinace odpovědí aspoň tři
 * postřehy (trávení + životní styl + tenhle).
 */
function postrehVareniAPlanovani(vareni: number, planovani: number): Postreh {
  if (vareni === 0 && planovani === 0) {
    return {
      emoji: "👩‍🍳",
      text:
        "Vaříš ráda/rád a každý den chceš novou inspiraci. " +
        "Ber proto suroviny, ne hotové výrobky — z dužiny, pyré a mléka složíš pokaždé něco trochu jiného.",
    };
  }
  if (vareni === 0) {
    return {
      emoji: "🥄",
      text:
        "Doma si s jídlem ráda/rád hraješ. " +
        "Suroviny a domácí výroba ti dají největší radost a zároveň úplnou kontrolu nad tím, co nakonec sníš.",
    };
  }
  if (planovani === 1) {
    return {
      emoji: "📅",
      text:
        "Plánuješ na celý týden dopředu. " +
        "Vsaď na delší trvanlivost a větší balení — ušetříš si rozhodování každý den znovu.",
    };
  }
  return {
    emoji: "🍽️",
    text:
      "Chceš to rychlé a hotové. " +
      "Vybírej formáty, které jen otevřeš — hotová miska nebo lahvička ti ráno ušetří víc času než jakýkoli recept.",
  };
}

/**
 * Sestaví 2–4 osobní postřehy z konkrétních odpovědí. Deterministické: stejné
 * indexy dají vždy stejné postřehy ve stejném pořadí.
 *
 * Pořadí je zároveň prioritou — trávení, reaktivita, stav po jídle a fermenty
 * jsou nejosobnější, proto jdou první a případný přetlak ořízne až obecnější
 * životní styl a vztah k vaření.
 *
 * Neplatný vstup (jiná délka než počet otázek, index mimo rozsah) vrací prázdné
 * pole, nevyhazuje výjimku — UI z něj nesmí spadnout.
 */
export function sestavitPostrehy(vybraneIndexy: number[]): Postreh[] {
  if (vybraneIndexy.length !== PROFIL_OTAZKY.length) return [];
  for (let q = 0; q < PROFIL_OTAZKY.length; q += 1) {
    const index = vybraneIndexy[q];
    if (!Number.isInteger(index)) return [];
    if (index < 0 || index >= PROFIL_OTAZKY[q].moznosti.length) return [];
  }

  const postrehy: Postreh[] = [
    POSTREHY_TRAVENI[vybraneIndexy[Q_TRAVENI]],
  ];

  // Jen kladná odpověď („reaguju“ / „bývám unavená“) něco vypovídá — „nic z toho“
  // není postřeh, ale prázdné místo.
  if (vybraneIndexy[Q_REAKTIVITA] === 0) postrehy.push(POSTREH_REAKTIVITA);
  if (vybraneIndexy[Q_PO_JIDLE] === 0) postrehy.push(POSTREH_PO_JIDLE);

  postrehy.push(POSTREHY_FERMENTY[vybraneIndexy[Q_FERMENTY]]);
  postrehy.push(POSTREHY_STYL[vybraneIndexy[Q_STYL]]);
  postrehy.push(
    postrehVareniAPlanovani(vybraneIndexy[Q_VARENI], vybraneIndexy[Q_PLANOVANI]),
  );

  return postrehy.slice(0, MAX_POSTREHU);
}

/* -------------------------------------------------------------------------- */
/* Celé vyhodnocení                                                            */
/* -------------------------------------------------------------------------- */

export type Vyhodnoceni = {
  /** Vítězné archetypy v pořadí P1→P10. */
  persony: PersonaProfil[];
  /** Jméno do nadpisu — „X“, „X & Y“ nebo „X & Y a ještě něco navíc“. */
  personaNadpis: string;
  /** Úvodní věta; u remízy ji přiznává jako přednost. */
  uvod: string;
  pribeh: string;
  postrehy: Postreh[];
  procProdukty: string;
};

/** Doplněk k `procProdukty`, když se ve výsledku potkalo víc archetypů. */
const PROC_PRODUKTY_REMIZA =
  "Nabídku jsme proto poskládali z obou směrů — vybírej podle toho, co tě dneska láká víc.";
const PROC_PRODUKTY_REMIZA_VICE =
  "Nabídku jsme proto poskládali z několika směrů najednou — vybírej podle toho, co tě dneska láká nejvíc.";

function sestavitNadpis(persony: PersonaProfil[]): string {
  if (persony.length === 1) return persony[0].persona;
  const dva = `${persony[0].persona} & ${persony[1].persona}`;
  return persony.length === 2 ? dva : `${dva} a ještě něco navíc`;
}

function sestavitUvod(persony: PersonaProfil[]): string {
  if (persony.length === 1) {
    return `Z tvých odpovědí vychází jeden jasný archetyp — ${persony[0].persona}.`;
  }
  if (persony.length === 2) {
    return (
      `V tobě se potkává ${persony[0].persona} a ${persony[1].persona}. ` +
      "Není to zmatek, ale přednost — máš širší rejstřík než většina lidí."
    );
  }
  return (
    `V tobě se potkává ${persony[0].persona}, ${persony[1].persona} a ještě něco navíc. ` +
    "Není to zmatek, ale přednost — tvoje chuť se do jedné škatulky prostě nevejde."
  );
}

function sestavitPribeh(persony: PersonaProfil[]): string {
  const zaklad = persony[0].pribeh;
  if (persony.length === 1) return zaklad;
  const druhy = `A zároveň je v tobě pořádný kus druhého archetypu: ${persony[1].esence}.`;
  if (persony.length === 2) return `${zaklad} ${druhy}`;
  return `${zaklad} ${druhy} A tím to nekončí — tvoje odpovědi sedí ještě na další rutiny.`;
}

function sestavitProcProdukty(persony: PersonaProfil[]): string {
  if (persony.length === 1) return persony[0].procProdukty;
  const doplnek =
    persony.length === 2 ? PROC_PRODUKTY_REMIZA : PROC_PRODUKTY_REMIZA_VICE;
  return `${persony[0].procProdukty} ${doplnek}`;
}

/**
 * Poskládá celé vyhodnocení z devíti odpovědí — archetyp(y), příběh, osobní
 * postřehy i zdůvodnění nabídky. Čistá a deterministická funkce.
 *
 * Vítěze si dopočítá sama přes `vyhodnotitProfil`, aby se text nemohl rozejít
 * s produkty na další obrazovce.
 *
 * `null` = neplatný vstup nebo prázdný výsledek matice; volající musí ošetřit
 * (v UI to znamená zpátky na první otázku).
 */
export function sestavitVyhodnoceni(vybraneIndexy: number[]): Vyhodnoceni | null {
  const vysledek = vyhodnotitProfil(vybraneIndexy);
  if (vysledek.profilId.length === 0) return null;

  const persony = vysledek.profilId
    .map((id) => PERSONA_PODLE_ID.get(id))
    .filter((p): p is PersonaProfil => p !== undefined);
  if (persony.length === 0) return null;

  const postrehy = sestavitPostrehy(vybraneIndexy);
  if (postrehy.length === 0) return null;

  return {
    persony,
    personaNadpis: sestavitNadpis(persony),
    uvod: sestavitUvod(persony),
    pribeh: sestavitPribeh(persony),
    postrehy,
    procProdukty: sestavitProcProdukty(persony),
  };
}
