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
  created_at: string;
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
        Omit<QuizLead, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<QuizLead>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_category: ProductCategory;
      reward_state: RewardState;
    };
    CompositeTypes: Record<string, never>;
  };
}
