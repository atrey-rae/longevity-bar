import type { CatalogCategory } from "../catalog-longevity";
import type { WildCocoCatalogCategory } from "../catalog-wild-coco";

export type KatalogPolozkaEn = {
  description: string;
  usps: string[];
  /** Jen tam, kde český formát obsahuje slovo (kapslí, tablet, kapky, matchy). */
  format?: string;
};

export const LONGEVITY_KATALOG_EN: Record<string, KatalogPolozkaEn> = {
  "kokos-voda": {
    description:
      "Pure coconut refreshment served ice-cold — the simple taste of young coconut, with no unnecessary detours.",
    usps: ["100% raw coconut water", "Not from concentrate", "473 ml bottle"],
  },
  cocofir: {
    description:
      "A creamy fermented coconut drink to pick by mood — from pure coconut to fruity and protein variants.",
    usps: ["Fermented coconut base", "Plant-based and lactose-free", "Six flavour variants"],
  },
  "cocofir-shot": {
    description:
      "A small taste of fermented Cocofir in a handy shot — for when you want bold flavour in a quick festival format.",
    usps: ["Fermented coconut drink", "Compact 120 ml shot", "Five flavours"],
  },
  kombucha: {
    description:
      "A gently sparkling lavender kombucha straight from the tap, served over ice as a light, aromatic festival refresher.",
    usps: ["Poured fresh from the tap", "Lavender aroma", "300 ml serving"],
  },
  "long-drink": {
    description:
      "A green drink made from raw coconut water and young barley, whipped into a light foam and served fresh.",
    usps: ["Raw coconut water", "Young barley", "Freshly blended green foam"],
  },
  matcha: {
    description:
      "A bold iced matcha latte with a plant-based drink — clean tea flavour, creamy texture and deep green colour.",
    usps: ["6 g of matcha per serving", "Coconut milk or oat drink", "Always served over ice"],
    format: "6 g matcha",
  },
  "matcha-mango": {
    description:
      "A layered iced latte where full-bodied matcha meets coconut milk and sweetly fruity mango purée.",
    usps: ["6 g of matcha", "Coconut milk", "Mango purée"],
  },
  mocktail: {
    description:
      "Our signature alcohol-free drink with lavender kombucha, 0% gin, a drop of FOCUS and fresh mint.",
    usps: ["275 ml lavender kombucha", "25 ml 0% gin", "1 ml FOCUS and a sprig of mint"],
  },
  sampanske: {
    description:
      "A festive, sparkling, alcohol-free fermented coconut drink with a strawberry accent — a toast, our way.",
    usps: ["Fermented coconut base", "Strawberry flavour accent", "0% alcohol"],
  },
  focus: {
    description:
      "A mint-toned tincture for your drink, for when you want to round it off with a considered botanical detail.",
    usps: ["Lion's Mane and ashwagandha", "B-group vitamins", "One pipette per drink"],
  },
  reishi: {
    description:
      "A concentrated reishi mushroom extract with a distinctively earthy profile that works best stirred into cacao.",
    usps: ["10:1 extract", "Dose of roughly 1 g", "Recommended in cacao"],
  },
  "blue-lotus": {
    description:
      "A gentle botanical addition with a floral character, for guests who want to treat their drink as an evening ritual.",
    usps: ["Two drops per drink", "Floral botanical profile", "Pairs best with evening drinks"],
    format: "2 drops",
  },
  dynamic: {
    description:
      "A creamy functional add-in that brings together MCT fats, mushrooms, ginseng, minerals and vitamins in a single spoonful.",
    usps: ["MCT fats", "Cordyceps and ginseng", "Minerals and vitamins"],
  },
  "cold-brew": {
    description:
      "A cold-served speciality Rwanda with a fruity character that refreshes without milk and without a long wait.",
    usps: ["Rwanda Akagera", "Notes of red fruit", "Served ice-cold"],
  },
  cappuccino: {
    description:
      "A velvety cappuccino from Bolivia Aljiri with notes of praline and caramel, made with coconut milk or oat drink.",
    usps: ["Bolivia Aljiri", "Coconut milk or oat drink included", "Decaf at no extra charge"],
  },
  "flat-white": {
    description:
      "Double espresso joined with fine microfoam — a more intense coffee profile in a compact serving.",
    usps: ["Double espresso", "Fine microfoam", "Decaf at no extra charge"],
  },
  "cacao-magic": {
    description:
      "A thick cacao drink made from 100% chocolate, coconut nectar and spices — full-bodied, warming and distinctly chocolatey.",
    usps: ["20 g of 100% chocolate", "Sweetened with coconut nectar", "Spiced cacao profile"],
  },
  ceremony: {
    description:
      "A minimalist cacao made from a pure cacao base and hot water, for guests who want the flavour unadorned.",
    usps: ["25 g of cacao", "Made with hot water", "Thick, unmasked cacao flavour"],
  },
  espresso: {
    description:
      "A balanced espresso with a creamy body and a sweet praline-and-caramel profile, made from a speciality Bolivian lot.",
    usps: ["Bolivia Aljiri washed", "Sweet flavour profile", "Decaf at no extra charge"],
  },
  "batch-brew": {
    description:
      "A clean filter Rwanda with a fruity character, brewed ahead in the batch brewer for a quick pour with no compromise on flavour.",
    usps: ["Rwanda Akagera", "Fruity filter profile", "Quick pour, no waiting"],
  },
  "bowl-strawberry": {
    description:
      "A layered breakfast bowl with Cocoguard, strawberry granola, fresh fruit and a smooth cashew-coconut spread.",
    usps: [
      "Cocoguard as the creamy base",
      "Strawberries, apple and other fresh fruit",
      "Strawberry granola and cashew-coconut spread",
    ],
  },
  "bowl-choco": {
    description:
      "A rich breakfast bowl with Cocoguard, chocolate granola, fresh fruit and a creamy cashew spread.",
    usps: ["Cocoguard as the creamy base", "Fresh fruit", "Chocolate granola and cashew spread"],
  },
  menu: {
    description:
      "A complete festival breakfast that pairs a Longevity Bowl of your choice with coffee or a chilled Cocofir.",
    usps: ["Strawberry or chocolate bowl", "Coffee or Cocofir", "A better-value combo in one order"],
  },
  "protein-bread": {
    description:
      "Toasted gluten-free sourdough bread with chi pesto, lupin or pea tempeh, cherry tomato and rocket.",
    usps: ["Protein-rich gluten-free sourdough bread", "Chi pesto and tempeh", "Cherry tomato and rocket"],
  },
  granola: {
    description:
      "A crunchy hand-held portion of granola to enjoy on the go between programme slots — in strawberry or chocolate.",
    usps: ["Handy 40 g portion", "Strawberry or chocolate", "Served in a paper boat"],
  },
  polevka: {
    description:
      "A creamy coconut curry soup, Libor's Way, with sweet vegetables, mild curry spice, tamari and a lightly spicy finish.",
    usps: [
      "100% plant-based recipe",
      "Coconut, vegetables, curry and tamari",
      "Pumpkin seeds, coconut chips and microherbs",
    ],
  },
  "pop-dubai": {
    description:
      "A small chocolate dessert on a stick, combining Cocoguard, chocolate granola and a chocolate coating.",
    usps: ["Cocoguard and chocolate granola", "Chocolate coating", "Limited festival edition"],
  },
  "pop-strawberry": {
    description:
      "A fruity dessert on a stick with Cocoguard, strawberry granola, coconut and cashew butter.",
    usps: ["Cocoguard and strawberry granola", "Cashew butter and coconut", "Limited festival edition"],
  },
  "retail-granola": {
    description:
      "Crunchy strawberry granola with quinoa and coconut, in a pack to take home — the same playful character even after the festival.",
    usps: ["Strawberry, quinoa and coconut", "Crunchy breakfast mix", "220 g pack"],
  },
  "retail-kokomleko": {
    description:
      "A fine coconut powder for home coffee, smoothies and cooking — a practical way to keep coconut creaminess close at hand.",
    usps: ["Organic coconut base", "For drinks and cooking alike", "300 g pack"],
  },
  "retail-protein": {
    description:
      "A full-size pack of Essential Protein in tablets, for anyone who wants to carry on at home after the festival taster.",
    usps: ["Practical tablet format", "Full-size pack", "180 tablets"],
    format: "180 tablets",
  },
  "retail-protein-30": {
    description:
      "A compact Essential Protein pack for trying it out or for travel, when you don't want to start with the large format.",
    usps: ["Starter pack", "Convenient for travel", "30 capsules"],
    format: "30 capsules",
  },
  "retail-probiotika": {
    description:
      "A trial pack of Symbiotics Superhuman 2.0 capsules, for guests who want to try the product first in a small format.",
    usps: ["Trial pack", "Capsule format", "10 capsules"],
    format: "10 capsules",
  },
  "retail-dynamic": {
    description:
      "A full-size home pack of the creamy blend with MCT fats, cordyceps, ginseng, minerals and vitamins.",
    usps: ["MCT fats", "Cordyceps and ginseng", "320 g pack"],
  },
};

export const WILD_COCO_KATALOG_EN: Record<string, KatalogPolozkaEn> = {
  cocofir: {
    description:
      "A liquid fermented drink made from young organic coconut in a handy portion, available in pure coconut and fruity variants.",
    usps: ["Fermented young organic coconut", "Plant-based, dairy-free drink", "Pure and fruity variants"],
  },
  "protein-cocofir": {
    description:
      "A fermented coconut drink boosted with plant-based protein, combining a creamy texture with dessert-style flavours: Chocolate Bliss, Salted Caramel and Banana Lemon.",
    usps: ["Fermented coconut base", "Boosted with plant-based protein", "Three distinctive flavours"],
  },
  "cocofir-shots": {
    description:
      "A concentrated Cocofir experience in a small 120 ml pack, from mango with passion fruit and vanilla coconut through to protein variants.",
    usps: ["Compact 120 ml pack", "Fermented coconut drink", "Fruity and protein variants"],
  },
  "biotic-cocoguard": {
    description:
      "A gentle fermented cream made from young organic coconut works as a purely plant-based alternative to yoghurt, with natural and fruity flavours.",
    usps: [
      "Made from young organic coconut",
      "Plant-based alternative to yoghurt",
      "Natural, mango, and blueberry with bergamot",
    ],
  },
  "cocoguard-premium": {
    description:
      "The premium fermented Cocoguard range is built on young organic coconut and a creamy consistency, including a subtly dessert-like Chia Vanilla variant.",
    usps: ["Fermented young organic coconut", "Creamy texture", "Young Coconut and Chia Vanilla"],
  },
  "raw-kokosove-vody": {
    description:
      "Pure coconut waters in a 473 ml bottle deliver the naturally delicate taste of young coconut in the Wild Raw, Thai Raw and Royal Virgin variants.",
    usps: ["100% coconut water", "473 ml bottle", "Three variants and flavour profiles"],
  },
  "essential-dynamic": {
    description:
      "A carefully composed powder blend in a 320 g pack combines MCT fats, mushrooms, ginseng, minerals and vitamins, easy to add to your morning routine.",
    usps: ["Powder-form blend", "MCT fats, mushrooms and ginseng", "320 g pack"],
  },
  "essential-protein": {
    description:
      "A tablet-form supplement for simple dosing without a shaker, available in a small 30-tablet pack to try and a large 180-tablet pack.",
    usps: ["Practical tablet format", "Small and large packs", "No need to mix a drink"],
  },
  "symbiotics-superhuman": {
    description:
      "A capsule supplement with a blend of live cultures, in its second-generation formula, comes in a compact 10-capsule pack and a standard 30-capsule pack.",
    usps: ["Superhuman 2.0 formula", "Blend of live cultures", "10- or 30-capsule pack"],
  },
  histabiotics: {
    description:
      "A specialised capsule range spanning generations 1.0 and 2.0 lets you choose the variant and pack size to suit your daily routine.",
    usps: ["1.0 and 2.0 range", "Practical capsule format", "Multiple pack sizes"],
  },
  "jahodova-granola": {
    description:
      "Crunchy granola brings together coconut, quinoa and a strawberry accent into a fruity breakfast or snack that works on its own or with Cocoguard.",
    usps: ["Coconut and quinoa", "Strawberry flavour profile", "Crunchy breakfast or snack"],
  },
  "kakaova-granola": {
    description:
      "A distinctly cacao-forward crunchy granola with coconut delivers full chocolate flavour for a breakfast bowl, a dessert layer, or a quick snack.",
    usps: ["Cacao and coconut", "Crunchy texture", "Packs for home and foodservice"],
  },
  "wild-cacao-ceremony": {
    description:
      "A ceremonial cacao with a deep, unmasked cacao profile, made for a slow hot-drink preparation and a personal cacao ritual.",
    usps: ["Full cacao profile", "For a hot drink", "Ritual style of preparation"],
  },
  "kokosove-pomazanky": {
    description:
      "A silky, spreadable coconut range offers natural, cashew and chocolate variants for bread, pancakes, fruit, or a spoonful straight from the jar.",
    usps: ["Natural, cashew and chocolate", "Smooth, spreadable texture", "Organic coconut base"],
  },
  "makadamiova-pomazanka": {
    description:
      "A premium macadamia spread is built on a delicate nutty flavour and creamy texture that shines on bread, in porridge, or as a finishing touch to dessert.",
    usps: ["Macadamia nut base", "Creamy texture", "Organic quality"],
  },
  "fermentovana-zelenina": {
    description:
      "A colourful range of Kimchi, Greenchi, Flowerchi and Garlic-chi brings different combinations of vegetables, spices and natural fermentation into one jar.",
    usps: ["Naturally fermented vegetables", "Four distinctive recipes", "Ready side dish or meal base"],
  },
  tempehy: {
    description:
      "Fermented lupin, pea and lentil tempehs offer a firm structure and an easy route to a quick plant-based meal, in the pan or in the oven.",
    usps: ["Lupin, pea or lentil", "Fermented legume base", "For the pan or the oven"],
  },
  "rostlinna-proteinova-jidla": {
    description:
      "The superfood burger and vegetable or dill nuggets form a ready base for a quick plant-based lunch, dinner or hearty snack.",
    usps: ["Burger and two nugget variants", "Plant-based recipes", "Quick to prepare a hot meal"],
  },
  "proteinove-pecivo": {
    description:
      "The frozen range includes protein sourdough bread with amaranth, sesame gluten-free bread, and portions of Wild Focaccia to finish baking at home.",
    usps: ["Protein bread with amaranth", "Sesame gluten-free bread", "Frozen, for finishing at home"],
  },
  "chi-pesto-coco-mayo": {
    description:
      "Two distinctive plant-based sauces finish off sandwiches, vegetables and hot meals: herby Chi Pesto and a smooth coconut alternative to mayonnaise.",
    usps: ["Herby Chi Pesto", "Plant-based Coco Mayo", "For bread, vegetables and hot meals"],
  },
  "kokosova-spiz": {
    description:
      "The essential coconut pantry for sweet and savoury cooking includes coconut milks, powdered milk, nectar and virgin raw coconut oil.",
    usps: ["17% and 22% coconut milks", "Powdered coconut milk", "Nectar and virgin raw oil"],
  },
  "mlady-kokos-do-receptu": {
    description:
      "Delicate organic young coconut flesh is a versatile ingredient for smoothies, creams, plant-based desserts, ice cream and your own coconut recipes.",
    usps: ["Organic young coconut", "Delicate, creamy ingredient", "For sweet and savoury recipes"],
  },
};

export const LONGEVITY_KATEGORIE_EN: Record<CatalogCategory, string> = {
  "Studené nápoje": "Cold drinks",
  "Káva & kakao": "Coffee & cacao",
  Přídavky: "Add-ons",
  Jídlo: "Food",
  Retail: "Take home",
};

export const WILD_COCO_KATEGORIE_EN: Record<WildCocoCatalogCategory, string> = {
  "Fermentovaný kokos": "Fermented coconut",
  Nápoje: "Drinks",
  Wellbeing: "Wellbeing",
  "Granoly & kakao": "Granolas & cacao",
  Pomazánky: "Spreads",
  "Slané jídlo": "Savoury food",
  "Kokosová spíž": "Coconut pantry",
};

export const LONGEVITY_KATEGORIE_PODNADPIS_EN: Record<CatalogCategory, string> = {
  "Studené nápoje": "Chilled, fermented and mixed right at the bar",
  "Káva & kakao": "Speciality coffee and cacao rituals, our way",
  Přídavky: "Small botanical details to fine-tune your drink",
  Jídlo: "Breakfast, savoury food and a sweet festival finish",
  Retail: "Favourite WILD&COCO products to take home",
};

export const WILD_COCO_KATEGORIE_POPIS_EN: Record<WildCocoCatalogCategory, string> = {
  "Fermentovaný kokos": "Our journey starts with young coconut and the time it's given to ferment.",
  Nápoje: "Pure coconut refreshment for moments when you want simplicity without compromise.",
  Wellbeing: "Considered formats that fit easily into your daily routine.",
  "Granoly & kakao": "Crunchy breakfasts and deep cacao flavour for slow and quick moments alike.",
  Pomazánky: "Silky textures, premium ingredients and a spoon you won't want to put down.",
  "Slané jídlo": "Fermented vegetables and plant-based staples for a complete home-cooked meal.",
  "Kokosová spíž": "Coconut staples that bring creaminess to both sweet and savoury cooking.",
};
