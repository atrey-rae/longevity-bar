/**
 * Datové typy odpovídající schématu z `supabase/migrations/001_init.sql`.
 * Ručně psané (bez generátoru) — drž je v souladu s migrací.
 */

export type ProductCategory = "cocofir" | "coco_water" | "drink";
export type RewardState = "ready" | "selected" | "redeemed";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  /** Telefon pro speciální výhry — zadává zákazník v appce (migrace 002). */
  phone: string | null;
  /** Reálný kontaktní e-mail. Interní auth alias se sem nikdy nezapisuje. */
  email_verified_at: string | null;
  last_activation_email_at: string | null;
  /**
   * Osobní referral kód pro sledovatelné QR v „Dárku přátelům“ (migrace 008).
   * `null`, dokud ho zákazník nepotřeboval — přiděluje se líně na `/darek`.
   */
  referral_code: string | null;
  created_at: string;
}

export type PhoneIdentity = {
  phone_e164: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type PhoneAuthChallenge = {
  id: string;
  phone_e164: string;
  pin_hash: string;
  ip_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  created_at: string;
}

export type EmailActivationToken = {
  id: string;
  user_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export type PhoneIdentityConflict = {
  id: string;
  phone_e164: string;
  matching_user_ids: string[];
  created_at: string;
}

export type EventDay = {
  id: string;
  date: string; // YYYY-MM-DD
  label: string | null;
  token: string;
  active: boolean;
  created_at: string;
}

export type Stamp = {
  id: string;
  user_id: string;
  day_id: string | null;
  source: string;
  note: string | null;
  created_at: string;
}

export type Product = {
  id: string;
  category: ProductCategory;
  name: string;
  description: string | null;
  emoji: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export type Reward = {
  id: string;
  user_id: string;
  tier_index: number;
  category: ProductCategory;
  product_id: string | null;
  state: RewardState;
  selected_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
  created_at: string;
}

export type Setting = {
  key: string;
  value: unknown;
  updated_at: string;
}

/** Varianta kvízu (migrace 004). Stejný literál je i v `lib/kviz.ts`. */
export type QuizVariant = "microbiom" | "profil";

/** Lead z kvízu bavičů fronty — `/kviz/[bavic]` (migrace 003). */
export type QuizLead = {
  id: string;
  /** Kód baviče z kupónu (A1–F6). */
  bavic: string;
  product_slug: string;
  product_name: string;
  coupon_code: string;
  first_name: string;
  email: string;
  phone: string;
  /** Ze které varianty kvízu lead vznikl (migrace 004). */
  quiz_variant: QuizVariant;
  /**
   * Referral kód zákazníka, jehož osobní QR kamarád načetl (migrace 008).
   * `null` = kvíz přišel bez `?od=` nebo byl kód neplatný.
   */
  referral_code: string | null;
  created_at: string;
}

/**
 * Nastavení varianty kvízu pro jednoho baviče (migrace 004).
 * `code` = kód baviče z kupónu (A1–F6).
 */
export type QuizHost = {
  code: string;
  variant: QuizVariant;
  updated_at: string;
  updated_by: string | null;
}

export type QuizSetting = {
  singleton: boolean;
  quiz_login_required: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type QuizCompletion = {
  id: string;
  user_id: string | null;
  contact_hash: string | null;
  quiz_variant: QuizVariant;
  bavic_code: string;
  status: "pending" | "completed";
  created_at: string;
  completed_at: string | null;
}

/**
 * Tvar tabulky očekávaný `@supabase/postgrest-js`.
 * Vztahy (`Relationships`) nepoužíváme — vnořené selecty nikde neděláme,
 * data spojujeme v aplikaci (objem dat je na festivalu malý).
 */
type Tabulka<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/** Minimalistický typ databáze pro `@supabase/supabase-js`. */
export interface Database {
  public: {
    Tables: {
      profiles: Tabulka<
        Profile,
        Partial<Profile> & { id: string },
        Partial<Profile>
      >;
      phone_identities: Tabulka<
        PhoneIdentity,
        Partial<PhoneIdentity> & { phone_e164: string; user_id: string },
        Partial<PhoneIdentity>
      >;
      phone_auth_challenges: Tabulka<
        PhoneAuthChallenge,
        Partial<PhoneAuthChallenge> & {
          phone_e164: string;
          pin_hash: string;
          ip_hash: string;
          expires_at: string;
        },
        Partial<PhoneAuthChallenge>
      >;
      email_activation_tokens: Tabulka<
        EmailActivationToken,
        Partial<EmailActivationToken> & {
          user_id: string;
          email: string;
          token_hash: string;
          expires_at: string;
        },
        Partial<EmailActivationToken>
      >;
      phone_identity_conflicts: Tabulka<
        PhoneIdentityConflict,
        Partial<PhoneIdentityConflict> & {
          phone_e164: string;
          matching_user_ids: string[];
        },
        Partial<PhoneIdentityConflict>
      >;
      event_days: Tabulka<
        EventDay,
        Partial<EventDay> & { date: string },
        Partial<EventDay>
      >;
      stamps: Tabulka<
        Stamp,
        Partial<Stamp> & { user_id: string },
        Partial<Stamp>
      >;
      products: Tabulka<
        Product,
        Partial<Product> & { category: ProductCategory; name: string },
        Partial<Product>
      >;
      rewards: Tabulka<
        Reward,
        Partial<Reward> & {
          user_id: string;
          tier_index: number;
          category: ProductCategory;
        },
        Partial<Reward>
      >;
      settings: Tabulka<
        Setting,
        { key: string; value: unknown; updated_at?: string },
        Partial<Setting>
      >;
      quiz_leads: Tabulka<
        QuizLead,
        // `quiz_variant` i `referral_code` jsou volitelné, přestože jsou
        // v `QuizLead` povinné: v databázi mají default 'microbiom' resp. NULL,
        // takže insert bez nich je platný — nutné pro degradovaný zápis, pokud
        // migrace 004 nebo 008 ještě neproběhla (viz `app/kviz/actions.ts`).
        Omit<QuizLead, "id" | "created_at" | "quiz_variant" | "referral_code"> & {
          id?: string;
          created_at?: string;
          quiz_variant?: QuizVariant;
          referral_code?: string | null;
        },
        Partial<QuizLead>
      >;
      quiz_hosts: Tabulka<
        QuizHost,
        Partial<QuizHost> & { code: string },
        Partial<QuizHost>
      >;
      quiz_settings: Tabulka<
        QuizSetting,
        Partial<QuizSetting> & { singleton: boolean },
        Partial<QuizSetting>
      >;
      quiz_completions: Tabulka<
        QuizCompletion,
        Partial<QuizCompletion> & {
          quiz_variant: QuizVariant;
          bavic_code: string;
        },
        Partial<QuizCompletion>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      consume_phone_auth_challenge: {
        Args: {
          p_id: string;
          p_phone_e164: string;
          p_pin_hash: string;
        };
        Returns: string;
      };
    };
    Enums: {
      product_category: ProductCategory;
      reward_state: RewardState;
    };
    CompositeTypes: Record<string, never>;
  };
}
