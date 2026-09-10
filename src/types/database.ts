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
  /** Yahoo!ショッピングアフィリエイトリンク（同期スクリプトが更新） */
  yahoo_url: string | null;
  /** Yahoo!ショッピングでの価格 */
  yahoo_price: number | null;
  /** Yahoo!ショッピングリンク最終同期日時 */
  yahoo_updated_at: string | null;
  image_url: string | null;
  category: string;
  noise_cancelling: boolean;
  battery_life: string | null;
  water_resistance: string | null;
  /** 一覧・短い要約用 */
  description: string | null;
  /** 商品詳細ページ用の独自長文説明（用途・比較・注意点など） */
  long_description: string | null;
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
