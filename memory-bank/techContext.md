# 技術コンテキスト

## 使用技術

### フロントエンド
- **Astro**: バージョン5.0.5を使用した静的サイト生成
- **マークダウン**: コンテンツ管理のための主要フォーマット
- **CSS変数**: カラースキームとスタイリングの管理
- **レスポンシブデザイン**: CSSグリッドとフレックスボックスによる実装

### バックエンド
- **Cloudflare Workers**: サーバーレス関数の実行環境
- **TypeScript**: 型安全なコード開発
- **Node.js互換モード**: Workersでのnode.js APIの利用（compatibility_flags: "nodejs_compat"）

### データストレージ
- **Cloudflare Vectorize**: 関連記事のベクトル検索（"related-articles-index"）
- **Cloudflare KV**: アイキャッチ画像の保存と取得（"EYECATCH_STORE"）

### AI / ML
- **Cloudflare Workers AI**: AIモデルの利用（embedding生成など）
- **AI生成アイキャッチ画像**: ドット絵スタイルのサムネイル作成

## 開発環境のセットアップ

### 必要ツール
- **Node.js**: JavaScriptランタイム
- **Bun**: 高速JavaScriptランタイムとパッケージマネージャー（bun.lockbファイルの存在から）
- **Wrangler CLI**: Cloudflare Workersの開発・デプロイツール

### 開発コマンド
```bash
# Astroサイトの開発サーバー起動
cd web
npm run dev  # または npm start

# Cloudflare Workersのローカル実行
cd related-articles-worker
npx wrangler dev

# OGPカード生成
npm run remark-ogp-card
```

### DevContainer
- プロジェクトはDevContainerを使用して開発環境を標準化
- `.devcontainer/`ディレクトリ内に設定（リポジトリに含まれている可能性）

## 技術的制約

### パフォーマンス
- 静的サイト生成による高速なロード時間の確保
- 画像最適化によるパフォーマンス向上

### セキュリティ
- Cloudflareの提供する保護機能の活用
- サーバーレスアーキテクチャによるインフラ管理の簡素化

### 配信
- Cloudflareによるグローバルなコンテンツ配信
- エッジでの処理による低レイテンシー

## 主要な依存関係

### ウェブサイト（web/package.json）
- **astro**: 5.0.5
- **@astrojs/rss**: RSS機能
- **remark & remark-html**: マークダウン処理
- **sanitize-html**: HTMLサニタイズ
- **node-fetch**: HTTP要求
- **glob & gray-matter**: マークダウンファイルのフロントマター処理

### 関連記事ワーカー
- **Cloudflare Vectorize**: ベクトル検索DB
- **Cloudflare Workers AI**: AIモデルの利用
- **Cloudflare KV**: キーバリューストレージ

## リンクと参考情報
- **サイトURL**: https://yaakai.to
- **リポジトリ**: （情報が必要）
- **Cloudflareドキュメント**: https://developers.cloudflare.com/workers/
