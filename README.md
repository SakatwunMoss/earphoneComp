# earphone-compare

イヤホン比較サイト（Next.js + Supabase）。

## Getting Started

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いてください。

## 楽天アフィリエイトリンク同期

`earphones` テーブルの各機種を楽天市場商品検索 API で探し、見つかった商品のアフィリエイト URL と価格を `rakuten_url` / `rakuten_price` / `rakuten_updated_at` に日次で反映します（`url` / `price` は公式・現状ショップ用として変更しません）。

### ローカル実行

`.env.local` に以下を設定したうえで:

```bash
# 結果だけ確認（DBは更新しない）
DRY_RUN=true npm run sync-rakuten-links

# 実際に更新する
npm run sync-rakuten-links
```

| 環境変数 | 説明 |
| --- | --- |
| `SUPABASE_URL` | Supabase プロジェクト URL（未設定時は `NEXT_PUBLIC_SUPABASE_URL`） |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS をバイパスする Service Role Key（書き込み権限が必要） |
| `RAKUTEN_APP_ID` | 楽天ウェブサービスのアプリ ID（UUID 形式） |
| `RAKUTEN_ACCESS_KEY` | 楽天ウェブサービスのアクセスキー |
| `RAKUTEN_AFFILIATE_ID` | 楽天アフィリエイト ID |
| `RAKUTEN_ORIGIN` | （任意）アプリ登録時の許可ドメイン。Web application の場合は必須（例: `https://earphone-comp.vercel.app`）。Backend service なら不要 |
| `DRY_RUN` | `true` のとき DB 更新せずログのみ |

楽天 API は 2026 年以降、旧エンドポイント（`app.rakuten.co.jp`）が廃止され、`applicationId` と `accessKey` の両方が必須です。

- **推奨**: [楽天 Developer Dashboard](https://webservice.rakuten.co.jp/app/list) で **Backend service** として登録（GitHub Actions 向け。Referer 不要）
- **Web application** のまま使う場合: 許可ドメインを登録し、`RAKUTEN_ORIGIN` にその URL を設定してください

### GitHub Actions

ワークフロー: [`.github/workflows/sync-rakuten-links.yml`](.github/workflows/sync-rakuten-links.yml)

- **スケジュール**: 毎日 03:00 JST（cron `0 18 * * *` UTC）
- **手動実行**: Actions タブ →「Sync Rakuten affiliate links (earphones)」→ Run workflow  
  - `dry_run` を `true` にすると更新せず結果だけログ出力

リポジトリの **Settings → Secrets and variables → Actions** に次の 5 つを登録してください。

| Secret 名 | 用途 |
| --- | --- |
| `SUPABASE_URL` | Supabase プロジェクト URL |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS をバイパスする書き込み用 Service Role Key |
| `RAKUTEN_APP_ID` | 楽天ウェブサービス アプリ ID（UUID） |
| `RAKUTEN_ACCESS_KEY` | 楽天ウェブサービス アクセスキー |
| `RAKUTEN_AFFILIATE_ID` | 楽天アフィリエイト ID |
| `RAKUTEN_ORIGIN` | （任意）Web application 利用時の許可ドメイン Origin |

マッチしなかった機種は DB を変更せずスキップし、ログに理由を残します。
