import type { Metadata, Viewport } from "next";
import Link from "next/link";

import "./globals.css";

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
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#042b29",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <body>
        <div className="flex min-h-dvh flex-col">
          {/* /85 místo /70: konfety letící za lištou pod ní prosvítaly jako
              barevné pruhy a působily jako grafická chyba. */}
          <header className="no-print sticky top-0 z-30 border-b border-white/10 bg-laguna-900/85 backdrop-blur-md">
            <div className="obal flex items-center justify-between py-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-black tracking-tight text-kokos-50"
              >
                <span className="text-2xl" aria-hidden>
                  🥥
                </span>
                <span>
                  Longevity <span className="text-mango-400">Bar</span>
                </span>
              </Link>
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-kokos-50/60">
                Healing Festival
              </span>
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
                  Pravidla &amp; GDPR
                </Link>
                <span className="text-kokos-50/25" aria-hidden>
                  ·
                </span>
                <a
                  href="https://wildandcoco.com"
                  className="rounded-full px-2 py-1 font-semibold text-kokos-50/85 transition hover:text-mango-400"
                >
                  Wild &amp; Coco
                </a>
              </div>
              <p>Peace &amp; Coco · Longevity Bar</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
