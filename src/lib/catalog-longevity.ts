export type CatalogCategory =
  | "Studené nápoje"
  | "Káva & kakao"
  | "Přídavky"
  | "Jídlo"
  | "Retail";

export type CatalogItem = {
  id: string;
  name: string;
  category: CatalogCategory;
  description: string;
  usps: string[];
  format?: string;
  imageUrl?: string;
};

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;

const COCOFIR_IMAGE = driveImage("1EiUSC-Kf78b0itvzayHI9C4PJxkuxfCK");
const COCOFIR_SHOT_IMAGE = driveImage("1qb0WMwX7H7DoplHlxzR7IXWMLqtu-FN_");
const KOKOS_VODA_IMAGE = driveImage("1k4HmgaMqWk9ZRFHYiCZy5b1AZIBHVw3t");

/**
 * Publikovaná verze festivalového katalogu. Redakční zdroj:
 * https://docs.google.com/spreadsheets/d/1vmWbSkHuzEiemuojsnqxGUAjdDzjTIDfYqWOnUId9W4/edit?gid=1083744554
 *
 * Fakta zde navíc respektují pozdější schválené korekce z 4. 8. a 6. 8. 2026.
 *
 * Korekce 6. 8. (Atrey): Cocofir, Cocofir Shot i kokosová voda se rozpadly na
 * samostatné položky po příchutích — host u stánku si vybírá konkrétní chuť,
 * ne kategorii. Názvy příchutí se PŘEBÍRAJÍ z pokladního katalogu
 * (`healing-festival-bar/public/pos/catalog.mjs`), aby menu, pokladna a appka
 * říkaly totéž; nevymýšlejí se tady.
 */
export const LONGEVITY_BAR_CATALOG: CatalogItem[] = [
  {
    id: "kokos-voda-wild",
    name: "Wild Raw coconut water",
    category: "Studené nápoje",
    format: "473 ml",
    description: "Ledově vychlazená kokosová voda Wild Raw přímo z lahve — čistá hydratace bez přidaného cukru a bez zbytečných oklik.",
    usps: ["100% raw kokosová voda", "Není z koncentrátu", "Láhev 473 ml"],
    imageUrl: KOKOS_VODA_IMAGE,
  },
  {
    id: "kokos-voda-thai",
    name: "Thai Raw coconut water",
    category: "Studené nápoje",
    format: "473 ml",
    description: "Čisté kokosové osvěžení servírované ledově vychlazené — jednoduchá chuť mladého kokosu bez zbytečných oklik.",
    usps: ["100% raw kokosová voda", "Není z koncentrátu", "Láhev 473 ml"],
    imageUrl: KOKOS_VODA_IMAGE,
  },
  {
    id: "cocofir-young-coconut",
    name: "Cocofir Young coconut",
    category: "Studené nápoje",
    format: "250 ml",
    description: "Krémový fermentovaný kokosový nápoj v čisté kokosové podobě — vychlazený, rostlinný a bez laktózy.",
    usps: ["Fermentovaný kokosový základ", "Rostlinný a bez laktózy", "Láhev 250 ml"],
    imageUrl: COCOFIR_IMAGE,
  },
  {
    id: "cocofir-mango",
    name: "Cocofir Mango",
    category: "Studené nápoje",
    format: "250 ml",
    description: "Krémový fermentovaný kokosový nápoj s mangem — ovocná varianta, vychlazená, rostlinná a bez laktózy.",
    usps: ["Fermentovaný kokosový základ", "Rostlinný a bez laktózy", "Láhev 250 ml"],
    imageUrl: COCOFIR_IMAGE,
  },
  {
    id: "cocofir-rybiz",
    name: "Cocofir Rybíz",
    category: "Studené nápoje",
    format: "250 ml",
    description: "Krémový fermentovaný kokosový nápoj s černým rybízem — svěže ovocný, vychlazený, rostlinný a bez laktózy.",
    usps: ["Fermentovaný kokosový základ", "Rostlinný a bez laktózy", "Láhev 250 ml"],
    imageUrl: COCOFIR_IMAGE,
  },
  {
    id: "cocofir-choco-bliss",
    name: "Cocofir Chocolate bliss",
    category: "Studené nápoje",
    format: "250 ml",
    description: "Krémový fermentovaný kokosový nápoj v čokoládové variantě — vychlazený, rostlinný a bez laktózy.",
    usps: ["Fermentovaný kokosový základ", "Rostlinný a bez laktózy", "Láhev 250 ml"],
    imageUrl: COCOFIR_IMAGE,
  },
  {
    id: "cocofir-banana-lemon",
    name: "Cocofir Banana lemon",
    category: "Studené nápoje",
    format: "250 ml",
    description: "Krémový fermentovaný kokosový nápoj s banánem a citronem — vychlazený, rostlinný a bez laktózy.",
    usps: ["Fermentovaný kokosový základ", "Rostlinný a bez laktózy", "Láhev 250 ml"],
    imageUrl: COCOFIR_IMAGE,
  },
  {
    id: "cocofir-salted-caramel",
    name: "Cocofir Slaný karamel",
    category: "Studené nápoje",
    format: "250 ml",
    description: "Krémový fermentovaný kokosový nápoj s tónem slaného karamelu — vychlazený, rostlinný a bez laktózy.",
    usps: ["Fermentovaný kokosový základ", "Rostlinný a bez laktózy", "Láhev 250 ml"],
    imageUrl: COCOFIR_IMAGE,
  },
  {
    id: "cocofir-shot-cacao-ceremony",
    name: "Cocofir Shot Cacao ceremony",
    category: "Studené nápoje",
    format: "120 ml",
    description: "Malá ochutnávka fermentovaného Cocofiru v kakaové variantě — výrazná chuť v rychlém festivalovém formátu.",
    usps: ["Fermentovaný kokosový nápoj", "Kompaktní shot 120 ml", "Rychlá ochutnávka u baru"],
    imageUrl: COCOFIR_SHOT_IMAGE,
  },
  {
    id: "cocofir-shot-mango-maracuja",
    name: "Cocofir Shot Mango maracuja",
    category: "Studené nápoje",
    format: "120 ml",
    description: "Malá ochutnávka fermentovaného Cocofiru s mangem a maracujou — výrazná chuť v rychlém festivalovém formátu.",
    usps: ["Fermentovaný kokosový nápoj", "Kompaktní shot 120 ml", "Rychlá ochutnávka u baru"],
    imageUrl: COCOFIR_SHOT_IMAGE,
  },
  {
    id: "cocofir-shot-vanilka",
    name: "Cocofir Shot Vanilka",
    category: "Studené nápoje",
    format: "120 ml",
    description: "Malá ochutnávka fermentovaného Cocofiru s vanilkou — jemná varianta v rychlém festivalovém formátu.",
    usps: ["Fermentovaný kokosový nápoj", "Kompaktní shot 120 ml", "Rychlá ochutnávka u baru"],
    imageUrl: COCOFIR_SHOT_IMAGE,
  },
  {
    id: "cocofir-shot-choco-bliss",
    name: "Cocofir Shot Chocolate bliss",
    category: "Studené nápoje",
    format: "120 ml",
    description: "Malá ochutnávka fermentovaného Cocofiru v čokoládové variantě — výrazná chuť v rychlém festivalovém formátu.",
    usps: ["Fermentovaný kokosový nápoj", "Kompaktní shot 120 ml", "Rychlá ochutnávka u baru"],
    imageUrl: COCOFIR_SHOT_IMAGE,
  },
  {
    id: "cocofir-shot-banana-lemon",
    name: "Cocofir Shot Banana lemon",
    category: "Studené nápoje",
    format: "120 ml",
    description: "Malá ochutnávka fermentovaného Cocofiru s banánem a citronem — svěží varianta v rychlém festivalovém formátu.",
    usps: ["Fermentovaný kokosový nápoj", "Kompaktní shot 120 ml", "Rychlá ochutnávka u baru"],
    imageUrl: COCOFIR_SHOT_IMAGE,
  },
  {
    id: "kombucha",
    name: "Kombucha Lavender",
    category: "Studené nápoje",
    format: "300 ml",
    description: "Jemně perlivá levandulová kombucha z pípy, podávaná na ledu jako lehké a aromatické festivalové osvěžení.",
    usps: ["Čepovaná z pípy", "Levandulové aroma", "Porce 300 ml"],
    imageUrl: driveImage("1HXgRZxH7RxAKL8yoB4pV9PfAvCAWG0F3"),
  },
  {
    id: "long-drink",
    name: "Longevity Drink",
    category: "Studené nápoje",
    description: "Zelený drink z raw kokosové vody a mladého ječmene, vyšlehaný do lehké pěny a servírovaný čerstvě.",
    usps: ["Raw kokosová voda", "Mladý ječmen", "Čerstvě mixovaná zelená pěna"],
  },
  {
    id: "matcha",
    name: "Matcha Latté",
    category: "Studené nápoje",
    // Gramáž sjednocená s pokladnou i s listem surovin: 3 g, ne 6 g (Atrey 6. 8.).
    format: "3 g matchy",
    description: "Výrazné matcha latté s rostlinným nápojem — čistá čajová chuť, krémová textura a sytě zelená barva.",
    usps: ["3 g matchy v porci", "Kokosové mléko nebo ovesný nápoj", "Lze podávat na ledu"],
  },
  {
    id: "matcha-mango",
    name: "Matcha Mango Latté",
    category: "Studené nápoje",
    format: "300 ml",
    description: "Vrstvené ledové latté, ve kterém se plná matcha potkává s kokosovým mlékem a sladce ovocným mangovým pyré.",
    usps: ["3 g matchy", "Kokosové mléko", "Mango pyré", "Podáváme na ledu"],
  },
  {
    id: "mocktail",
    name: "Longevito Mocktail",
    category: "Studené nápoje",
    format: "300 ml",
    description: "Signature nealkoholický drink s levandulovou kombuchou, mangovým pyré, kapkou FOCUS a čerstvou mátou.",
    usps: ["275 ml levandulové kombuchy", "Mango pyré", "1 ml FOCUS a snítka máty"],
  },
  {
    id: "sampanske",
    name: "Coconut Strawberry Cuvée",
    category: "Studené nápoje",
    description: "Slavnostní, perlivý a nealkoholický fermentovaný kokosový drink s jahodovým akcentem — přípitek po našem.",
    usps: ["Fermentovaný kokosový základ", "Jahodový chuťový akcent", "0 % alkoholu"],
  },
  {
    id: "focus",
    name: "FOCUS tinktura",
    category: "Přídavky",
    format: "1 ml",
    description: "Mátově laděná tinktura do nápoje pro chvíli, kdy chceš svůj drink doplnit o promyšlený botanický detail.",
    usps: ["Lion’s Mane a ašvaganda", "Vitaminy skupiny B", "Jedna pipeta do nápoje"],
  },
  {
    id: "reishi",
    name: "Reishi 10:1",
    category: "Přídavky",
    format: "1 g",
    description: "Koncentrovaný extrakt z houby reishi s charakteristicky zemitým profilem, který nejlépe zapadne do kakaa.",
    usps: ["Extrakt 10:1", "Dávka přibližně 1 g", "Doporučujeme do kakaa"],
  },
  // Modrý lotos VYŘAZEN 6. 8. 2026 (Atrey) — u stánku se neprodává. V pokladním
  // katalogu ještě figuruje jako modifikátor kávy; sladit tam patří majiteli
  // healing repa, tady se nesmí objevit.
  {
    id: "dynamic",
    name: "Essential Dynamic",
    category: "Přídavky",
    description: "Krémový funkční přídavek, který propojuje MCT tuky, houby, ženšen, minerály a vitaminy v jedné lžičce.",
    usps: ["MCT tuky", "Cordyceps a ženšen", "Minerály a vitaminy"],
    imageUrl: "https://www.wildandcoco.com/temp/img/pr/prirodni-zdroj-energie-w390-h471-ed7450525bf59513b427d42dcaf29e45.jpg",
  },
  {
    id: "cold-brew",
    name: "Cold Brew Rwanda Akagera",
    category: "Káva & kakao",
    description: "Za studena podávaná výběrová Rwanda s ovocným charakterem, která osvěží bez mléka a bez dlouhého čekání.",
    usps: ["Rwanda Akagera", "Tóny červeného ovoce", "Servírované ledově"],
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    category: "Káva & kakao",
    description: "Sametové cappuccino z Bolivie Aljiri s tóny pralinky a karamelu, připravené s kokosovým mlékem nebo ovesným nápojem.",
    usps: ["Bolivia Aljiri", "Kokosové mléko nebo ovesný nápoj v ceně", "Decaf bez příplatku"],
  },
  {
    id: "flat-white",
    name: "Flat White",
    category: "Káva & kakao",
    format: "200 ml",
    description: "Dvojité espresso spojené s jemnou mikropěnou — intenzivnější kávový profil v kompaktní porci.",
    usps: ["Dvojité espresso", "Jemná mikropěna", "Decaf bez příplatku"],
  },
  {
    id: "cacao-magic",
    name: "Cacao Magic",
    category: "Káva & kakao",
    description: "Hutný kakaový nápoj ze 100% čokolády, kokosového nektaru a koření — plný, hřejivý a výrazně čokoládový.",
    usps: ["20 g 100% čokolády", "Slazené kokosovým nektarem", "Kořeněný kakaový profil"],
  },
  {
    id: "ceremony",
    name: "Wild Ceremony Cacao",
    category: "Káva & kakao",
    description: "Minimalistické kakao připravené z čistého kakaového základu a horké vody pro hosty, kteří chtějí ryzí chuť.",
    usps: ["25 g ceremoniálního kakaa", "Příprava s horkou vodou", "Hutná, neskrývaná kakaová chuť"],
    // Zatím referenční foto hrnku; reálnou fotku nápoje nahradí drop mechanismus
    // (`scripts/sync_longevity_images.ts`).
    imageUrl: "/longevity/wild-ceremony-cacao.jpg",
  },
  {
    id: "espresso",
    name: "Espresso Bolivia Aljiri",
    category: "Káva & kakao",
    description: "Vyvážené espresso s krémovým tělem a sladkým profilem pralinky a karamelu, připravené z výběrové Bolivie.",
    usps: ["Bolivia Aljiri washed", "Sladký chuťový profil", "Decaf bez příplatku"],
  },
  {
    id: "batch-brew",
    name: "Batch Brew Rwanda Akagera",
    category: "Káva & kakao",
    description: "Čistá filtrovaná Rwanda s ovocným charakterem, připravená předem v batch breweru pro rychlé vydání bez kompromisu v chuti.",
    usps: ["Rwanda Akagera", "Ovocný filtrovaný profil", "Rychlé vydání bez čekání"],
  },
  {
    id: "bowl-strawberry",
    name: "Jahodová Longevity Bowl",
    category: "Jídlo",
    format: "350 g",
    description: "Vrstvená snídaňová bowl s Cocoguardem, jahodovou granolou, čerstvým ovocem a jemným kešu-kokosovým spreadem.",
    usps: ["Cocoguard jako krémový základ", "Jahody, jablko a další čerstvé ovoce", "Jahodová granola a kešu-kokosový spread"],
    imageUrl: driveImage("1ytYpWJwqi8MNe2WKjGPS_0KQJ3YA_1qq"),
  },
  {
    id: "bowl-choco",
    name: "Čokoládová Longevity Bowl",
    category: "Jídlo",
    format: "350 g",
    description: "Bohatá snídaňová bowl s Cocoguardem, čokoládovou granolou, čerstvým ovocem a krémovým kešu spreadem.",
    usps: ["Cocoguard jako krémový základ", "Čerstvé ovoce", "Čokoládová granola a kešu spread"],
    imageUrl: driveImage("1CpvW_DN-TQlGFWd_2DUyDKPKviOg-umO"),
  },
  {
    id: "menu",
    name: "Snídaňové menu",
    category: "Jídlo",
    description: "Kompletní festivalová snídaně, která spojí Longevity Bowl podle tvé chuti s kávou nebo vychlazeným Cocofirem.",
    usps: ["Jahodová nebo čokoládová bowl", "Káva nebo Cocofir", "Výhodné kombo v jednom objednání"],
  },
  {
    id: "protein-bread",
    name: "Proteinový Longevity chléb",
    category: "Jídlo",
    description: "Opečený bezlepkový kváskový chléb s chi pestem, lupinovým nebo hrachovým tempehem, cherry rajčetem a rukolou.",
    usps: ["Proteinový bezlepkový kváskový chléb", "Chi pesto a tempeh", "Cherry rajče a rukola"],
    imageUrl: driveImage("15_PkLfhq_0Cp7pYSGE-Mhvkc__ML2Kv5"),
  },
  {
    id: "granola",
    name: "Granola v lodičce",
    category: "Jídlo",
    format: "40 g",
    description: "Křupavá porce granoly do ruky, kterou si dáš samostatně mezi programem — v jahodové nebo čokoládové variantě.",
    usps: ["Praktická porce 40 g", "Jahodová nebo čokoládová", "Servírovaná v lodičce"],
    imageUrl: driveImage("1sTTsKC1SsRvWp0G5awRHtp3CZPz42iRK"),
  },
  {
    id: "polevka",
    name: "Slané Curry Cappuccino",
    category: "Jídlo",
    description: "Krémová kokosová curry polévka Libor’s Way se sladkou zeleninou, jemným kari, tamari a lehce pikantním závěrem.",
    usps: ["100% rostlinná receptura", "Kokos, zelenina, kari a tamari", "Dýňová semínka, kokosové chipsy a mikrobylinky"],
    imageUrl: driveImage("1Qn185N9eIPJK_ITlT82hCMXZyrVNQnna"),
  },
  {
    id: "pop-dubai",
    name: "Dortové lízátko Dubai Čoko",
    category: "Jídlo",
    format: "40 g",
    description: "Malý čokoládový dezert na špejli, který kombinuje Cocoguard, čoko granolu a čokoládovou vrstvu.",
    usps: ["Cocoguard a čoko granola", "Čokoládová vrstva", "Limitovaná festivalová série"],
    imageUrl: "/longevity/dortove-lizatko-dubai-coko.jpg",
  },
  {
    id: "pop-strawberry",
    name: "Dortové lízátko Jahoda Kokos",
    category: "Jídlo",
    format: "40 g",
    description: "Ovocně laděný dezert na špejli s Cocoguardem, jahodovou granolou, kokosem a kešu máslem.",
    usps: ["Cocoguard a jahodová granola", "Kešu máslo a kokos", "Limitovaná festivalová série"],
    imageUrl: "/longevity/dortove-lizatko-jahoda-kokos.jpg",
  },
  {
    id: "retail-granola",
    name: "Strawberry Quinoa Coconut Granola",
    category: "Retail",
    format: "220 g",
    description: "Křupavá jahodová granola s quinoou a kokosem v balení domů — stejný hravý charakter i po festivalu.",
    usps: ["Jahoda, quinoa a kokos", "Křupavá snídaňová směs", "Balení 220 g"],
    imageUrl: driveImage("13is71az4kc3UJGrLs95D1JjB36TwX300"),
  },
  {
    id: "retail-kokomleko",
    name: "BIO sušené kokosové mléko",
    category: "Retail",
    format: "300 g",
    description: "Jemný kokosový prášek do domácí kávy, smoothie i vaření — praktický způsob, jak mít kokosovou krémovost po ruce.",
    usps: ["BIO kokosový základ", "Do nápojů i vaření", "Balení 300 g"],
    imageUrl: driveImage("1iaPZgr7xuwUzDAvrk4TXLeaNTK0SIjNK"),
  },
  {
    id: "retail-protein",
    name: "Essential Protein",
    category: "Retail",
    format: "180 tablet",
    description: "Plné balení Essential Protein v tabletách pro ty, kteří chtějí po festivalové ochutnávce pokračovat doma.",
    usps: ["Praktický tabletový formát", "Plné balení", "180 tablet"],
    imageUrl: driveImage("1NK02egTikYaumh7YrF17qKDZUp8eMSzv"),
  },
  {
    id: "retail-protein-30",
    name: "Essential Protein Mini",
    category: "Retail",
    format: "30 kapslí",
    description: "Kompaktní balení Essential Protein na vyzkoušení nebo na cesty, když nechceš začínat velkým formátem.",
    usps: ["Startovací balení", "Praktické na cesty", "30 kapslí"],
    imageUrl: "https://www.wildandcoco.com/temp/img/es/essential-protein-30-tablet-w390-h471-c4705556c3ebd54fad049e22e6321eec.jpg",
  },
  {
    id: "retail-probiotika",
    name: "Symbiotics Superhuman 2.0",
    category: "Retail",
    format: "10 kapslí",
    description: "Zkušební balení kapslí Symbiotics Superhuman 2.0 pro hosty, kteří si chtějí produkt nejprve osahat v malém formátu.",
    usps: ["Zkušební balení", "Kapslový formát", "10 kapslí"],
    imageUrl: driveImage("1CeLIsQ4gaym6XHRcaBL0swYRplpv3YHX"),
  },
  {
    id: "retail-dynamic",
    name: "Essential Dynamic",
    category: "Retail",
    format: "320 g",
    description: "Plné domácí balení krémové směsi s MCT tuky, cordycepsem, ženšenem, minerály a vitaminy.",
    usps: ["MCT tuky", "Cordyceps a ženšen", "Balení 320 g"],
    imageUrl: driveImage("1iBWv80e-HQtPLZm7YcFFY6rBK2ahB-W1"),
  },
];

export function findLongevityCatalogItem(id: string): CatalogItem | undefined {
  return LONGEVITY_BAR_CATALOG.find((item) => item.id === id);
}
