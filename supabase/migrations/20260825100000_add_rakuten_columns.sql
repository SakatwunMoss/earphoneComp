-- 公式/現状ショップの url・price とは別に、楽天アフィリエイト用カラムを追加する
ALTER TABLE earphones
  ADD COLUMN IF NOT EXISTS rakuten_url text,
  ADD COLUMN IF NOT EXISTS rakuten_price integer,
  ADD COLUMN IF NOT EXISTS rakuten_updated_at timestamptz;

COMMENT ON COLUMN earphones.url IS '公式または現状掲載中のショップへのリンク';
COMMENT ON COLUMN earphones.price IS '公式または現状掲載中ショップの価格';
COMMENT ON COLUMN earphones.rakuten_url IS '楽天市場アフィリエイトリンク';
COMMENT ON COLUMN earphones.rakuten_price IS '楽天市場での価格';
COMMENT ON COLUMN earphones.rakuten_updated_at IS '楽天リンク最終同期日時';
