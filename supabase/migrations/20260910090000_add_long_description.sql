-- 商品詳細ページ向けの独自長文説明（AdSense向けコンテンツ拡充用）
-- 既存の description は一覧・短い要約用として残す
ALTER TABLE earphones
  ADD COLUMN IF NOT EXISTS long_description text;

COMMENT ON COLUMN earphones.long_description IS '商品詳細ページ用の独自長文説明（用途・比較・注意点など）';
