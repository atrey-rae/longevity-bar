import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin-guard";
import { jePushNakonfigurovany } from "@/lib/push-config";
import { createAdminClient } from "@/lib/supabase/admin";

import OznameniFormular from "./OznameniFormular";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Oznámení" };

/** Kolik zařízení je v které skupině — ať admin ví, komu vlastně píše. */
async function pocty(): Promise<{ vsichni: number; prihlaseni: number }> {
  try {
    const admin = createAdminClient();
    const [vsichni, prihlaseni] = await Promise.all([
      admin.from("push_subscriptions").select("id", { count: "exact", head: true }),
      admin
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .not("user_id", "is", null),
    ]);
    return { vsichni: vsichni.count ?? 0, prihlaseni: prihlaseni.count ?? 0 };
  } catch {
    return { vsichni: 0, prihlaseni: 0 };
  }
}

/**
 * Ruční hromadné oznámení.
 *
 * Odesílá se server action (ne API routa), takže se autorizace vynucuje na
 * serveru dvakrát — jednou pro zobrazení stránky, jednou uvnitř samotné akce.
 * Server actions jsou veřejné endpointy, takže admin guard v nich nesmí chybět.
 */
export default async function AdminOznameniPage() {
  await requireAdmin("/admin/oznameni");
  const nakonfigurovano = jePushNakonfigurovany();
  const skupiny = nakonfigurovano ? await pocty() : { vsichni: 0, prihlaseni: 0 };

  return (
    <div className="space-y-4">
      <h1>Oznámení</h1>

      {!nakonfigurovano ? (
        <div className="karta space-y-2 text-sm leading-relaxed">
          <p className="font-bold text-mango-400">Oznámení nejsou nakonfigurovaná.</p>
          <p className="text-kokos-50/80">
            Chybí VAPID klíče. Vygeneruj je příkazem{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">
              npx web-push generate-vapid-keys
            </code>{" "}
            a nastav ve Vercelu proměnné <code>VAPID_PUBLIC_KEY</code>,{" "}
            <code>VAPID_PRIVATE_KEY</code> a <code>VAPID_SUBJECT</code> (např.{" "}
            <code>mailto:atrey@wildandcoco.com</code>). Do té doby se hostům
            oznámení vůbec nenabízejí.
          </p>
        </div>
      ) : (
        <OznameniFormular
          pocetVsichni={skupiny.vsichni}
          pocetPrihlaseni={skupiny.prihlaseni}
        />
      )}
    </div>
  );
}
