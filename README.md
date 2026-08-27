# earphone-compare

イヤホン比較サイト（Next.js + Supabase）。

## Getting Started

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いてください。

## Google Analytics (GA4)

gtag.js による計測を有効にするには、計測 ID を環境変数 `NEXT_PUBLIC_GA_ID` に設定してください。

### ローカル

`.env.local` に追加:

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Vercel（必須）

本番・プレビューでも計測するため、Vercel ダッシュボードで環境変数を設定してください（コード側では設定しません）。

1. [Vercel Dashboard](https://vercel.com/) → 対象プロジェクト → **Settings** → **Environment Variables**
2. 次を追加:
   - **Key**: `NEXT_PUBLIC_GA_ID`
   - **Value**: `G-3RFCQ8DJB6`
   - **Environments**: Production / Preview / Development すべてにチェック
3. 保存後、反映のために **再デプロイ**（Deployments → 最新の … → Redeploy）を実行

`NEXT_PUBLIC_` 付き変数はビルド時に埋め込まれるため、追加・変更後は再デプロイが必要です。

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

## Yahoo!ショッピングアフィリエイトリンク同期

`earphones` テーブルの各機種を Yahoo!ショッピング商品検索 API（v3）で探し、見つかった商品のアフィリエイト URL と価格を `yahoo_url` / `yahoo_price` / `yahoo_updated_at` に日次で反映します（`url` / `price` は公式・現状ショップ用として変更しません）。

バリューコマース経由のアフィリエイトリンクは、API リクエスト時に `affiliate_type=vc` と URL エンコード済みの `affiliate_id` を指定して取得します。

### ローカル実行

`.env.local` に以下を設定したうえで:

```bash
# 結果だけ確認（DBは更新しない）
DRY_RUN=true npm run sync-yahoo-links

# 実際に更新する
npm run sync-yahoo-links
```

| 環境変数 | 説明 |
| --- | --- |
| `SUPABASE_URL` | Supabase プロジェクト URL（未設定時は `NEXT_PUBLIC_SUPABASE_URL`） |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS をバイパスする Service Role Key（書き込み権限が必要） |
| `YAHOO_APP_ID` | Yahoo!デベロッパーネットワークの Client ID（`appid`） |
| `YAHOO_CLIENT_ID` | （任意）`YAHOO_APP_ID` 未設定時に利用 |
| `VC_SID` | バリューコマース sid |
| `VC_PID` | バリューコマース pid |
| `DRY_RUN` | `true` のとき DB 更新せずログのみ |
| `SYNC_LIMIT` | （任意）処理する機種数の上限（動作確認用） |

Client ID は [Yahoo!デベロッパーネットワーク](https://developer.yahoo.co.jp/) でアプリ登録して取得してください。

### GitHub Actions

ワークフロー: [`.github/workflows/sync-yahoo-links.yml`](.github/workflows/sync-yahoo-links.yml)

- **スケジュール**: 毎日 04:00 JST（cron `0 19 * * *` UTC）
- **手動実行**: Actions タブ →「Sync Yahoo Shopping affiliate links (earphones)」→ Run workflow  
  - `dry_run` を `true` にすると更新せず結果だけログ出力

リポジトリの **Settings → Secrets and variables → Actions** に次を登録してください。

| Secret 名 | 用途 |
| --- | --- |
| `SUPABASE_URL` | Supabase プロジェクト URL |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS をバイパスする書き込み用 Service Role Key |
| `YAHOO_APP_ID` または `YAHOO_CLIENT_ID` | Yahoo!デベロッパーネットワーク Client ID（どちらか一方で可） |
| `VC_SID` | バリューコマース sid |
| `VC_PID` | バリューコマース pid |

マッチしなかった機種は DB を変更せずスキップし、ログに理由を残します。
