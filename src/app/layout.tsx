import type { Metadata, Viewport } from "next";
import Link from "next/link";

import PrepinacJazyka from "@/components/PrepinacJazyka";
import { LangProvider } from "@/lib/i18n/client";
import { HTML_LANG } from "@/lib/i18n/lang";
import { getT } from "@/lib/i18n/server";

import "./globals.css";

/**
 * Statická metadata zůstávají česká — jsou to výchozí hodnoty pro sdílení a
 * roboti stránku stejně neindexují (`robots: noindex`). Jazykové varianty
 * titulků řeší jednotlivé stránky přes `generateMetadata`.
 */
export const metadata: Metadata = {
  title: {
    default: "Longevity Bar — věrnostní karta",
    template: "%s · Longevity Bar",
  },
  description:
    "Věrnostní karta stánku Longevity Bar (Wild & Coco) na Healing Festivalu. Za každá 4 razítka odměna dle vlastního výběru.",
  manifest: "/manifest.webmanifest",
  applicationName: "Longevity Bar",
  appleWebApp: {
    capable: true,
    title: "Longevity Bar",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#042b29",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { lang, t } = await getT();

  return (
    <html lang={HTML_LANG[lang]}>
      <body>
        <LangProvider lang={lang}>
          <div className="flex min-h-dvh flex-col">
            {/* /85 místo /70: konfety letící za lištou pod ní prosvítaly jako
                barevné pruhy a působily jako grafická chyba. */}
            <header className="no-print sticky top-0 z-30 border-b border-white/10 bg-laguna-900/85 backdrop-blur-md">
              <div className="obal flex items-center justify-between gap-2 py-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-lg font-black tracking-tight text-kokos-50"
                >
                  <span className="text-2xl" aria-hidden>
                    🥥
                  </span>
                  <span>
                    {t.layout.znackaPred}{" "}
                    <span className="text-mango-400">{t.layout.znackaPo}</span>
                  </span>
                </Link>
                <div className="flex items-center gap-2.5">
                  {/* Na nejužších telefonech ustupuje název akce přepínači —
                      jazyk je funkce, „Healing Festival“ jen kontext. */}
                  <span className="hidden text-[0.65rem] font-bold uppercase tracking-widest text-kokos-50/60 min-[380px]:inline">
                    {t.layout.festival}
                  </span>
                  <PrepinacJazyka aktivni={lang} />
                </div>
              </div>
            </header>

            <main className="flex-1 py-6 sm:py-10">{children}</main>

            <footer className="no-print mt-6 border-t border-white/10 py-6 text-center text-xs text-kokos-50/70">
              <div className="obal space-y-2.5">
                <div className="flex items-center justify-center gap-2">
                  <Link
                    href="/pravidla"
                    className="rounded-full px-2 py-1 font-semibold text-kokos-50/85 transition hover:text-mango-400"
                  >
                    {t.spolecne.pravidlaAGdpr}
                  </Link>
                  <span className="text-kokos-50/25" aria-hidden>
                    ·
                  </span>
                  <a
                    href="https://wildandcoco.com"
                    className="rounded-full px-2 py-1 font-semibold text-kokos-50/85 transition hover:text-mango-400"
                  >
                    {t.layout.patickaEshop}
                  </a>
                </div>
                <p>{t.layout.patickaZnacka}</p>
              </div>
            </footer>
          </div>
        </LangProvider>
      </body>
    </html>
  );
}
