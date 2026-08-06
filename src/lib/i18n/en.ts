/**
 * Anglický slovník Bar.app — zrcadlo `cs.ts`.
 *
 * Tón: prémiový, přátelský a přímý. České tykání se v angličtině překládá jako
 * přímé „you“ — nikdy formální „one“ nebo neosobní pasivum.
 *
 * PRÁVNÍ RÁMEC je stejný jako v češtině: žádná zdravotní tvrzení. Texty kvízu
 * a katalogů hlídá `scripts/check-i18n.ts` na zakázané podřetězce
 * (`cure`, `heal`, `disease`, `diagnos`, `allerg`, `intoleran`, `probiotic`).
 * Pozor: „healthy“ i „healing“ obsahují `heal`, „secure“ obsahuje `cure`.
 * Značka „Healing Festival“ smí zůstat jen v namespacech, které se neskenují
 * (`layout`, `rozcestnik`) — je to vlastní jméno akce, ne tvrzení o produktu.
 */

import {
  LONGEVITY_KATALOG_EN,
  LONGEVITY_KATEGORIE_EN,
  LONGEVITY_KATEGORIE_PODNADPIS_EN,
  WILD_COCO_KATALOG_EN,
  WILD_COCO_KATEGORIE_EN,
  WILD_COCO_KATEGORIE_POPIS_EN,
} from "./en-katalogy";
import { katalogTexty } from "./katalog";
import type { Dict } from "./types";
import { LONGEVITY_BAR_CATALOG } from "../catalog-longevity";
import { WILD_COCO_CATALOG } from "../catalog-wild-coco";
import { SLEVA_PROCENT } from "../kviz";
import { PROFILY } from "../kviz-profil";
import {
  PERSONY_EN,
  POSTREHY_TEXTY_EN,
  VYHODNOCENI_TEXTY_EN,
} from "../kviz-profil-vyhodnoceni";
import { STAMPS_PER_TIER } from "../loyalty";

/* -------------------------------------------------------------------------- */
/* Anglické skloňování — jednotné/množné číslo                                 */
/* -------------------------------------------------------------------------- */

function pocet(n: number, jednotne: string, mnozne: string): string {
  return `${n} ${Math.abs(Math.trunc(n)) === 1 ? jednotne : mnozne}`;
}

/** 1 stamp · 3 stamps */
function stamps(n: number): string {
  return pocet(n, "stamp", "stamps");
}

/** 1 minute · 3 minutes */
function minutes(n: number): string {
  return pocet(n, "minute", "minutes");
}

/* -------------------------------------------------------------------------- */
/* Názvy profilů P1–P10                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Produktové kategorie, ne diagnózy — stejně jako v češtině. Klíč je `profilId`,
 * takže přeházení `PROFILY` nic nerozbije.
 *
 * P6 a P7 se v češtině jmenují „probiotické“; anglické „probiotic“ je ale na
 * seznamu zakázaných slov (brief 5. 8. 2026), proto se tu překládá opisem
 * „live-culture“ / „culture“. Význam zůstává, tvrzení nevzniká.
 */
const PROFILY_EN: Record<string, string> = {
  P1: "Homemade coconut yoghurt",
  P2: "Raw coconut water bundle",
  P3: "Young coconut bundle",
  P4: "Everyday breakfast bundle",
  P5: "Fermented Cocofir bundle",
  P6: "Protein & live-culture shots",
  P7: "Targeted culture supplements",
  P8: "Plant-based lunches & dinners",
  P9: "Symbiotic Cocoguard",
  P10: "Dairy-free & gluten-free picks",
};

for (const profil of PROFILY) {
  if (!PROFILY_EN[profil.id]) {
    throw new Error(`i18n/en: chybí anglický název profilu ${profil.id}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Slovník                                                                     */
/* -------------------------------------------------------------------------- */

export const en: Dict = {
  spolecne: {
    zpetNaRozcestnik: "Back to the hub",
    zpetNaKartu: "Back to your card",
    zpet: "← Back",
    zavrit: "Close",
    prihlasitSe: "Sign in",
    odhlasit: "Sign out",
    ulozit: "Save",
    ukladam: "Saving…",
    administrace: "Admin",
    pravidlaAGdpr: "Terms & privacy",
    krestniJmeno: "First name",
    email: "Email",
    emailPlaceholder: "name@email.com",
    telefonPlaceholder: "Phone (e.g. 601 123 456)",
    nemasSignal: "No signal? Check your connection and try again.",
    prepnoutJazyk: "Switch language",
  },

  layout: {
    titulek: "Longevity Bar — loyalty card",
    popis:
      "The loyalty card for the Longevity Bar stand (Wild & Coco) at Healing Festival. Every 4 stamps earn you a reward of your choice.",
    znackaPred: "Longevity",
    znackaPo: "Bar",
    festival: "Healing Festival",
    patickaZnacka: "Peace & Coco · Longevity Bar",
    patickaEshop: "Wild & Coco",
  },

  rozcestnik: {
    titulek: "Longevity Bar",
    popis:
      "Rewards, the microbiome quiz and the full Longevity Bar range by WILD&COCO.",
    misto: "Healing Festival · Světlá nad Sázavou",
    nadpis: "Choose your Longevity Bar experience",
    podnadpis:
      "From your first taste to your reward. Everything you need is right here.",
    navigaceLabel: "What would you like to do at the Longevity Bar",
    potvrdEmailNadpis: "Your rewards are waiting",
    potvrdEmail: "Confirm your email",
    kreditBanner: (zbyva: string) => `You have credit with us — ${zbyva} left`,
    prihlasenyPred:
      "You're signed in. Your loyalty card and account settings live in",
    prihlasenyOdkaz: "rewards",
    prihlasenyPo: ".",
    neprihlaseny:
      "You don't need an account to browse the range. Signing in is only needed for the loyalty card and before you start the quiz.",
    karty: {
      odmeny: {
        eyebrow: "Loyalty card",
        title: "Earn treats at the Longevity Bar",
        copy: "Collect a stamp on every visit and pick the rewards you actually like.",
      },
      kviz: {
        eyebrow: "A few quick questions",
        title: "The quiz about your microbiome",
        copy: "Find your flavour direction and the WILD&COCO products you might enjoy.",
      },
      longevity: {
        eyebrow: "What you'll taste here",
        title: "Browse our Longevity Bar menu",
        copy: "Drinks, coffee, cacao, food and festival specials in one place.",
      },
      wildCoco: {
        eyebrow: "Take WILD&COCO home",
        title: "Browse the WILD&COCO range",
        copy: "Discover fermented coconut products, plant-based food and our other favourites.",
      },
      darek: {
        eyebrow: "A gift for your friends",
        title: "Give your friends 21% off",
        copy: "Show them your QR code, they take the quiz and the coupon lands in their inbox.",
      },
      kredit: {
        eyebrow: "You have credit with us",
        title: "Longevity Bar credit",
        copy: "Pick what you'd like and show the order to the team at the bar.",
      },
    },
  },

  prihlaseni: {
    titulek: "Sign in",
    nadpis: "Sign in and start collecting stamps",
    podnadpisSken:
      "One more step — once you're signed in we'll open your card and add the stamp, as long as the QR code is valid today.",
    podnadpisOdmeny:
      "Once you're signed in we'll open your loyalty card and every reward you've collected.",
    podnadpisObecny: "Every 4 stamps earn you a free reward of your choice.",
    nadpisKviz: `One step from your ${SLEVA_PROCENT}% off`,
    podnadpisKvizPred: "This quiz comes to you from",
    podnadpisKvizPo:
      "at the Longevity Bar — once you're signed in we'll take you right back to where you left off.",
    podnadpisKvizBezBavice:
      "Once you're signed in we'll take you right back to the quiz where you left off.",
    procTelefonKviz: `We ask for your phone number because the ${SLEVA_PROCENT}% coupon is personal — we issue it once and only to you, so nobody else can use it.`,
    souhlasKvizPred:
      "By signing in you agree to us processing your phone number. You'll enter your email inside the quiz and we'll use it to send the coupon — it doesn't sign you up for the loyalty programme. Details in the",
    chybaOauth:
      "Signing in with Google didn't finish. Please try again or use your phone number.",
    souhlasPred:
      "By signing in you agree to us processing your phone number and the email you provide for the purposes of the loyalty programme. Details in the",
    souhlasOdkaz: "terms",
    souhlasPo: ".",
    formular: {
      tvujTelefon: "Your phone number",
      telefonPlaceholder: "601 123 456",
      poslatSms: "Send the SMS code",
      odesilam: "Sending…",
      poslaliJsmeKodPred: "We've sent a 4-digit code to",
      poslaliJsmeKodPo: ".",
      overuji: "Verifying…",
      zmenitTelefon: "Change number",
      poslatZnovu: "Send again",
      poslatZnovuOdpocet: (sekund: number) => `Send again (${sekund} s)`,
      kodPlati: "The code is valid for 10 minutes.",
      nebo: "or",
      presmerovavam: "Redirecting…",
      google: "Sign in to an existing account with Google",
      legacyShrnuti: "Sign in to an existing account by email",
      legacyPoslat: "Send the code by email",
      legacyPoslano: (email: string) =>
        `We've sent a 6-digit code to ${email}.`,
      legacyOverit: "Verify the email code",
      chybaTelefon: "Please enter a valid phone number.",
      chybaSms: "We couldn't send the SMS.",
      chybaSmsKod: "We couldn't send the SMS with your code.",
      chybaDelkaKodu: "The code has 4 digits.",
      chybaLimitSms:
        "We've already sent the code 3 times in the last 15 minutes. Try again in a few minutes, or sign in with Google.",
      chybaKod: "That code doesn't match or has expired.",
      chybaKodVyprsel: "That code doesn't match or has already expired.",
      chybaGoogle:
        "Signing in with Google didn't work. Try your phone number above.",
      chybaLegacyEmail: "Enter a valid email for an existing account.",
      chybaLegacyPoslani:
        "We couldn't send the code. Check that the account already exists.",
      chybaLegacyDelka: "The email code has 6 digits.",
      chybaLegacyKod: "That email code doesn't match or has expired.",
    },
  },

  emailOnboarding: {
    nadpis: "Confirm your email",
    popis:
      "You're already collecting stamps. To pick up a reward, just confirm your email.",
    tlacitko: "Send the confirmation email",
    odesilam: "Sending…",
    uspech:
      "Have a look in your inbox and your spam folder — our confirmation email is in one of them.",
    throttled:
      "We sent a confirmation email a moment ago. You can send another one in 10 minutes.",
    chyba: "We couldn't send the email.",
  },

  odmeny: {
    titulek: "Loyalty card",
    emailOveren: "Your email is confirmed. Rewards unlocked ✓",
    emailChyba: "That link has expired. Ask us to send a new confirmation email.",
    bezPristupu: "You don't have access to the admin area.",
    postupNaLevel: (level: number) =>
      `Your body is cheering — you're moving up to Level ${level}!`,
    vyhravas: "You've won! 🎉",
    vyberSiOdmenu: "Pick your reward →",
    cekaNaVyzvednuti: "A reward is waiting for you",
    ukazatUPokladny: "Show at the till",
    specialniVyhry: "Special prizes 🎁",
    specialniVyhryPopis:
      "Leave us your first name and phone number — so we recognise you at the bar and can send you special prizes.",
    levelSplneny: (level: number, dalsi: number) =>
      `Level ${level} complete ✓ — your body is cheering, you're moving up to Level ${dalsi}!`,
    level: (cislo: number) => `Level ${cislo}`,
    kolo: (cislo: number) => `round ${cislo}`,
    hotovoVse: "You've completed all three rewards. Thanks for being with us! 💛",
    kartaPlna: "Your card is full — pick your reward above ☝️",
    zbyvaPred: (pocetRazitek: number) =>
      `Just ${stamps(pocetRazitek)} more and your`,
    zbyvaPo: "is on us.",
    naviRazitka: (pocetRazitek: number) =>
      `You've got ${stamps(pocetRazitek)} banked towards your next reward — nothing expires.`,
    prehledNadpis: `Rewards every ${STAMPS_PER_TIER} stamps`,
    prehledTed: "now",
    prehledPopis: (celkem: number) =>
      `After the third reward the cycle starts again. You've collected ${stamps(celkem)} in total.`,
    historieNadpis: "Rewards collected",
    historieVydano: "✓ collected",
    telefonniUcet: "Phone account",
  },

  vyber: {
    titulek: "Pick your reward",
    nadpis: "You've won! Take your pick:",
    poznamka:
      "You can only pick what's in stock right now. Once you choose, show the screen to the team at the till.",
    nicSkladem:
      "Nothing is in stock at the moment 😢 Please ask the team at the till.",
    vybiram: "Selecting…",
    chybaVyberu: "That didn't go through, please try again.",
  },

  odmena: {
    titulek: "Your reward",
    vydano: "Collected",
    chciDalSbirat: "Keep collecting rewards",
    dikyZaNakup:
      "Thanks for your order! You'll get your next stamp at the till on your next purchase.",
    ukazUPokladny: "Show at the till",
    obsluhaOveri: "Our team will check the live screen",
    odmenaZdarma: "Free reward · Longevity Bar",
    obsluhaVydaPred: "Our team hands over the product and",
    obsluhaVydaZvyraznene: "holds for 3 s",
    obsluhaVydaPo: "the button below.",
    jenObsluhaOdmena:
      "Only our team presses this button. If you press it yourself, you lose the reward.",
  },

  vydat: {
    vydanoHotovo: "Collected ✓",
    pinObsluhy: "Staff PIN",
    zpracovavam: "Processing…",
    vydat: "Hand over",
    drzJeste: (sekund: number) => `Hold for ${sekund} s more`,
    jenObsluha: "Staff only · hold for 3 seconds",
    ariaPodrzet: "Hold for 3 seconds to hand over the reward",
    chyba: "That didn't go through. Please try again.",
  },

  sken: {
    naskenovat: "Scan the QR code",
    dialogNadpis: "Scan the QR code at the till",
    dialogPopis:
      "Point the live camera at the whole code. Picking a photo from your gallery won't work.",
    zavritKameru: "Close the camera",
    zivyObraz: "Live view from the rear camera",
    spoustime: "Starting the camera…",
    nacteno: "QR code read — checking your stamp…",
    kameraZablokovana: (host: string) =>
      `The camera is blocked. Allow it for ${host} in your browser settings and try again.`,
    kameraChybi:
      "We couldn't find a camera on this device. Open the app on a phone with a camera.",
    kameraObecnaChyba:
      "The camera wouldn't start. Check its permissions and try again.",
    jinaAdresa: (host: string) =>
      `This QR code points to a different address (${host}). Open the app at the same address as the code.`,
    neplatnyKod: "This isn't a valid Longevity Bar QR code. Try another one.",
    hlasky: {
      okNadpis: "Stamp added!",
      cooldownNadpis: "You already have that stamp",
      cooldownText: (min: number) =>
        `You can add the next one in ${minutes(min)}. One stamp = one purchase.`,
      limitNadpis: "Daily limit reached",
      limitText: (limit: number) =>
        `You've hit today's maximum (${stamps(limit)}). Come back tomorrow!`,
      spatnyDenNadpis: "This QR code isn't valid today",
      spatnyDenText: (datum: string) =>
        `This code belongs to ${datum}. Ask at the till for today's code.`,
      spatnyDenBezData: "Ask at the till for today's code.",
      vypnutyNadpis: "This QR code is switched off",
      vypnutyText: "Please ask the team at the till.",
      neznamyNadpis: "Unknown QR code",
      neznamyText: "Please ask at the till for the current code.",
      chybaNadpis: "Something went wrong",
      chybaText: "Please scan the QR code again.",
    },
  },

  instalace: {
    eyebrow: "Faster next time",
    nadpis: "Add Longevity Bar to your home screen?",
    pripomenoutZitra: "Remind me tomorrow",
    iosVAplikaciPred: "Open this page in Safari, then tap",
    iosSdilet: "Share",
    iosPridatNaPlochu: "Add to Home Screen",
    iosSafariPred: "In Safari tap",
    iosSafariMezi: "and then",
    androidPred: "In your browser menu (⋮) choose",
    androidNebo: "or",
    androidInstalovat: "Install app",
    uzMamNaPlose: "Already on my home screen",
    nativniPopis:
      "Open your loyalty card with a single tap and stay signed in.",
    pridatAplikaci: "Add the app",
    tedNe: "Not now — remind me tomorrow",
  },

  nenalezeno: {
    nadpis: "Nothing here",
    popis:
      "This page doesn't exist or is no longer valid. Try starting from your loyalty card.",
  },

  pravidla: {
    titulek: "Terms and privacy",
    nadpis: "Loyalty programme terms",
    razitkaNadpis: "How to collect stamps",
    razitkaBody: [
      "One purchase at the Longevity Bar stand = **1 stamp**.",
      "You get your stamp by scanning the QR code our team shows you **after you pay**.",
      "The QR code is valid **on that festival day only**.",
      "There's a short wait between two stamps and a daily stamp limit — this protects the programme from misuse.",
      "Stamps are counted continuously. Even with an unclaimed reward you keep collecting and nothing expires.",
    ],
    odmenyNadpis: "Rewards",
    odmenyUvod: (razitek: number) =>
      `Every **${razitek} stamps** earn you one free reward. The rewards rotate in this order:`,
    odmenyZaver:
      "After the third reward the cycle starts again. You can only choose from products that are in stock at the time.",
    vyzvednutiNadpis: "Claiming your reward",
    vyzvednutiBody: [
      "Once you've picked a product, show the screen to our team at the till.",
      "The screen is live (animation + a running clock) — a screenshot won't be accepted.",
      "**Our team** confirms the handover by holding the „Hand over“ button on your phone. That marks the reward as used, once and for all.",
      "If you press the button yourself without taking the product, you lose the reward.",
      "Losing or closing the screen is not a problem — everything is stored on the server, just open the app again.",
    ],
    reklamaceNadpis: "Something went wrong?",
    reklamaceText:
      "A stamp didn't come through, or a reward was marked as used by mistake? Talk to the team at the stand — they can correct it manually.",
    gdprNadpis: "Personal data protection (GDPR)",
    gdprSpravce:
      "The data controller is **WILD&COCO s.r.o.**, operator of the Longevity Bar stand (Peace & Coco).",
    gdprVernostNadpis: "Loyalty programme (stamps)",
    gdprVernostBody: [
      "We process your **phone number and email** (and your name if you sign in with Google) and your **stamp and reward history**.",
      "Purpose: signing in, running the loyalty programme and sending Longevity tips after the festival, until 31 December 2026 at the latest. We never sell your data to anyone.",
      "We use your contact details for Longevity tips until 31 December 2026 at the latest; after that we delete them, or keep them only if we have another valid reason to do so (for example your separate consent or a purchase).",
    ],
    gdprKvizNadpis: "The „Unlock your microbiome's potential“ quiz (coupons)",
    gdprKvizBody: [
      "We process the **name, email and phone number** you fill in on the form, the product you chose together with its coupon code, and which quiz variant you took. **Your answers to the quiz questions are not stored** — they stay in your browser only.",
      "Purpose: sending you the coupon and **Longevity tips from WILD&COCO s.r.o.** — we use your contact details for this **until 31 December 2026 at the latest**, and in a very limited form: **a maximum of 6 friendly messages**.",
      "Any further communication is only possible if you become a customer of the online shop www.wildandcoco.com / .de / .sk / .at / .ch.",
      "You can withdraw your consent at any time — by replying to a message or by telling the team at the stand; we'll then stop using your contact details.",
    ],
    gdprSpolecneNadpis: "Both programmes",
    gdprSpolecneBody: [
      "Data is stored with our processor Supabase (EU) and the app runs on Vercel.",
      "You can ask for your data to be deleted at any time, either at the stand or through the online shop.",
      "We only use technical cookies — to keep you signed in and to remember your language. No tracking or advertising cookies.",
    ],
  },

  darek: {
    titulek: "A gift for your friends",
    popisMeta:
      "Show your friends the QR code, they take the quiz and get 21% off a WILD&COCO product matched to their microbiome.",
    eyebrow: "A gift for your friends",
    nadpis:
      "Give your friends 21% off a product of their choice, right through to the end of the year!",
    podtext:
      "Let their microbiome cheer. Just have them scan this QR code and take the quiz :-)",
    osobniQrTitulek: "Your personal QR code",
    prihlaseniVyzva:
      "Sign in and you'll get your own QR code — you'll see how many friends got the gift through you.",
    odkazText: "bar.peaceandcoco.com/kviz/web",
    altOsobni: (odkaz: string) =>
      `Your personal QR code for the microbiome quiz — ${odkaz}`,
    altStaticky: (odkaz: string) => `QR code for the microbiome quiz — ${odkaz}`,
    pocitadlo: (pozvanych: number) => {
      if (pozvanych <= 0) {
        return "Nobody has been through your QR code yet. Be the first to make a friend's day!";
      }
      if (pozvanych === 1) {
        return "1 friend has already been through your QR code. Thank you!";
      }
      return `${pozvanych} friends have already been through your QR code. Thank you!`;
    },
    patka:
      "Your friend gets the coupon by email and it's valid in the wildandcoco.com online shop, not at the stand.",
  },

  oznameni: {
    eyebrow: "Don't miss a thing",
    nadpis: "Turn on notifications?",
    popis:
      "We'll let you know when a reward or credit is waiting. Nothing else, promise.",
    zapnout: "Turn on notifications",
    zapinam: "Turning on…",
    zapnuto: "Notifications are on.",
    vypnout: "Turn off",
    chyba: "We couldn't turn notifications on. Please try again.",
    iosNadpis: "Add the app to your home screen first",
    iosPopis:
      "On iPhone only an app added to the home screen can receive notifications. Add it, then come back — the button will be right here.",
    odmenaTitulek: "You've earned a reward!",
    odmenaText: "That's 4 stamps. Pick what you'd like.",
    kreditTitulek: "You've got credit",
    kreditText: (castka: string) => `${castka} is waiting for you at the Longevity Bar.`,
  },

  pozvanka: {
    titulek: "Signing you in…",
    nadpis: "Signing you in…",
    popis: "You'll be at your credit and rewards in a moment.",
  },

  kredit: {
    titulek: "Longevity Bar credit",
    eyebrow: "Longevity Bar credit",
    zadnyNadpis: "No credit waiting for you",
    zadnyPopis:
      "Longevity Bar credit belongs to festival guests it was assigned to by the team in the Healing app. If you think yours should be here, have a word with the team at the bar.",
    nedostupnyNadpis: "We can't load your credit right now",
    nedostupnyPopis:
      "Please try again in a moment, or show this screen to the team at the bar.",
    zkusitZnovu: "Try again",
    zustatek: (zbyva: string, celkem: string) =>
      `left of ${zbyva} · ${celkem} spent`,
    ukazObsluze: "Show this to the team at the bar",
    ukazObsluzeVice:
      "Show this to the team at the bar (more than one order waiting)",
    coSiDas: "What would you like?",
    vycerpano: "Your credit is all used up. Thanks for spending it with us!",
    uzVydano: "Already collected",
    historieNadpis: "Credit order history",
    historiePocet: (kusu: number) => pocet(kusu, "item", "items"),
    objednavkaZKreditu: "Order from your credit",
    jenObsluha:
      "Only our team presses this button. If you press it yourself, the order is taken off your credit.",
    vybrano: "Selected",
    prekroceno: (zbyva: string) =>
      `That's more than you have left (${zbyva}). Please take something off.`,
    objednat: "Place the order",
    objednavam: "Ordering…",
    objednavkaHotova: "Your order is ready",
    objednavkaHotovaPopis:
      "Taking you up to your ticket — show it to the team at the bar.",
    zobrazitVstupenku: "Show my ticket",
    zalohyNadpis: "Deposit cups",
    zalohyNapoveda: "How many deposit cups you're handing over",
    zalohyUbrat: "Remove one deposit cup",
    zalohyPridat: "Add one deposit cup",
    ubrat: (nazev: string) => `Remove one ${nazev}`,
    pridat: (nazev: string) => `Add one ${nazev}`,
    chybaObjednavky: "We couldn't send your order. Please try again.",
    zrusit: "Cancel order",
    zrusitPotvrzeni: "Really cancel? Your credit will be refunded.",
    zrusitAno: "Yes, cancel",
    zrusitNe: "Keep it",
    rusim: "Cancelling…",
    chybaZruseni:
      "We couldn't cancel the order — it may already have been handed out.",
  },

  sortiment: {
    kategorieLabel: "Menu categories",
    longevity: {
      titulek: "Longevity Bar menu",
      popisMeta:
        "Drinks, coffee, food and take-home products at the Longevity Bar during Healing Festival.",
      eyebrow: "Longevity Bar · festival menu",
      nadpis: "Find whatever you fancy right now",
      podnadpis:
        "From fresh coconut water through speciality coffee to breakfast bowls. We've put the menu together so you can grab a quick refresher or settle in for a whole flavour ritual.",
      zpet: "← Back to the hub",
      ctaNadpis: "Already found your favourite?",
      ctaPopis: "Come and see us at the bar and we'll help you pick by taste.",
      ctaTlacitko: "Open your loyalty card",
      kategorie: LONGEVITY_KATEGORIE_EN,
      podnadpisy: LONGEVITY_KATEGORIE_PODNADPIS_EN,
      polozky: katalogTexty(
        LONGEVITY_BAR_CATALOG,
        LONGEVITY_KATALOG_EN,
        "longevity/en",
      ),
    },
    wildCoco: {
      titulek: "The WILD&COCO range",
      popisMeta:
        "A curated pick of fermented coconut products, plant-based food and wellbeing essentials from WILD&COCO.",
      eyebrow: "WILD&COCO · living food",
      nadpis: "Take the taste of the Longevity Bar home",
      podnadpis:
        "We've picked the product families we come back to every day — from fermented young coconut through plant-based meals to the coconut pantry. Every product opens straight in the official online shop.",
      zpet: "← Back to the hub",
      kategorieLabel: "WILD&COCO product categories",
      otevritVEshopu: (nazev: string) => `${nazev} — open in the online shop`,
      prohlednout: "View in the online shop",
      ctaEyebrow: "Not sure where to start?",
      ctaNadpis: "Find your product by taste",
      ctaPopis:
        "The quick microbiome quiz will show you products you might enjoy.",
      ctaTlacitko: "Start the quiz",
      kategorie: WILD_COCO_KATEGORIE_EN,
      popisy: WILD_COCO_KATEGORIE_POPIS_EN,
      polozky: katalogTexty(
        WILD_COCO_CATALOG,
        WILD_COCO_KATALOG_EN,
        "wild-coco/en",
      ),
    },
  },

  vernost: {
    kategorie: {
      cocofir: "Cocofir 250 ml",
      coco_water: "Coconut water",
      drink: "Drink of your choice",
    },
    kategorieDlouhe: {
      cocofir: "Cocofir 250 ml — any flavour",
      coco_water: "Coconut water — any variant",
      drink: "Drink — any drink from the menu",
    },
    razitkoZiskano: (cislo: number) => `Stamp ${cislo} collected`,
    volnePolicko: (cislo: number) => `Empty slot ${cislo}`,
  },

  kviz: {
    titulek: "Unlock your microbiome's potential — quiz",
    vyberNadpis: "Choose your quiz",
    vyberPopis:
      "You can complete each one once. Your answers stay on your phone only.",
    variantaMikrobiom: "Microbiome",
    variantaMikrobiomPopis: "Quick quiz · 3 questions",
    variantaProfil: "Longevity profile",
    variantaProfilPopis: "In-depth quiz · 9 questions",
    doporuceny: "Recommended for this QR code",
    hotovo: "Done ✓",
    vybrat: "Choose →",
    posilaTePred: "Sent your way by",
    posilaTePo: "from the Longevity Bar.",

    obeHotovoNadpis: "You've completed both quizzes",
    obeHotovoPopis:
      "There's no further quiz coupon waiting for you — but you can pass the discount on to your friends or browse the whole range.",
    obeHotovoDarek: "Give your friends the discount →",
    obeHotovoSortiment: "Browse the WILD&COCO range →",

    uvodNadpisPred: "Unlock your",
    uvodNadpisPo: "microbiome's potential!",
    hook: `3 questions, 30 seconds — find out what your microbiome is asking for and get ${SLEVA_PROCENT}% off, picked for you.`,
    odemknout: "Unlock it →",

    otazkaZe: (cislo: number, celkem: number) =>
      `Question ${cislo} of ${celkem}`,
    odemceno: "Unlocked 🔓",
    nebo: "— or —",
    oblibeny: "I already have my favourite WILD&COCO product!",

    q1: {
      text: "What matters most to you in life?",
      moznosti: {
        zdravi: "Longevity and feeling well",
        energie: "Energy to spare",
        klid: "A calm mind and ease",
        rodina: "Family and the people around me",
      },
    },
    q2: {
      text: "How is your digestion doing?",
      moznosti: {
        hodinky: "Runs like clockwork",
        nafoukle: "Bloated after meals",
        pomale: "Slow and sluggish",
        citlive: "Sensitive — reacts to all sorts",
      },
    },
    q3: {
      text: "What does your dream everyday breakfast look like?",
      moznosti: {
        miska: "A sweet, generous bowl",
        slana: "Savoury and substantial",
        lehka: "Light and fresh",
        rychla: "A quick lift on the go",
        nesnidam: "I skip breakfast — coffee at most",
      },
    },

    vyberOblibenyNadpis: "Your favourite product",
    vyberDoporuceneNadpis: "Your microbiome will love this",
    vyberOblibenyPopis: `Find yours — which product would you like ${SLEVA_PROCENT}% off until the end of the year?`,
    vyberDoporucenePopisPred: "Unlock its potential every morning. Pick",
    vyberJedenProdukt: "one product",
    vyberDoporucenePopisPo: `— that's the one your ${SLEVA_PROCENT}% coupon is for.`,
    kuponPlatiVEshopu:
      "The coupon is valid in the wildandcoco.com online shop, not at the stand.",

    formularNadpis: "Where should we send your coupon?",
    formularSlevaPred: `${SLEVA_PROCENT}% off`,
    zmenitProdukt: "Change product",
    posilam: "Sending…",
    chciKupon: `Get my ${SLEVA_PROCENT}% coupon`,
    souhlas:
      "We'll use your details to send the coupon and Longevity tips from WILD&COCO until 31 December 2026 at the latest (max. 6 messages). You can withdraw your consent at any time, details in the Terms below. We don't store your quiz answers.",

    vyhraNadpis: "You've got it! 🎉",
    vyhraKuponPred: `${SLEVA_PROCENT}% coupon for`,
    kodKuponu: "Coupon code",
    nakoupit: "Shop at wildandcoco.com",
    pokracovatDoAppky: "Continue into the Longevity Bar app →",
    emailOdeslanPred: "Your coupon is also on its way to",
    emailOdeslanPo: "— do check your spam folder too.",
    emailNeodeslanPred:
      "We couldn't send the email right now — please take a photo of the code or",
    emailNeodeslanZvyraznene: "write it down",
    emailNeodeslanPo: ".",

    podminky:
      "Valid until 31 December 2026 · tied to your email only · unlimited number of orders · minimum order 500 CZK.",
    podminkyFallback:
      "Valid until 30 September 2026 · minimum order 500 CZK · one use per customer.",

    kategorie: {
      streva: "Gut & everyday care",
      piti: "Refreshment & drinks",
      energie: "Energy & performance",
      suplementy: "Food supplements",
      sladke: "Sweet",
      slane: "Savoury",
      vareni: "For cooking",
    },
  },

  kvizProfil: {
    uvodNadpisPred: "Find your own",
    uvodNadpisPo: "WILD&COCO routine",
    hook: `9 questions, one minute — find your WILD&COCO routine and take ${SLEVA_PROCENT}% off a product of your choice.`,
    disclaimer: "This is product inspiration, not medical advice.",
    jdemeNaTo: "Let's go →",
    hotovo: "Done ✨",
    otazkaZ: (cislo: number, celkem: number) => `Question ${cislo} of ${celkem}`,
    vyberNadpis: "Your tailored routine",
    vyberPopisPred: "Pick",
    vyberJedenProdukt: "one product",
    vyberPopisPo: `— that's the one your ${SLEVA_PROCENT}% coupon is for.`,

    otazky: [
      "How do you feel about cooking?",
      "What does your daily lifestyle look like?",
      "Which flavours do you like most?",
      "How is your digestion doing?",
      "How do you plan your meals?",
      "What do you look for most in what you eat?",
      "How often do you eat fermented foods?",
      "How do you feel after a meal?",
      "Do you react to certain foods?",
    ],
    moznosti: [
      [
        "I love experimenting and cooking at home",
        "I want it quick and practical",
        "I'd rather have it ready and tasty",
      ],
      [
        "I move a lot",
        "I'm dealing with stress and want more resilience",
        "Eating well and looking ahead",
      ],
      [
        "Fresh, light drinks",
        "Bold fermented flavours",
        "Food without gluten or dairy",
        "Generous breakfasts",
      ],
      [
        "No trouble at all, I want long-term support",
        "Sometimes sensitive",
        "Very sensitive",
      ],
      [
        "I want fresh inspiration every day",
        "A quick solution for the whole week",
        "Mostly lunches and dinners, breakfast is quick",
      ],
      [
        "Tasty new things",
        "Getting the most out of what I eat",
        "Alternatives without gluten or dairy",
        "Practical nutrition for a busy life",
      ],
      ["Every day, and I love them", "Now and then", "Almost never, but I'd like to start"],
      [
        "I tend to feel tired or sleepy, thirsty or hungry",
        "None of the above",
      ],
      [
        "After certain foods I get headaches, digestive trouble, skin reactions or fatigue",
        "None of the above",
      ],
    ],
    profily: PROFILY_EN,

    vyhodnoceni: VYHODNOCENI_TEXTY_EN as Record<string, string>,
    persony: Object.fromEntries(
      PERSONY_EN.map((p) => [
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
    postrehy: POSTREHY_TEXTY_EN,
  },

  chyby: {
    neprihlasen: "You're not signed in.",
    neplatnyPozadavek: "Invalid request.",
    rozbiloSe: "Something broke. Please scan the QR code again.",
    prihlasSeAOtevriKviz:
      "Please sign in with your phone number first, then open the quiz again.",
    kuponUzPoslan:
      "We sent you a coupon a moment ago — check your inbox, and your spam folder too.",
    variantaHotova:
      "You've already completed this quiz variant. Please pick the other one.",
    kvizNedokoncen: "We couldn't finish the quiz right now. Please try again.",
    osobniKuponSelhal:
      "We couldn't create your personal coupon. Please try again in a moment.",
    zapisSelhal: "We couldn't save that. Please try once more.",
    potvrzeniSelhalo:
      "Your quiz is saved, but the confirmation didn't go through. Please talk to the Longevity Bar team.",
    napisJmeno: "Please tell us your first name.",
    zkontrolujEmail: "Please check your email — that's where the coupon goes.",
    telefonNesedi: "That phone number doesn't look right. Please try again.",
    kodNesedi: "That code doesn't match or has expired.",
    overeniSelhalo: "Verification didn't go through. Please try again.",
    vyberSelhal: "That didn't go through, please try again.",
    vydejSelhal: "That didn't go through, please try again.",
    kreditNedostupny:
      "We couldn't load your credit right now. Please try again in a moment.",
    kreditNemas: "We don't have any Longevity Bar credit for you.",
    objednavkaNesmysl: "That order doesn't add up. Please choose again.",
    zalohyNesmysl: "That deposit count doesn't add up. Please enter it again.",
    chybiObjednavka: "There's no order to hand over.",
    objednavkaVydana: "This order has already been handed over, or doesn't exist.",
    zadejPlatnyEmail: "Enter a valid email.",
    zadejPlatnyTelefon: "Enter a valid phone number.",
    prilisMnohoPokusu: "Too many attempts. Please request a new code.",
    kodNeodeslan: "We couldn't send the code right now. Please try again shortly.",
    aktivacniEmailNepripraven: "We couldn't prepare the activation email.",
    aktivacniEmailNeodeslan: "We couldn't send the activation email.",
    odmena: {
      email_unverified:
        "Please confirm your email first. We've sent you a new confirmation email, provided at least 10 minutes have passed since the last one.",
      no_reward: "You're not eligible for a reward just yet.",
      bad_product: "This product can't be picked right now — it's most likely sold out.",
      already_redeemed: "This reward has already been handed over.",
      not_selected: "You need to pick a specific product first.",
      not_found: "We couldn't find that reward.",
      bad_pin: "Wrong staff PIN.",
    },
  },

  email: {
    kuponPredmet: (produkt: string) =>
      `Your ${SLEVA_PROCENT}% coupon for ${produkt}`,
    kuponPozdrav: (jmeno: string) => `Hi ${jmeno},`,
    kuponNadpis: `Your ${SLEVA_PROCENT}% coupon 🦠`,
    kuponUvodPred: "Your microbiome asked for",
    kuponUvodPo: ".",
    kuponTextUvod: (produkt: string) =>
      `your microbiome asked for ${produkt} today — here's your ${SLEVA_PROCENT}% coupon:`,
    kuponKodLabel: "Coupon code",
    kuponTlacitko: "Shop at wildandcoco.com",
    kuponVlozPred: "Enter the code in your basket at",
    kuponVlozPo: ".",
    kuponRozlouceni: "Enjoy!",
    kuponPodpis: "Wild & Coco · Longevity Bar",
    aktivacePredmet: "Activate your Longevity Bar rewards",
    aktivaceTelo:
      "Hi! Welcome to the Longevity Bar loyalty programme. Ready for your rewards? If so, activate your account here.",
    aktivaceOdkazSlovo: "here",
  },
};
