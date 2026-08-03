/**
 * Datové typy odpovídající schématu z `supabase/migrations/001_init.sql`.
 * Ručně psané (bez generátoru) — drž je v souladu s migrací.
 */

export type ProductCategory = "cocofir" | "coco_water" | "drink";
export type RewardState = "ready" | "selected" | "redeemed";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export interface EventDay {
  id: string;
  date: string; // YYYY-MM-DD
  label: string | null;
  token: string;
  active: boolean;
  created_at: string;
}

export interface Stamp {
  id: string;
  user_id: string;
  day_id: string | null;
  source: string;
  note: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  category: ProductCategory;
  name: string;
  description: string | null;
  emoji: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Reward {
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

export interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

/** Minimalistický typ databáze pro `@supabase/supabase-js`. */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      event_days: {
        Row: EventDay;
        Insert: Partial<EventDay> & { date: string };
        Update: Partial<EventDay>;
      };
      stamps: {
        Row: Stamp;
        Insert: Partial<Stamp> & { user_id: string };
        Update: Partial<Stamp>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { category: ProductCategory; name: string };
        Update: Partial<Product>;
      };
      rewards: {
        Row: Reward;
        Insert: Partial<Reward> & {
          user_id: string;
          tier_index: number;
          category: ProductCategory;
        };
        Update: Partial<Reward>;
      };
      settings: {
        Row: Setting;
        Insert: { key: string; value: unknown; updated_at?: string };
        Update: Partial<Setting>;
      };
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
