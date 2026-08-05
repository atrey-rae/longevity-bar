export type WildCocoCatalogCategory =
  | "Fermentovaný kokos"
  | "Nápoje"
  | "Wellbeing"
  | "Granoly & kakao"
  | "Pomazánky"
  | "Slané jídlo"
  | "Kokosová spíž";

export type WildCocoCatalogItem = {
  id: string;
  name: string;
  category: WildCocoCatalogCategory;
  description: string;
  usps: string[];
  officialUrl: string;
  imageUrl: string;
};

const website = (path: string) => `https://www.wildandcoco.com${path}`;

/**
 * Kurátorovaný průřez e-shopem na úrovni produktových rodin. Odkazy a fotografie
 * vycházejí z oficiálního snapshotu wildandcoco.com ze 4. 8. 2026.
 * Redakční dokument:
 * https://docs.google.com/document/d/1VyHtuk2lNE2Y6OkjxGsTcn__gHpc8ySeIaxbjKNNvXE/edit
 */
export const WILD_COCO_CATALOG: WildCocoCatalogItem[] = [
  {
    id: "cocofir",
    name: "Cocofir 250 ml",
    category: "Fermentovaný kokos",
    description:
      "Tekutý fermentovaný nápoj z mladého BIO kokosu v praktické porci do ruky, dostupný v čisté kokosové i ovocných variantách.",
    usps: ["Fermentovaný mladý BIO kokos", "Rostlinný nápoj bez mléka", "Čisté i ovocné varianty"],
    officialUrl: website("/cocofir-young-coconut"),
    imageUrl: website("/temp/img/co/cocofir-young-coconut-bio-w390-h471-e6280ca200ea4c12e3984890e0abcda7.jpg"),
  },
  {
    id: "protein-cocofir",
    name: "Protein Cocofir",
    category: "Fermentovaný kokos",
    description:
      "Fermentovaný kokosový nápoj doplněný rostlinným proteinem spojuje krémovou texturu s dezertními příchutěmi Chocolate Bliss, Slaný karamel a Banana Lemon.",
    usps: ["Fermentovaný kokosový základ", "Doplněný rostlinným proteinem", "Tři výrazné příchutě"],
    officialUrl: website("/cocofir-protein-chocolate-bliss"),
    imageUrl: website("/temp/img/pr/protein-cocofir-chocolate-bliss-bio-w390-h471-7f8a310fd63d331e1888d2611aa0b356.jpg"),
  },
  {
    id: "cocofir-shots",
    name: "Cocofir Shots",
    category: "Fermentovaný kokos",
    description:
      "Koncentrovaný zážitek z Cocofiru v malém 120ml balení, od manga s maracujou a vanilkového kokosu až po proteinové varianty.",
    usps: ["Kompaktní balení 120 ml", "Fermentovaný kokosový nápoj", "Ovocné i proteinové varianty"],
    officialUrl: website("/cocofir-mango-maracuja-bio-1x"),
    imageUrl: website("/temp/img/co/cocofir-mango-maracuja-bio-1x-w390-h471-3e202021b3f80aabe59159d6867ff0c2.jpg"),
  },
  {
    id: "biotic-cocoguard",
    name: "Biotic Cocoguard",
    category: "Fermentovaný kokos",
    description:
      "Jemný fermentovaný krém z mladého BIO kokosu funguje jako čistě rostlinná alternativa jogurtu a nabízí natural i ovocné příchutě.",
    usps: ["Z mladého BIO kokosu", "Rostlinná alternativa jogurtu", "Natural, mango a borůvka s bergamotem"],
    officialUrl: website("/biotic-cocoguard"),
    imageUrl: website("/temp/img/bi/biotic-cocoguard-young-coconut-w390-h471-b66a0fe9343c47e1e3214dd8c2951a0a.jpg"),
  },
  {
    id: "cocoguard-premium",
    name: "Cocoguard Premium",
    category: "Fermentovaný kokos",
    description:
      "Prémiová řada fermentovaného Cocoguardu staví na mladém BIO kokosu a krémové konzistenci, včetně jemně dezertní Chia Vanilla varianty.",
    usps: ["Fermentovaný mladý BIO kokos", "Krémová textura", "Young Coconut a Chia Vanilla"],
    officialUrl: website("/biotic-cocoguard-premium-youngcoconut-300g"),
    imageUrl: website("/temp/img/bi/biotic-cocoguard-premium-bio-w390-h471-afb2e5dc51c8bdfdc53575c8c75ae979.jpg"),
  },
  {
    id: "raw-kokosove-vody",
    name: "Raw kokosové vody",
    category: "Nápoje",
    description:
      "Čisté kokosové vody v lahvi 473 ml přinášejí přirozeně jemnou chuť mladého kokosu ve variantách Wild Raw, Thai Raw a Royal Virgin.",
    usps: ["100% kokosová voda", "Láhev 473 ml", "Tři varianty a chuťové profily"],
    officialUrl: website("/wild-raw-coconut-water"),
    imageUrl: website("/temp/img/wi/wild-raw-kokosova-voda-bio-w390-h471-f5099a52662778ac6aa77e3ef6008506.jpg"),
  },
  {
    id: "essential-dynamic",
    name: "Essential Dynamic",
    category: "Wellbeing",
    description:
      "Pečlivě sestavená prášková směs v 320g balení kombinuje MCT tuky, houby, ženšen, minerály a vitaminy pro snadné přidání do ranní rutiny.",
    usps: ["Směs v práškové formě", "MCT tuky, houby a ženšen", "Balení 320 g"],
    officialUrl: website("/dynamic-prirodni-zdroj-energie"),
    imageUrl: website("/temp/img/pr/prirodni-zdroj-energie-w390-h471-ed7450525bf59513b427d42dcaf29e45.jpg"),
  },
  {
    id: "essential-protein",
    name: "Essential Protein",
    category: "Wellbeing",
    description:
      "Tabletový doplněk pro jednoduché dávkování bez šejkru je dostupný v malém 30tabletovém balení na vyzkoušení i ve velkém balení se 180 tabletami.",
    usps: ["Praktická tabletová forma", "Malé i velké balení", "Bez nutnosti míchání nápoje"],
    officialUrl: website("/essential-protein-maly"),
    imageUrl: website("/temp/img/es/essential-protein-30-tablet-w390-h471-c4705556c3ebd54fad049e22e6321eec.jpg"),
  },
  {
    id: "symbiotics-superhuman",
    name: "Symbiotics Superhuman 2.0",
    category: "Wellbeing",
    description:
      "Kapslový doplněk s kombinací bakteriálních kultur v druhé generaci receptury nabízí kompaktní balení po 10 kapslích i standardní balení po 30 kapslích.",
    usps: ["Receptura Superhuman 2.0", "Směs bakteriálních kultur", "Balení 10 nebo 30 kapslí"],
    officialUrl: website("/probiotika-superhuman-2-0-30-kapsli"),
    imageUrl: website("/temp/img/sy/symbiotics-superhuman-2-0-30-kapsli-w390-h471-fdbcb737894a1bb95b104ea14471576a.jpg"),
  },
  {
    id: "histabiotics",
    name: "Histabiotics",
    category: "Wellbeing",
    description:
      "Specializovaná kapslová řada v generacích 1.0 a 2.0 umožňuje zvolit variantu i velikost balení podle osobní každodenní rutiny.",
    usps: ["Řada 1.0 a 2.0", "Praktická kapslová forma", "Více velikostí balení"],
    officialUrl: website("/histabiotics-2-0-30-kapsli"),
    imageUrl: website("/temp/img/hi/histabiotics-2-0-30-kapsli-w390-h471-9084ad388e79c32630e207683870497c.jpg"),
  },
  {
    id: "jahodova-granola",
    name: "Strawberry Quinoa Coconut Granola",
    category: "Granoly & kakao",
    description:
      "Křupavá granola spojuje kokos, quinou a jahodový akcent do ovocné snídaně nebo svačiny, která funguje samostatně i s Cocoguardem.",
    usps: ["Kokos a quinoa", "Jahodový chuťový profil", "Křupavá snídaně i svačina"],
    officialUrl: website("/strawberry-quinoa-coconut-granola"),
    imageUrl: website("/temp/img/st/strawberry-quinoa-coconut-granola-w390-h471-bbd9db8a08642125da33d6dd76f8bb26.jpg"),
  },
  {
    id: "kakaova-granola",
    name: "Crunchy Granola Coconut & Cacao",
    category: "Granoly & kakao",
    description:
      "Výrazně kakaová křupavá granola s kokosem nabízí plnou čokoládovou chuť pro snídaňovou misku, dezertní vrstvu i rychlou svačinu.",
    usps: ["Kakao a kokos", "Křupavá textura", "Balení pro domácnost i gastro"],
    officialUrl: website("/granola-maca-cacao"),
    imageUrl: website("/temp/img/cr/crunchy-granola-coconut-cacao-w390-h471-b8e2d8ed1461a8a38405f96da578aafe.jpg"),
  },
  {
    id: "wild-cacao-ceremony",
    name: "Wild Cacao Ceremony",
    category: "Granoly & kakao",
    description:
      "Ceremoniální kakao s hlubokým, neskrývaným kakaovým profilem je určené pro pomalou přípravu horkého nápoje i osobní kakaový rituál.",
    usps: ["Plný kakaový profil", "Pro horký nápoj", "Rituální způsob přípravy"],
    officialUrl: website("/wild-cacao-ceremony"),
    imageUrl: website("/temp/img/wi/wild-cacao-ceremony-w390-h471-431b433c3bf78ffa3dc1ee02db073e75.jpg"),
  },
  {
    id: "kokosove-pomazanky",
    name: "Kokosové pomazánky",
    category: "Pomazánky",
    description:
      "Hedvábně roztíratelná kokosová řada nabízí natural, kešu i čokoládovou variantu pro pečivo, palačinky, ovoce nebo lžičku přímo ze sklenice.",
    usps: ["Natural, kešu a čokoláda", "Jemná roztíratelná textura", "BIO kokosový základ"],
    officialUrl: website("/kokosova-pomazanka-coko"),
    imageUrl: website("/temp/img/ko/kokosova-pomazanka-cokoladova-bio-w390-h471-cfff29568e2557f1efa362cc3d3e496b.jpg"),
  },
  {
    id: "makadamiova-pomazanka",
    name: "Macadamia Heavenly Spread",
    category: "Pomazánky",
    description:
      "Prémiová makadamiová pomazánka staví na jemné ořechové chuti a krémové textuře, která vynikne na pečivu, v kaši i jako dezertní tečka.",
    usps: ["Makadamiový ořechový základ", "Krémová textura", "BIO kvalita"],
    officialUrl: website("/macadamia-heavenly-spread-280g"),
    imageUrl: website("/temp/img/ma/macadamia-heavenly-spread-bio-w390-h471-8d09d0817df20d9bda79888592d502f7.png"),
  },
  {
    id: "fermentovana-zelenina",
    name: "Fermentovaná zelenina",
    category: "Slané jídlo",
    description:
      "Barevná řada Kimchi, Greenchi, Flowerchi a Garlic-chi přináší různé kombinace zeleniny, koření a přirozené fermentace v jedné sklenici.",
    usps: ["Přirozeně fermentovaná zelenina", "Čtyři výrazné receptury", "Hotová příloha i základ jídla"],
    officialUrl: website("/kimchi"),
    imageUrl: website("/temp/img/ki/kimchi-w390-h471-ccb386c1e0aef77d802394087ca226af.jpg"),
  },
  {
    id: "tempehy",
    name: "Luštěninové tempehy",
    category: "Slané jídlo",
    description:
      "Fermentované lupinové, hrachové a čočkové tempehy nabízejí pevnou strukturu a snadnou cestu k rychlému rostlinnému jídlu na pánev i do trouby.",
    usps: ["Lupina, hrách nebo čočka", "Fermentovaný luštěninový základ", "Na pánev i do trouby"],
    officialUrl: website("/lupin-tempeh"),
    imageUrl: website("/temp/img/lu/lupinovy-tempeh-v-olivovem-oleji-bio-200g-w390-h471-98cf501fe8a77482f65519e30b55d847.jpg"),
  },
  {
    id: "rostlinna-proteinova-jidla",
    name: "Rostlinná proteinová jídla",
    category: "Slané jídlo",
    description:
      "Superfood burger a zeleninové či koprové nugetky jsou hotovým základem rychlého rostlinného oběda, večeře nebo vydatné svačiny.",
    usps: ["Burger a dvě varianty nugetek", "Rostlinné receptury", "Rychlá příprava teplého jídla"],
    officialUrl: website("/zeleninovy-burger"),
    imageUrl: website("/temp/img/su/superfood-burger-bio-w390-h471-04a48af0c06159e134191d9235813a69.png"),
  },
  {
    id: "proteinove-pecivo",
    name: "Proteinové pečivo a focaccia",
    category: "Slané jídlo",
    description:
      "Mražená řada zahrnuje proteinový kváskový chléb s amarantem, sezamový bezlepkový chléb a porce Wild Focaccie k domácímu dopečení.",
    usps: ["Proteinový chléb s amarantem", "Sezamový bezlepkový chléb", "Mražené pro domácí dopečení"],
    officialUrl: website("/protein-sourdough-bread-with-amaranth"),
    imageUrl: website("/temp/img/pr/proteinovy-kvaskovy-chleb-s-amarantem-w390-h471-805d89973f47310be1410589f6daac9b.jpg"),
  },
  {
    id: "chi-pesto-coco-mayo",
    name: "Chi Pesto & Coco Mayo",
    category: "Slané jídlo",
    description:
      "Dvě výrazné rostlinné omáčky dotahují sendviče, zeleninu i teplá jídla: bylinkové Chi Pesto a hladká kokosová alternativa majonézy.",
    usps: ["Bylinkové Chi Pesto", "Rostlinná Coco Mayo", "Na pečivo, zeleninu i teplá jídla"],
    officialUrl: website("/chi-pesto"),
    imageUrl: website("/temp/img/ch/chi-pesto-w390-h471-c5cc065cb40cc8ed3e65599020014497.jpg"),
  },
  {
    id: "kokosova-spiz",
    name: "Kokosová spíž",
    category: "Kokosová spíž",
    description:
      "Základní kokosová výbava pro sladké i slané vaření zahrnuje kokosová mléka, sušené mléko, nektar a panenský raw kokosový olej.",
    usps: ["Kokosová mléka 17 % a 22 %", "Sušené kokosové mléko", "Nektar a panenský raw olej"],
    officialUrl: website("/kokosove-mleko-17-tuku"),
    imageUrl: website("/temp/img/ko/kokosove-mleko-bio-17-tuku-w390-h471-3c2d6bb37137252a7aa608107769f043.jpg"),
  },
  {
    id: "mlady-kokos-do-receptu",
    name: "Dužina z mladého kokosu",
    category: "Kokosová spíž",
    description:
      "Jemná BIO dužina z mladého kokosu je univerzální surovina pro smoothie, krémy, rostlinné dezerty, zmrzlinu i vlastní kokosové recepty.",
    usps: ["BIO mladý kokos", "Jemná krémová surovina", "Pro sladké i slané recepty"],
    officialUrl: website("/duzina-500g"),
    imageUrl: website("/temp/img/du/duzina-z-mladeho-kokosu-bio-w390-h471-0a0a408e9489d3028ff63e5589ea569c.jpg"),
  },
];
