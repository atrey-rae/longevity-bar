/**
 * Obsah obrazovky „Longevity profil“ — vyhodnocení profilového kvízu.
 *
 * VŠECHNY texty vyhodnocení žijí tady, ne v komponentě. Od 6. 8. 2026 v OBOU
 * jazycích: český balík je beze změny (kontrolní skripty i schválená znění na
 * něm stojí), anglický je jeho zrcadlo se stejnými klíči.
 *
 * Vyhodnocení je čistá funkce odpovědí — stejných devět indexů dá vždy stejný
 * text. Nic se nikam neukládá, na server jde jen varianta kvízu a vybraný
 * produkt (zákaz z handoffu 5. 8. 2026).
 *
 * PRÁVNÍ RÁMEC: žádná zdravotní tvrzení. Mluvíme o rutině, chuti, praktičnosti,
 * fermentaci a mikrobiomu jako o péči — nikdy o léčbě, nemoci ani diagnóze.
 * Zakázaná slova hlídá `scripts/check-kviz-profil.ts` v obou jazycích
 * (léčí, vyléčí, nemoc, diagnóz, alergi, intoleranc, probiotik ·
 * cure, heal, disease, diagnos, allerg, intoleran, probiotic). Pozor na
 * anglické podřetězce: „healthy“ i „healing“ obsahují `heal`, „secure“ obsahuje
 * `cure` — v textech vyhodnocení se proto nesmí objevit.
 */

import type { Lang } from "./i18n/lang";
import { PROFILY, PROFIL_OTAZKY, vyhodnotitProfil } from "./kviz-profil";

/* -------------------------------------------------------------------------- */
/* Statické texty obrazovky                                                    */
/* -------------------------------------------------------------------------- */

export type VyhodnoceniTexty = {
  /** Věta na vstupní obrazovce profilové varianty. */
  uvodniOtazka: string;
  nadpisEmoji: string;
  nadpisPrefix: string;
  nadpisPostrehy: string;
  nadpisProcProdukty: string;
  tlacitkoNabidka: string;
  tlacitkoKatalog: string;
  katalogEmoji: string;
};

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

export const VYHODNOCENI_TEXTY_EN: VyhodnoceniTexty = {
  uvodniOtazka: "Curious what your Longevity profile looks like?",
  nadpisEmoji: "🧬",
  nadpisPrefix: "Your Longevity profile:",
  nadpisPostrehy: "What we read from your answers",
  nadpisProcProdukty: "Why these products",
  tlacitkoNabidka: "Show me the selection",
  tlacitkoKatalog: "I'd rather browse the whole range",
  katalogEmoji: "🛍️",
};

const TEXTY: Record<Lang, VyhodnoceniTexty> = {
  cs: VYHODNOCENI_TEXTY,
  en: VYHODNOCENI_TEXTY_EN,
};

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

/** Anglické zrcadlo `PERSONY` — stejná `profilId`, stejné pořadí. */
export const PERSONY_EN: PersonaProfil[] = [
  {
    profilId: "P1",
    persona: "Home Creator",
    esence: "food tastes best to you at the moment it takes shape in your hands",
    pribeh:
      "You enjoy food most when it comes together in your own kitchen, not when you simply peel off a lid. " +
      "You keep jars at home, you have the patience, and you like finding out what turns out better next time. " +
      "Coconut is an ingredient to you, not a finished product.",
    procProdukty:
      "So we've put together the base for making your own: coconut meat, purée and coconut milks you can turn into yoghurt exactly your way. " +
      "The ready-made symbiotic yoghurt in the set works as your starter culture, so fermentation gets going without guesswork. " +
      "Coconut nectar then fine-tunes the sweetness — this is a set for making things, not for one single use.",
  },
  {
    profilId: "P2",
    persona: "Fresh Minimalist",
    esence: "you want one good thing: open it and you're done",
    pribeh:
      "You don't need ten steps and five ingredients — you want one good thing, open it and move on. " +
      "Your routine is built on simplicity and on flavour staying clean. " +
      "If you can't recognise it on the label, it doesn't go in your basket.",
    procProdukty:
      "Raw coconut water is exactly that format: nothing added, just what grew inside the coconut. " +
      "You take it with you, drink it in a couple of minutes and top up your fluids without a sugar hit. " +
      "Three variants leave you room to find the one you like best.",
  },
  {
    profilId: "P3",
    persona: "Coconut Explorer",
    esence: "you want to know how far one single ingredient can go",
    pribeh:
      "Coconut interests you well beyond a flavour in a smoothie — you want to know everything it can do. " +
      "You value lightness, freshness and products where you can tell what they're made of. " +
      "Discovering things appeals to you more than one settled weekly shop.",
    procProdukty:
      "The young coconut set opens up the whole range — from meat and purée through water to fermented versions. " +
      "You can work through what suits you: what you eat straight away, what you blend and what you leave to ferment. " +
      "The fermented pieces in the set show how differently the very same ingredient can taste.",
  },
  {
    profilId: "P4",
    persona: "Morning Ritualist",
    esence: "mornings aren't a chore for you, they're the best part of the day",
    pribeh:
      "Mornings aren't a chore for you, they're the best part of the day. " +
      "You want a bowl you look forward to and a breakfast that carries you calmly through to lunch. " +
      "Substance and flavour don't compete with each other on your table.",
    procProdukty:
      "That's why we build on a creamy fermented base you can top with granola, chia or a spoonful of spread depending on your mood. " +
      "Coconut cultures and a generous portion give you a morning that tastes good and takes a minute to put together. " +
      "You can change it up every day — the ritual stays the same.",
  },
  {
    profilId: "P5",
    persona: "Fermentation Soul",
    esence: "sour, living flavours are what you miss on a day without them",
    pribeh:
      "Sour, living, pronounced flavours are nothing new to you — you rather miss them on a day without them. " +
      "Fermentation isn't a trend for you, it's a way of giving food depth. " +
      "You can taste the difference between a well-run and a careless ferment, and it shows in what you choose.",
    procProdukty:
      "Cocofir is a fermented drink made from young coconut — exactly the kind of pronounced flavour you're after. " +
      "The range of flavours lets you rotate so it never gets dull, and the six-packs keep a supply at home. " +
      "That way you have live cultures within reach every day, with no preparation at all.",
  },
  {
    profilId: "P6",
    persona: "Dynamic Mover",
    esence: "your food adapts to how much you move, not the other way round",
    pribeh:
      "You're on the move and your food has to adapt to that, not the other way round. " +
      "You need something you can manage after training or between two meetings, and that gives you more than just flavour. " +
      "Mixing powders and hunting for a spoon is not part of the plan.",
    procProdukty:
      "Protein Cocofirs combine a fermented coconut base with a portion of protein in a single bottle. " +
      "You open it and carry on — nothing to mix, nothing to prepare in advance. " +
      "Six-packs make sense the moment you know you'll want this regularly, not once a month.",
  },
  {
    profilId: "P7",
    persona: "Focused Optimiser",
    esence: "you want a clear format, a clear dose and a clear place in your day",
    pribeh:
      "You don't beat about the bush — you want to know what you're taking and why. " +
      "You appreciate it when something has a clear format, a clear dose and a clear place in the daily order of things. " +
      "Flavour is the second question; the first is that it works on an ordinary day.",
    procProdukty:
      "Capsules are the most direct way to bring cultures into your routine without dealing with taste, chilling and portioning. " +
      "You take one in the morning and that's it, wherever you happen to be. " +
      "Several variants let you pick the one that fits best around the rest of what you eat.",
  },
  {
    profilId: "P8",
    persona: "Plant-Based Gourmet",
    esence: "plant-based cooking feels like a playground to you, not a limitation",
    pribeh:
      "Plant-based cooking feels like a playground to you, not a limitation. " +
      "You want lunches and dinners where nobody is left wanting, because the flavour stands on its own. " +
      "A proper plate matters more to you than quickly silencing hunger.",
    procProdukty:
      "Tempeh, sourdough breads, fermented vegetables and spreads are the building blocks of a full plate. " +
      "Most of it is ready — you just warm it, slice it and add whatever you have at home. " +
      "The fermented items bring a depth of flavour you won't get from fresh vegetables alone.",
  },
  {
    profilId: "P9",
    persona: "Creamy Classic",
    esence: "one bowl, one spoon, done — you don't overcomplicate it",
    pribeh:
      "You like it when things stay simple: one bowl, one spoon, done. " +
      "A creamy texture and a mild flavour suit you better than bold experiments. " +
      "You want certainty in your fridge, not an adventure.",
    procProdukty:
      "Cocoguard is a fermented coconut cream — a gentle base that works in the morning, at lunch and in the evening. " +
      "You can eat it on its own or stir in whatever you happen to fancy. " +
      "Different pack sizes let you choose according to how often you'll keep it at home.",
  },
  {
    profilId: "P10",
    persona: "Mindful Chooser",
    esence: "you read the label before you buy — and you know exactly why",
    pribeh:
      "You read the label before you buy — and you know exactly why. " +
      "You choose carefully and want to be sure that what you eat fits the way you put your meals together. " +
      "Compromising on ingredients stands no chance with you.",
    procProdukty:
      "This set is put together from dairy-free and gluten-free items, so there's nothing to decipher. " +
      "You'll find bread, fermented foods and coconut bases for cooking — enough that your day doesn't revolve around one single meal. " +
      "Everything is ready in a way that fits an ordinary day without extra planning.",
  },
];

const PERSONY_PODLE_JAZYKA: Record<Lang, PersonaProfil[]> = {
  cs: PERSONY,
  en: PERSONY_EN,
};

/** Rychlé hledání archetypu podle id profilu, pro každý jazyk zvlášť. */
const PERSONA_PODLE_ID: Record<Lang, Map<string, PersonaProfil>> = {
  cs: new Map(PERSONY.map((p) => [p.profilId, p])),
  en: new Map(PERSONY_EN.map((p) => [p.profilId, p])),
};

/**
 * Kontrola při načtení modulu: chybějící archetyp by se jinak projevil až na
 * obrazovce hosta jako prázdný nadpis. Radši spadnout hned při startu appky —
 * a to v obou jazycích, aby anglická verze nemohla tiše vypadnout.
 */
for (const profil of PROFILY) {
  for (const jazyk of ["cs", "en"] as const) {
    if (!PERSONA_PODLE_ID[jazyk].has(profil.id)) {
      throw new Error(
        `kviz-profil-vyhodnoceni: chybí persona (${jazyk}) pro profil ${profil.id}`,
      );
    }
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

/** Jeden jazykový balík postřehů. Emoji jsou napříč jazyky stejná. */
type PostrehyBalik = {
  traveni: [Postreh, Postreh, Postreh];
  reaktivita: Postreh;
  poJidle: Postreh;
  fermenty: [Postreh, Postreh, Postreh];
  styl: [Postreh, Postreh, Postreh];
  /** Postřeh z dvojice „vztah k vaření“ + „jak plánuješ jídlo“. */
  vareniPlanovani: {
    tvoriveDenne: Postreh;
    tvorive: Postreh;
    tydenniPlan: Postreh;
    rychle: Postreh;
  };
};

const POSTREHY_CS: PostrehyBalik = {
  traveni: [
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
  ],
  reaktivita: {
    emoji: "👂",
    text:
      "Píšeš, že po některých jídlech na sobě něco poznáš — tvoje tělo mluví a stojí za to mu naslouchat. " +
      "Vybírej spíš jemné, šetrné varianty a zkoušej novinky po jedné, ať víš, co ti sedí.",
  },
  poJidle: {
    emoji: "⚡",
    text:
      "Po jídle na tebe padá únava nebo přijde žízeň. " +
      "Zkus lehčí formáty a menší porce rozložené do dne — a hlídej si pitný režim, často je právě on tím rozdílem.",
  },
  fermenty: [
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
  ],
  styl: [
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
  ],
  vareniPlanovani: {
    tvoriveDenne: {
      emoji: "👩‍🍳",
      text:
        "Vaříš ráda/rád a každý den chceš novou inspiraci. " +
        "Ber proto suroviny, ne hotové výrobky — z dužiny, pyré a mléka složíš pokaždé něco trochu jiného.",
    },
    tvorive: {
      emoji: "🥄",
      text:
        "Doma si s jídlem ráda/rád hraješ. " +
        "Suroviny a domácí výroba ti dají největší radost a zároveň úplnou kontrolu nad tím, co nakonec sníš.",
    },
    tydenniPlan: {
      emoji: "📅",
      text:
        "Plánuješ na celý týden dopředu. " +
        "Vsaď na delší trvanlivost a větší balení — ušetříš si rozhodování každý den znovu.",
    },
    rychle: {
      emoji: "🍽️",
      text:
        "Chceš to rychlé a hotové. " +
        "Vybírej formáty, které jen otevřeš — hotová miska nebo lahvička ti ráno ušetří víc času než jakýkoli recept.",
    },
  },
};

const POSTREHY_EN: PostrehyBalik = {
  traveni: [
    {
      emoji: "👍",
      text:
        "Your digestion runs smoothly and that's a great starting point. " +
        "It makes sense to build on it for the long run — treat fermented foods as a daily habit, not a one-off.",
    },
    {
      emoji: "🌿",
      text:
        "Your digestion is sometimes on the sensitive side, and a routine can be shaped around that. " +
        "A gentle daily portion of fermented products works better than big bursts — a small serving with breakfast is plenty.",
    },
    {
      emoji: "🐢",
      text:
        "Your digestion is sensitive, so don't rush it. " +
        "Start with a small portion, keep it regular and add more only once it sits well — a slow start is an advantage here.",
    },
  ],
  reaktivita: {
    emoji: "👂",
    text:
      "You've told us some foods leave a mark on you — your body is talking and it's worth listening. " +
      "Go for the gentler, milder options and try new things one at a time, so you know what suits you.",
  },
  poJidle: {
    emoji: "⚡",
    text:
      "Tiredness or thirst tends to catch up with you after a meal. " +
      "Try lighter formats and smaller portions spread across the day — and keep an eye on how much you drink, that's often the difference.",
  },
  fermenty: [
    {
      emoji: "🫧",
      text:
        "You have ferments every day and it shows. " +
        "From here it's about going deeper — rotate flavours and formats so the routine stays varied and never gets dull.",
    },
    {
      emoji: "🔁",
      text:
        "You have fermented foods every now and then. " +
        "Try turning that into a rhythm — a small portion every day does more for your microbiome than a big one once in a while.",
    },
    {
      emoji: "🌱",
      text:
        "You're just getting started with ferments, so take it easy. " +
        "Pick one flavour that appeals to you, have a small portion and give yourself a few days before adding another.",
    },
  ],
  styl: [
    {
      emoji: "🏃",
      text:
        "You move a lot, so protein and fluids are your two main levers. " +
        "Look for formats you can take with you and have straight after you move.",
    },
    {
      emoji: "🧘",
      text:
        "You're dealing with stress and want to be more resilient. " +
        "Short rituals around food — a slow breakfast, a warm drink, a moment without your phone — often do more than anything in the basket.",
    },
    {
      emoji: "🥗",
      text:
        "You're after long-term consistency, not a one-off effort. " +
        "That's exactly the right lens — choose things you can genuinely have every single day.",
    },
  ],
  vareniPlanovani: {
    tvoriveDenne: {
      emoji: "👩‍🍳",
      text:
        "You love cooking and you want fresh inspiration every day. " +
        "So go for ingredients rather than finished products — coconut meat, purée and milk let you make something a little different every time.",
    },
    tvorive: {
      emoji: "🥄",
      text:
        "You like playing with food at home. " +
        "Raw ingredients and making things yourself will give you the most joy, and full control over what ends up on your plate.",
    },
    tydenniPlan: {
      emoji: "📅",
      text:
        "You plan a whole week ahead. " +
        "Go for longer shelf life and bigger packs — you'll save yourself the same decision every single day.",
    },
    rychle: {
      emoji: "🍽️",
      text:
        "You want it quick and ready. " +
        "Choose formats you simply open — a ready bowl or a bottle saves you more time in the morning than any recipe.",
    },
  },
};

const POSTREHY: Record<Lang, PostrehyBalik> = {
  cs: POSTREHY_CS,
  en: POSTREHY_EN,
};

/** Plochý pohled na balík postřehů — pro kontrolu parity a zakázaných slov. */
function plocheTexty(balik: PostrehyBalik): Record<string, string> {
  return {
    "traveni.0": balik.traveni[0].text,
    "traveni.1": balik.traveni[1].text,
    "traveni.2": balik.traveni[2].text,
    reaktivita: balik.reaktivita.text,
    poJidle: balik.poJidle.text,
    "fermenty.0": balik.fermenty[0].text,
    "fermenty.1": balik.fermenty[1].text,
    "fermenty.2": balik.fermenty[2].text,
    "styl.0": balik.styl[0].text,
    "styl.1": balik.styl[1].text,
    "styl.2": balik.styl[2].text,
    "vareniPlanovani.tvoriveDenne": balik.vareniPlanovani.tvoriveDenne.text,
    "vareniPlanovani.tvorive": balik.vareniPlanovani.tvorive.text,
    "vareniPlanovani.tydenniPlan": balik.vareniPlanovani.tydenniPlan.text,
    "vareniPlanovani.rychle": balik.vareniPlanovani.rychle.text,
  };
}

export const POSTREHY_TEXTY: Record<string, string> = plocheTexty(POSTREHY_CS);
export const POSTREHY_TEXTY_EN: Record<string, string> = plocheTexty(POSTREHY_EN);

/**
 * Postřeh z dvojice „vztah k vaření“ + „jak plánuješ jídlo“. Vrací vždy právě
 * jeden — díky tomu má i ta nejméně vyhraněná kombinace odpovědí aspoň tři
 * postřehy (trávení + životní styl + tenhle).
 */
function postrehVareniAPlanovani(
  vareni: number,
  planovani: number,
  balik: PostrehyBalik,
): Postreh {
  if (vareni === 0 && planovani === 0) return balik.vareniPlanovani.tvoriveDenne;
  if (vareni === 0) return balik.vareniPlanovani.tvorive;
  if (planovani === 1) return balik.vareniPlanovani.tydenniPlan;
  return balik.vareniPlanovani.rychle;
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
export function sestavitPostrehy(
  vybraneIndexy: number[],
  lang: Lang = "cs",
): Postreh[] {
  if (vybraneIndexy.length !== PROFIL_OTAZKY.length) return [];
  for (let q = 0; q < PROFIL_OTAZKY.length; q += 1) {
    const index = vybraneIndexy[q];
    if (!Number.isInteger(index)) return [];
    if (index < 0 || index >= PROFIL_OTAZKY[q].moznosti.length) return [];
  }

  const balik = POSTREHY[lang] ?? POSTREHY_CS;
  const postrehy: Postreh[] = [balik.traveni[vybraneIndexy[Q_TRAVENI]]];

  // Jen kladná odpověď („reaguju“ / „bývám unavená“) něco vypovídá — „nic z toho“
  // není postřeh, ale prázdné místo.
  if (vybraneIndexy[Q_REAKTIVITA] === 0) postrehy.push(balik.reaktivita);
  if (vybraneIndexy[Q_PO_JIDLE] === 0) postrehy.push(balik.poJidle);

  postrehy.push(balik.fermenty[vybraneIndexy[Q_FERMENTY]]);
  postrehy.push(balik.styl[vybraneIndexy[Q_STYL]]);
  postrehy.push(
    postrehVareniAPlanovani(
      vybraneIndexy[Q_VARENI],
      vybraneIndexy[Q_PLANOVANI],
      balik,
    ),
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

/** Spojovací fráze, kterými se z archetypů skládá souvětí. */
type Spojky = {
  /** Doplněk k `procProdukty`, když se ve výsledku potkalo víc archetypů. */
  procProduktyRemiza: string;
  procProduktyRemizaVice: string;
  nadpisVice: (dva: string) => string;
  uvodJeden: (persona: string) => string;
  uvodDva: (prvni: string, druhy: string) => string;
  uvodVice: (prvni: string, druhy: string) => string;
  pribehDruhy: (esence: string) => string;
  pribehVice: string;
};

const SPOJKY: Record<Lang, Spojky> = {
  cs: {
    procProduktyRemiza:
      "Nabídku jsme proto poskládali z obou směrů — vybírej podle toho, co tě dneska láká víc.",
    procProduktyRemizaVice:
      "Nabídku jsme proto poskládali z několika směrů najednou — vybírej podle toho, co tě dneska láká nejvíc.",
    nadpisVice: (dva) => `${dva} a ještě něco navíc`,
    uvodJeden: (persona) =>
      `Z tvých odpovědí vychází jeden jasný archetyp — ${persona}.`,
    uvodDva: (prvni, druhy) =>
      `V tobě se potkává ${prvni} a ${druhy}. ` +
      "Není to zmatek, ale přednost — máš širší rejstřík než většina lidí.",
    uvodVice: (prvni, druhy) =>
      `V tobě se potkává ${prvni}, ${druhy} a ještě něco navíc. ` +
      "Není to zmatek, ale přednost — tvoje chuť se do jedné škatulky prostě nevejde.",
    pribehDruhy: (esence) =>
      `A zároveň je v tobě pořádný kus druhého archetypu: ${esence}.`,
    pribehVice: "A tím to nekončí — tvoje odpovědi sedí ještě na další rutiny.",
  },
  en: {
    procProduktyRemiza:
      "So we've built the selection from both directions — pick whichever appeals to you more today.",
    procProduktyRemizaVice:
      "So we've built the selection from several directions at once — pick whichever appeals to you most today.",
    nadpisVice: (dva) => `${dva} and then some`,
    uvodJeden: (persona) =>
      `Your answers point to one clear archetype — the ${persona}.`,
    uvodDva: (prvni, druhy) =>
      `You're part ${prvni} and part ${druhy}. ` +
      "That's not confusion, it's range — you've got a broader repertoire than most.",
    uvodVice: (prvni, druhy) =>
      `You're part ${prvni}, part ${druhy} and then some. ` +
      "That's not confusion, it's range — your taste simply doesn't fit in one box.",
    pribehDruhy: (esence) =>
      `And there's a solid piece of a second archetype in you as well: ${esence}.`,
    pribehVice:
      "And it doesn't stop there — your answers fit a couple of other routines too.",
  },
};

function sestavitNadpis(persony: PersonaProfil[], spojky: Spojky): string {
  if (persony.length === 1) return persony[0].persona;
  const dva = `${persony[0].persona} & ${persony[1].persona}`;
  return persony.length === 2 ? dva : spojky.nadpisVice(dva);
}

function sestavitUvod(persony: PersonaProfil[], spojky: Spojky): string {
  if (persony.length === 1) return spojky.uvodJeden(persony[0].persona);
  if (persony.length === 2) {
    return spojky.uvodDva(persony[0].persona, persony[1].persona);
  }
  return spojky.uvodVice(persony[0].persona, persony[1].persona);
}

function sestavitPribeh(persony: PersonaProfil[], spojky: Spojky): string {
  const zaklad = persony[0].pribeh;
  if (persony.length === 1) return zaklad;
  const druhy = spojky.pribehDruhy(persony[1].esence);
  if (persony.length === 2) return `${zaklad} ${druhy}`;
  return `${zaklad} ${druhy} ${spojky.pribehVice}`;
}

function sestavitProcProdukty(
  persony: PersonaProfil[],
  spojky: Spojky,
): string {
  if (persony.length === 1) return persony[0].procProdukty;
  const doplnek =
    persony.length === 2
      ? spojky.procProduktyRemiza
      : spojky.procProduktyRemizaVice;
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
export function sestavitVyhodnoceni(
  vybraneIndexy: number[],
  lang: Lang = "cs",
): Vyhodnoceni | null {
  const vysledek = vyhodnotitProfil(vybraneIndexy);
  if (vysledek.profilId.length === 0) return null;

  const podleId = PERSONA_PODLE_ID[lang] ?? PERSONA_PODLE_ID.cs;
  const spojky = SPOJKY[lang] ?? SPOJKY.cs;

  const persony = vysledek.profilId
    .map((id) => podleId.get(id))
    .filter((p): p is PersonaProfil => p !== undefined);
  if (persony.length === 0) return null;

  const postrehy = sestavitPostrehy(vybraneIndexy, lang);
  if (postrehy.length === 0) return null;

  return {
    persony,
    personaNadpis: sestavitNadpis(persony, spojky),
    uvod: sestavitUvod(persony, spojky),
    pribeh: sestavitPribeh(persony, spojky),
    postrehy,
    procProdukty: sestavitProcProdukty(persony, spojky),
  };
}
