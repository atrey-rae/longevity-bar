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
          <header className="no-print sticky top-0 z-30 border-b border-white/10 bg-laguna-900/70 backdrop-blur-md">
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

          <main className="flex-1 py-5">{children}</main>

          <footer className="no-print border-t border-white/10 py-5 text-center text-xs text-kokos-50/60">
            <div className="obal space-y-2">
              <div className="flex justify-center gap-4">
                <Link href="/pravidla" className="odkaz">
                  Pravidla &amp; GDPR
                </Link>
                <a href="https://wildandcoco.com" className="odkaz">
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
