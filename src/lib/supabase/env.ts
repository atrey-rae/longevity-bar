/**
 * Přístup k env proměnným.
 *
 * Důležité: nic se nečte na úrovni modulu — jen uvnitř funkcí, které se volají
 * za běhu. Díky tomu `npm run build` projde i bez reálných klíčů a chybějící
 * konfigurace se pozná okamžitě podle srozumitelné chyby.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Chybí proměnná prostředí ${name}. Zkopíruj .env.example do .env.local ` +
        `(lokálně) nebo ji doplň ve Vercelu → Settings → Environment Variables.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseServiceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Veřejná adresa aplikace bez lomítka na konci. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim() !== "") {
    return explicit.trim().replace(/\/+$/, "");
  }
  // Fallback pro náhledové deploye na Vercelu
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
