export type Earphone = {
  id: string;
  name: string;
  brand: string;
  price: number | null;
  url: string | null;
  /** 楽天市場アフィリエイトリンク（同期スクリプトが更新） */
  rakuten_url: string | null;
  /** 楽天市場での価格 */
  rakuten_price: number | null;
  /** 楽天リンク最終同期日時 */
  rakuten_updated_at: string | null;
  image_url: string | null;
  category: string;
  noise_cancelling: boolean;
  battery_life: string | null;
  water_resistance: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      earphones: {
        Row: Earphone;
        Insert: Omit<Earphone, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Earphone, "id">>;
      };
    };
  };
};
