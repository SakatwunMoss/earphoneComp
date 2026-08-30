-- 公式/現状ショップ・楽天とは別に、Yahoo!ショッピングアフィリエイト用カラムを追加する
ALTER TABLE earphones
  ADD COLUMN IF NOT EXISTS yahoo_url text,
  ADD COLUMN IF NOT EXISTS yahoo_price integer,
  ADD COLUMN IF NOT EXISTS yahoo_updated_at timestamptz;

COMMENT ON COLUMN earphones.yahoo_url IS 'Yahoo!ショッピングアフィリエイトリンク';
COMMENT ON COLUMN earphones.yahoo_price IS 'Yahoo!ショッピングでの価格';
COMMENT ON COLUMN earphones.yahoo_updated_at IS 'Yahoo!ショッピングリンク最終同期日時';
