"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * Uloží kontakt zákazníka (křestní jméno + telefon pro speciální výhry).
 * Server action je veřejný endpoint — session se proto ověřuje uvnitř.
 * Tichý návrat místo výjimky: formulář zůstane zobrazený, dokud data neprojdou.
 */
export async function ulozitKontakt(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  const jmeno = String(formData.get("jmeno") ?? "")
    .trim()
    .slice(0, 80);
  const cislice = String(formData.get("telefon") ?? "").replace(/[\s()./-]/g, "");
  if (!jmeno || !/^\+?\d{9,15}$/.test(cislice)) return;
  // 9 číslic bez předvolby = české číslo.
  const telefon = cislice.startsWith("+")
    ? cislice
    : cislice.length === 9
      ? `+420${cislice}`
      : `+${cislice}`;

  const admin = createAdminClient();
  await admin.from("profiles").upsert(
    { id: user.id, email: user.email ?? null, full_name: jmeno, phone: telefon },
    { onConflict: "id" },
  );
  revalidatePath("/");
}
