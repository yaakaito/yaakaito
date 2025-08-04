# 日本語Web組版：推奨CSS設定

日本語Webサイトにおける美しく読みやすい文字組みを実現するためのCSS設定ガイドです。見出しと本文それぞれに最適化された設定と、デザインツールからの正確な実装を可能にする最新技術を説明します。

## 推奨CSS設定

```css
/* ========================================
   見出し設定
======================================== */
h1, h2, h3, h4, h5, h6 {
    /* 行長のバランス調整（全ブラウザ対応） */
    text-wrap: balance;

    /* 厳格な禁則処理 */
    line-break: strict;

    /* 見出し用の適切な行間 */
    line-height: 1.3;

    /* 文字間隔の微調整 */
    letter-spacing: 0.02em;
}

/* Chrome系ブラウザでの文節境界改行 */
@supports (word-break: auto-phrase) {
    h1, h2, h3, h4, h5, h6 {
        word-break: auto-phrase;
    }
}

/* ========================================
   基本設定（全体に適用）
======================================== */
body,
html {
    /* フォントファミリー（日本語最適化） */
    font-family: "Helvetica Neue", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", Meiryo, sans-serif;

    /* カーニング設定 */
    font-kerning: normal;

    /* フォントスムージング（WebKit系） */
    -webkit-font-smoothing: antialiased;

    /* フォントスムージング（Firefox macOS） */
    -moz-osx-font-smoothing: grayscale;
}

/* ========================================
   本文設定
======================================== */
.article-content p,
.article-content li,
.main-text,
article p,
main p {
    /* 厳格な禁則処理 */
    line-break: strict;

    /* オーバーフロー対策（現代的・推奨） */
    overflow-wrap: anywhere;

    /* オーバーフロー対策（レガシー対応） */
    word-wrap: break-word;

    /* 本文用の適切な行間 */
    line-height: 1.6;

    /* 段落間のマージンを行高単位で設定 */
    margin-block: 1lh;

    /* 読みやすさのための文字間隔 */
    letter-spacing: 0.05em;
}

/* 品質重視コンテンツ（重要な記事など） */
.premium-content p,
.important-article p {
    text-wrap: pretty;
    line-break: strict;
    overflow-wrap: anywhere;
    word-wrap: break-word;
    line-height: 1.6;
    letter-spacing: 0.05em;
    margin-block: 1lh;
}

/* ========================================
   特殊用途
======================================== */
/* 専門用語や固有名詞（<wbr>タグと併用） */
.technical-term {
    word-break: keep-all;
}

/* 技術文書の見出し（手動制御） */
.technical-heading {
    text-wrap: balance;
    word-break: keep-all;
    line-break: strict;
    overflow-wrap: break-word;
}

/* コードブロック（カーニング無効化） */
code,
pre,
.code-block {
    font-kerning: none;
    font-family: "Fira Code", "Consolas", "Monaco", "Menlo", monospace;
    letter-spacing: normal;
}
```

## 各設定の採用理由

### 基本設定（全体適用）

**`font-family`の日本語最適化フォントスタック**：
- **Helvetica Neue**：欧文部分の美しい表示（macOS/iOS）
- **Hiragino Kaku Gothic ProN**：macOS標準の高品質日本語フォント
- **Hiragino Sans**：新しいmacOS/iOSでの標準フォント
- **Noto Sans JP**：Googleの日本語Webフォント、クロスプラットフォーム対応
- **Meiryo**：Windows環境での日本語表示
- **sans-serif**：最終フォールバック

**`font-kerning: normal`**：
- 文字間のカーニング調整を有効化
- 欧文と日本語の混在テキストで文字間隔を最適化
- より自然で読みやすい文字配置を実現

**`-webkit-font-smoothing: antialiased`**：
- WebKit系ブラウザ（Chrome、Safari）でのフォント描画を滑らかに
- 特に高解像度ディスプレイでの文字の美しさが向上
- 日本語フォントの細い線もクリアに表示

**`-moz-osx-font-smoothing: grayscale`**：
- Firefox（macOS）でのフォント描画を最適化
- サブピクセルレンダリングを無効化し、よりシャープな表示
- 他ブラウザとの表示統一性を向上

### コードブロックでのカーニング無効化

**`font-kerning: none`（コード要素のみ）**：
- コードでは文字間隔の自動調整を無効化
- 等幅フォントの特性を保持し、文字配置を正確に
- プログラムコードの可読性と整列性を確保

**メリット**：
- コードの縦の配置が崩れない
- 文字と文字の間隔が均等で、デバッグしやすい
- IDEやエディタでの表示と一貫性を保持

### 本文設定の補強

**`word-wrap: break-word`（レガシー対応）**：
- 古いブラウザでのオーバーフロー対策
- `overflow-wrap: break-word`の前身プロパティ
- IE11などの古い環境での互換性を確保

### 見出しで高品質設定を採用する理由

**`text-wrap: balance`**：
- 見出しは通常6行以下で、balanceの制限内に収まる
- 行長を均等にすることで視覚的に美しく、読みやすい
- 全主要ブラウザでサポート済み（Chrome 114+、Safari 17.5+、Firefox 121+）

**`word-break: auto-phrase`（Chrome限定）**：
- 文節境界での自然な改行により、意味の切れ目で改行される
- 見出しは短いテキストなので、3倍の処理時間の影響が最小限
- ユーザーの視線を集める見出しでの品質向上効果が高い

### 本文でシンプル設定を採用する理由

**基本設定を優先する理由**：
- 大量のテキストでのパフォーマンスを優先
- 日本語の標準的な改行動作で十分自然
- 全ブラウザで一貫した表示を保証
- 複雑な技術の組み合わせによる予期しない問題を回避

**`text-wrap: pretty`を限定使用する理由**：
- 段落全体を評価して最適な改行を計算するため、組版品質が向上
- オーファン（単独で残る単語）を防ぎ、読みやすさが改善される
- ただし処理が重いため、重要なコンテンツにのみ限定使用

## 避けるべき設定と理由

### ❌ 本文での`word-break: auto-phrase`

```css
/* 避けるべき設定 */
.article-content p {
    word-break: auto-phrase; /* 推奨しない */
}
```

**避ける理由**：
- **パフォーマンス問題**：処理時間が通常の3倍に増加
- **効果の不明瞭性**：長文での改善効果が確認されていない
- **ブラウザサポート**：Chrome系のみで一貫性がない

### ❌ 見出しでの`text-wrap: pretty`

```css
/* 避けるべき設定 */
h1, h2, h3 {
    text-wrap: pretty; /* 推奨しない */
}
```

**避ける理由**：
- **用途の不適切性**：prettyは長文向けの最適化技術
- **balanceで十分**：見出しは行数が少なく、balanceが最適
- **処理の無駄**：短文での複雑な計算は不必要

### ❌ 技術の競合使用

```css
/* 絶対に避ける：競合する技術の併用 */
.problematic-element {
    word-break: auto-phrase;
    /* 同時にHTMLで<wbr>タグも使用 */ /* 競合！ */
}
```

**問題点**：
- 機械学習による改行判定と手動指定が競合
- 予期しない改行位置になる可能性
- ブラウザが混乱し、意図しない表示になる

## 使用例

### 基本的な適用

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>日本語Webサイト</title>
    <!-- 上記CSSを適用 -->
</head>
<body>
    <article class="article-content">
        <h1>記事のタイトル</h1>
        <p>本文の段落...</p>
    </article>
</body>
</html>
```

### 専門用語を含む場合

```html
<h2 class="technical-heading">
    機械学習<wbr>アルゴリズムの<wbr>実装手法
</h2>

<p>本文中の<span class="technical-term">人工<wbr>知能</span>について説明します。</p>
```

### 重要コンテンツの場合

```html
<article class="premium-content">
    <h1>重要な記事タイトル</h1>
    <p>高品質な組版が適用される本文...</p>
</article>
```

## デザイン精度向上のための補正技術

### text-box-trimによるハーフ・レディング補正

デザインツールからの実装時やボタンの中央配置で発生するハーフ・レディング分のズレを解決：

```css
.button {
    text-box: trim-both cap alphabetic;
    padding: 10px;  /* 真の等間隔 */
}

.headline {
    text-box: trim-both cap alphabetic;
    margin-block: 32px;  /* デザインカンプの値をそのまま */
}
```

### 主な用途

- **ボタン・タグの中央配置**: `padding: 10px`で上下左右が真に等間隔
- **画像とテキストの整列**: ハーフ・レディングを除去して完璧な整列
- **デザインカンプ実装**: Adobe製ツールからの正確な再現
- **多言語対応**: 英語は`text-box: trim-both ex alphabetic`

### メリット

- **シンプル**: 複雑な計算が不要
- **正確**: フォントメトリクス直接参照
- **デザイナー連携**: Figmaの「vertical trim」と同等



## まとめ

この設定により、品質とパフォーマンスの最適なバランスを実現し、現代的で美しい日本語Web組版を構築できます。見出しには高品質な組版技術を適用し、本文にはシンプルで確実な設定を使用することで、全体的なユーザー体験を向上させます。

さらに、`text-box-trim`による最新のハーフ・レディング補正技術を活用することで、デザインツールからの正確な実装と、視覚的に完璧な配置を実現できます。段階的エンハンスメントアプローチにより、現在のブラウザ環境から将来の標準仕様まで対応した、実用的で先進的な日本語Web組版が可能になります。
