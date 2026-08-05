import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Administrace", template: "%s · Admin" },
};

const ODKAZY = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/dny", label: "Dny a QR" },
  { href: "/admin/produkty", label: "Produkty" },
  { href: "/admin/uzivatele", label: "Uživatelé" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ochrana celé sekce — kontrola e-mailu proti settings.admin_emails.
  const { user } = await requireAdmin("/admin");

  return (
    <div className="obal max-w-3xl space-y-4">
      <nav className="no-print flex flex-wrap items-center gap-2">
        {ODKAZY.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-bold hover:bg-white/20"
          >
            {o.label}
          </Link>
        ))}
        <Link
          href="/odmeny"
          className="ml-auto text-xs font-semibold text-kokos-50/60 underline underline-offset-4"
        >
          zpět do appky
        </Link>
      </nav>

      <p className="no-print px-1 text-xs text-kokos-50/50">
        Přihlášen jako {user.email}
      </p>

      {children}
    </div>
  );
}
