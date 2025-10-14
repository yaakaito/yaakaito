---
layout: ../../../layouts/blog-post.astro
title: 仕様駆動開発風のオレオレ実装計画を作って AI と並走する
emoji: 🐧
date: 2025-10-14
eyecatch: blog-my-spec-driven-dev-plan
tags:
  - AI
---

Kiro を皮切りに「仕様駆動開発」が話題になり、最近では Spec Kit のようなフレームワークも登場し、今後何が主流になるか読めない状況だ。
自分はツールを変えつつも、Markdown でタスクリストを作って開発するような手法を続けてきていて、現時点でのやり方を振り返りも兼ねて一度まとめておこうと思った。

## モチベーション

この方法でやっている理由としては「Cline を主に使っていた頃からこういう手法でやっていたから」というのがほとんどすべてなのだが、細かいところで言うと、

- 少なくとも Kiro に関しては UI ありきなのが微妙に感じた
- 最悪コピペで使える規模の小さいプロンプトで完結するようにしたい
- 要件の入力に汎用性がほしかった(例えば ADR をソースにしたり、都度の会話で行ったり)
- 自分が直近で扱っていたタスクに関しては、Kiro や Spec Kit のようなフレームワークが提唱するフローは大げさに感じた
- 仕様駆動開発の各種 md を Git 管理するべきなのかがわかっていなくて、しないのであればフォーマットは自由でよいのではと思った
    - これに関しては、自分は「Git 管理したくない」と思っていて、今回もしていない

あたりがある。とはいえ影響を受けていないかというとそうでもなく、タスクリストの作り方に大きく変化があったので、仕様駆動開発風とした、あくまで風である。

また、今のバージョンは以下の影響を大きく受けている:

- https://tech.dentsusoken.com/entry/2025/08/27/%E5%AE%9F%E7%94%A8%E5%93%81%E3%82%92%E4%BD%9C%E3%81%A3%E3%81%A6%E6%8E%A2%E3%82%8B%E7%94%9F%E6%88%90AI%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%9F%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E9%96%8B
- https://speakerdeck.com/twada/agentic-software-engineering-findy-2025-07-edition?slide=24

## Prompts

3 つのプロンプトを Claude Code の Custom Slash Command として使用している。
量が多いものではなく、Claude Code 特有の何かを使うわけでもないので、他のツールでも同様の機能を使ったりコピペで利用できると思う。
1 つ目と 3 つ目はあまり重要ではないので、なくとも良い。

### `/dev-plan:new`

````md
あなたはプロのソフトウェアエンジニアです。
これからユーザーが提供するコンテキストをもとにユーザーと議論を行い、コードベースを詳しく分析し、ソフトウェアを設計し、実装計画を立てます。
ユーザーから `/dev-plan:create-md` で作成指示があるまではコードやドキュメントは作成せず、背景、決定、要点、計画をまとめることに徹してください。
````

開始時に使うプロンプトで、色々書いているが「まだコードを書かないで」ということが伝われば割となんでもよい。
Claude Code の Plan mode だと、何かを相談 → 計画を承認 → コードを書くという流れになってしまい、事前に大きめの決め事をしたい用途とは噛み合わないように思う。

### `/dev-plan:create-md`

````md
これまでのコンテキストから実装に必要なタスクリストをコードベースを分析して作成してください。
実装タスクは、このリポジトリ内の実装のみにフォーカスします。

いくつかフェーズに分割し、それぞれが独立し完結したフェーズになるようにしてください。
それぞれのフェーズで実装すべきものや達成すべきゴールを具体的なコードなどを交えて詳しく明記してください。

タスクリストは次のルールに沿って作成します:

- 詳細な行番号は記載せず、ファイル名とシンボルのみで、簡潔に記載
- タスクは twada 氏の TDD の原則に沿って作成
    - RED/GREEN/REFACTOR の prefix はつけない
- テストは 1 ケースづつ実装する、一度に複数のテストを追加することは禁止
- タスクはネストしない

フォーマットは以下です:

```md
# ${title}

## Overview

## Phase N: ${title}

このフェーズで実装すべきものや達成すべきゴールを詳しく明記します。
特にコンテキストから読み取れる設定や数値については具体的に記載します。
実装方針やコード例、技術スタックについても記載します。

### Requirements

EARS記法で次のように要件定義します:

- THE SYSTEM SHALL <応答>.
- WHEN <条件>, THE SYSTEM SHALL <応答>.

### Targets

- ${filename} - ${note}

### Tasks

- [ ] task1
- [ ] task2

### References

- ${filename} - ${note}

## Tech Stack

使用する技術スタックについてまとめます。

## Note

実装にあたって注意するべきことがあれば記載します。
```

ファイルは .dev-plans 以下へ .md 形式で保存してください。
````

Claude Code と話し合って大体の方針が決まったあとに、計画を Markdown として保存するために使う、今回の話の中心となるもの。
ファイルのフォーマットを指定しつつ、適当な実装単位で以下のものをまとめてもらっている:

- 各フェーズの概要
- このフェーズで実装するべき要件定義
- 変更対象となるファイル
- TDD に沿った具体的なタスク
- 参考情報

Requirements と Tasks セクションが特に重要で、計画をレビューする際はこの 2 つを見ることで想定していないものを作ろうとしていないかを確認している。
実際どのようなものになるかは後述する。

### `/dev-plan:next`

````md
現在のコンテキストにある .dev-plans 以下の実行計画を参照しながら、実装を行います。
新しい作業を始める前に、前回のタスクがあれば Markdown でチェックリストが完了になっていることを確認してください。

```markdown
- [x] 完了済みタスク
- [ ] 未完了タスク
```

確認したら、未完了の次の $ARGUMENTS を**ひとつだけ**進めてください。完了したら、Markdown のチェックリストを更新してください。
````

`task` か `phase` を引数にとって、それを一つ進める。一つだけじゃ止まらないこともある、可愛いね。
もっと細かくコントロールしたい場合などもあるのでなくともよいし、実際使わないこともある。

## 実際のワークフローの例

個人用に作っている RSS リーダーのクライアント的なものを題材に、「日付ごとに既読にする」機能の追加を作りたいとする。
Claude Code を起動したら、 `/dev-plan:new` で実装計画の作成を開始する。

````
> /dev-plan:new is running…

● プロのソフトウェアエンジニアとしてお手伝いします。これからユーザーが提供するコンテキストをもとに、コードベースの分析と設計の議
  論を進めていきます。

  実装計画を立てるために必要な情報を教えてください。以下のような情報があると助かります：

  - 実現したい機能や解決したい課題
  - 背景や動機
  - 現在の問題点
  - 想定しているアプローチやアイデア

  コードベースの分析が必要な場合は、対象となるパッケージやファイルの情報も教えてください。

  /dev-plan:create-md の指示があるまでは、コードやドキュメントは作成せず、設計と計画の議論に集中します。
````

コードを書かないモードになったら具体的な要件を伝えて、望む要件になるように会話する。
別途 ADR のようなものがあったりする場合もここで渡して確認してもらう、なるべくここの汎用性が高くなるようにしたいという意図があってこうなっている。

````
> @packages/reader に日付ごとに関連する記事を既読にする機能を追加します。\
\
- 各日付セクションの最後に「既読にする」というテキストでボタンを追加する\
- 「既読にする」ボタンを押すと、セクションの内容が既読になり消える\
    - 個別記事をクリックして既読にした場合のコントラスト変更とは異なり、表示しないようにする\
- セクションに記事が一つもないときは「既読にする」ボタンも表示しない

● 了解しました。@packages/reader に日付ごとの記事を一括既読にする機能を追加する計画を立てていきます。

  まず、現在のコードベースの構造を分析させてください。フロントエンドの実装を確認します。

  ......

● 完璧です。コードベースの分析が完了しました。以下、実装計画をまとめます。

  ---
  背景と要件

  実現したい機能

  日付セクションごとに記事を一括既読にする機能を追加します。

  具体的な要件

  1. 各日付セクションの最後に「既読にする」ボタンを配置
  2. ボタンをクリックすると、そのセクションの全記事が既読になり非表示になる
  3. セクションに表示される記事が0件の場合はボタンも表示しない
  4. 個別記事の既読ボタン（コントラスト変更）とは異なり、完全に非表示にする

  ---
  現在の実装の分析

  データ構造

  - 日付でグループ化: GroupedArticlesByDate 型で日付キー（例: "20251013"）ごとに記事を管理
  - 各日付内で2つに分類:
    - withSummary: 要約あり記事をさらにauthor別にグルーピング
    - withoutSummary: 要約なし記事

  ......

  ---
  この計画で問題なければ、/dev-plan:create-md で詳細な実装ドキュメントを作成します。
  質問や修正したい点があれば教えてください。
````

長いので出力は大きく省略している。ここまでで不透明な部分なんかがあれば質問したりしてくれるはず。
今回は通しで実装させるかつテスト周りがわかりやすくなるよう、適当な理由をつけて本来不要な API を新規実装する。

````
> 機能単位での削除を容易にするため、API は新たに専用のものを作成してください

● 了解しました。専用のAPIエンドポイントを作成するように計画を修正します。

  ---
  設計決定の変更

  新規APIエンドポイント

  決定: /api/articles/read/by-date を新規作成

  エンドポイント仕様

  POST /api/articles/read/by-date
  Content-Type: application/json

  リクエストボディ: string[] (記事IDの配列)

  レスポンス:
  {
    "ids": string[],
    "read": true,
    "feature": "by-date"  // 識別用
  }

  既存の bulk API との違い

  - エンドポイントが分離: 機能ごとに独立したエンドポイント
  - 削除が容易: この機能を削除する際は、このエンドポイントと関連コードのみ削除すればよい
  - 実装は類似: 内部的には同じロジック（記事IDリストを受け取って既読にする）

  ---
  更新された実装計画

  1. バックエンド（backend/index.ts）

  新規エンドポイント追加 (138行目付近、既存のbulk APIの後に追加)

  .post('/api/articles/read/by-date', zValidator('json', z.string().array()), async (c) => {
      // 具体的な実装例
  })

  2. フロントエンド（use-backend.ts）

  新関数追加 (markAsReadAll の後に追加)

  const markAsReadByDate = async (dateKey: string) => {
      // 具体的な実装例
  };

  3. UI実装（app.tsx）

  変更なし（前述の計画通り）

  4. スタイル（app.module.css）

  変更なし（前述の計画通り）

  ---
  機能削除時の手順

  将来この機能を削除する場合：

  1. バックエンド: /api/articles/read/by-date エンドポイントを削除
  2. フロントエンド:
    - use-backend.ts から markAsReadByDate 関数を削除
    - app.tsx から日付セクションのボタンUIを削除
    - app.module.css から .dateMarkAsReadButton を削除

  既存の markAsReadAll や個別既読機能には一切影響しません。

  ---
  この修正で問題なければ、/dev-plan:create-md で実装ドキュメントを作成します。
````

ここまででやりとりが微妙になってきたな、と思ったら全部ばっさり捨てていて、会話で得た知識で最初のプロンプトを調整している。
今回貼り付けているものは 2 回目の結果で、 1 回目はボタンをどこに置くか延々と聞いてくる装置になってしまったので捨てている。

内容に問題がなくなったら `/dev-plan:create-md` で実装計画を Markdown として保存する。

````
> /dev-plan:create-md is running…

● 実装計画をドキュメントとして作成します。まず、コードベースをさらに分析して、テストファイルの構造や既存のテストパターンを確認し
  ます。

  ......

● 完璧です。テストの構造も理解できました。それでは実装計画ドキュメントを作成します。
````

結果としてできた Markdown が以下、Tech Stack や Note 以下はこの解説ではあまり重要ではないので省略している。

````md
# 日付ごとの一括既読機能の実装

## Overview

`reader` パッケージに、日付セクションごとに記事を一括で既読にする機能を追加します。この機能により、ユーザーは特定の日付の記事をまとめて既読にして非表示にできます。

**主な機能要件:**
- 各日付セクションの最後に「既読にする」ボタンを表示
- ボタンをクリックすると、その日付の全記事が既読になり非表示になる
- セクションに表示される記事が0件の場合はボタンも表示しない
- 機能の削除を容易にするため、専用のAPIエンドポイントを作成

**技術スタック:**
- バックエンド: Hono + Cloudflare Workers + D1 Database
- フロントエンド: React + TypeScript
- テスト: Bun test framework + Hono testClient

## Phase 1: バックエンドAPI実装（TDD）

このフェーズでは、日付ごとの一括既読APIエンドポイント `/api/articles/read/by-date` を実装します。既存の `/api/articles/read/bulk` と同様の動作をしますが、機能として独立させることで将来の削除や変更を容易にします。

### Requirements

- THE SYSTEM SHALL 記事IDの配列を受け取り、該当する全記事を既読にする。
- WHEN 記事IDの配列がPOSTされた場合、THE SYSTEM SHALL D1データベースのReadArticleテーブルに記録する。
- WHEN 一部の記事IDが存在しない場合、THE SYSTEM SHALL 存在する記事のみを既読にして201を返す。
- WHEN 全ての記事IDが存在しない場合、THE SYSTEM SHALL 404エラーを返す。
- WHEN 空配列がPOSTされた場合、THE SYSTEM SHALL 404エラーを返す。
- WHEN 無効なデータ型が送信された場合、THE SYSTEM SHALL 400バリデーションエラーを返す。
- WHEN 既読登録が成功した場合、THE SYSTEM SHALL `{ ids: string[], read: true, feature: "by-date" }` の形式でレスポンスを返す。

### Targets

- src/backend/index.ts - 新規エンドポイント `/api/articles/read/by-date` の追加
- src/backend/index.test.ts - 新規エンドポイントのテスト追加

### Tasks

- [ ] POST /api/articles/read/by-date が空のDBで空配列を送信すると404を返すテストを追加
- [ ] POST /api/articles/read/by-date エンドポイントを実装（空配列で404を返す最小実装）
- [ ] POST /api/articles/read/by-date が複数記事を一括既読できるテストを追加
- [ ] 記事IDからArticleを検索し、ReadArticleテーブルに登録する処理を実装
- [ ] POST /api/articles/read/by-date が成功時に正しいレスポンス構造を返すテストを追加
- [ ] レスポンスに `feature: "by-date"` フィールドを含める実装を追加
- [ ] POST /api/articles/read/by-date が部分的に存在しない記事があっても成功するテストを追加
- [ ] 存在する記事のみを処理する実装を確認（既存コードで対応済み）
- [ ] POST /api/articles/read/by-date が全て存在しない記事で404を返すテストを追加
- [ ] 全記事が存在しない場合の404レスポンス処理を確認
- [ ] POST /api/articles/read/by-date が無効なデータ型でバリデーションエラーを返すテストを追加
- [ ] zodバリデーションの追加（`z.string().array()` を使用）
- [ ] POST /api/articles/read/by-date で一括既読後にGET /api/articlesで全てisRead: trueになるテストを追加
- [ ] エンドツーエンドの動作確認（既存のReadArticleテーブルとの連携）

### References

- src/backend/index.ts:138-173 - 既存の `/api/articles/read/bulk` エンドポイント（実装パターンの参考）
- src/backend/index.test.ts:236-321 - 既存の一括既読機能のテスト（テストパターンの参考）
- src/backend/test/fixtures/test-data.ts - テストデータのセットアップ
- src/backend/test/mocks/d1.ts - D1データベースのモック実装

## Phase 2: フロントエンド状態管理実装

このフェーズでは、`use-backend.ts` に日付ごとの一括既読処理を行う `markAsReadByDate` 関数を追加します。この関数は、指定された日付キーに対応する全記事を既読にし、楽観的更新とエラーハンドリングを提供します。

### Requirements

- THE SYSTEM SHALL 日付キー（例: "20251013"）を受け取り、その日付の全記事を既読にする。
- WHEN 日付キーが存在しない場合、THE SYSTEM SHALL 処理を中断する。
- WHEN 記事が0件の場合、THE SYSTEM SHALL 処理を中断する。
- THE SYSTEM SHALL 楽観的更新により即座にUIを更新する。
- WHEN API呼び出しが失敗した場合、THE SYSTEM SHALL 状態をロールバックする。
- THE SYSTEM SHALL pending既読状態もクリアする。
- THE SYSTEM SHALL 新規APIエンドポイント `/api/articles/read/by-date` を呼び出す。

### Targets

- src/frontend/component/use-backend.ts - `markAsReadByDate` 関数の追加

### Tasks

- [ ] `markAsReadByDate` 関数のスケルトンを追加
- [ ] 日付キーから `groupedArticles[dateKey]` を取得する処理を実装
- [ ] `withSummary` の全author配下の記事IDを収集する処理を実装
- [ ] `withoutSummary` の記事IDを収集する処理を実装
- [ ] 記事IDが0件の場合に早期リターンする処理を追加
- [ ] 楽観的更新により `readOnThisSession` を更新する処理を実装
- [ ] `pendingReadOnThisSession` から該当記事を削除する処理を実装
- [ ] `/api/articles/read/by-date` APIを呼び出す処理を実装
- [ ] API失敗時の状態ロールバック処理を実装
- [ ] エラーログ出力処理を追加
- [ ] `useBackend` の戻り値に `markAsReadByDate` を追加

### References

- src/frontend/component/use-backend.ts:146-171 - 既存の `markAsReadAll` 関数（実装パターンの参考）
- src/frontend/component/use-backend.ts:21-69 - `groupedAndSorted` 関数（データ構造の参考）
- src/frontend/component/use-backend.ts:98-115 - `markAsRead` 関数（エラーハンドリングの参考）

## Phase 3: UI実装とスタイリング

このフェーズでは、各日付セクションに「既読にする」ボタンを追加し、適切なスタイルを適用します。表示される記事が0件のセクションではボタンを表示しないようにします。

### Requirements

- THE SYSTEM SHALL 各日付セクションの最後に「既読にする」ボタンを表示する。
- WHEN セクション内のフィルタ後の記事が0件の場合、THE SYSTEM SHALL ボタンを表示しない。
- WHEN ボタンがクリックされた場合、THE SYSTEM SHALL `markAsReadByDate` 関数を呼び出す。
- THE SYSTEM SHALL 既存の `.toggleButton` と統一感のあるスタイルを適用する。
- THE SYSTEM SHALL ボタンに適切なマージンを設定し、視覚的に分かりやすく配置する。

### Targets

- src/frontend/component/app.tsx - 日付セクションへのボタン追加
- src/frontend/component/app.module.css - ボタンスタイルの追加

### Tasks

- [ ] 日付セクション内のフィルタ後記事数をカウントする処理を追加
- [ ] `withSummary` の全author配下のフィルタ済み記事数を計算
- [ ] `withoutSummary` のフィルタ済み記事数を計算
- [ ] 記事数が0より大きい場合のみボタンを表示する条件分岐を追加
- [ ] 「既読にする」ボタンの要素を追加（`button` タグ）
- [ ] ボタンのクリックハンドラに `markAsReadByDate(key)` を設定
- [ ] app.module.css に `.dateMarkAsReadButton` クラスを追加
- [ ] ボタンの基本スタイル（色、パディング、ボーダー）を設定
- [ ] ボタンのホバースタイルを追加
- [ ] ボタンの配置用マージンを設定（日付セクション内で適切に配置）

### References

- src/frontend/component/app.tsx:59-94 - 既存の日付セクションレンダリング
- src/frontend/component/app.tsx:96-103 - 既存のコントロールボタン
- src/frontend/component/app.module.css:58-77 - 既存の `.toggleButton` スタイル
- src/frontend/component/app.tsx:43-55 - `filterArticle` 関数

## Phase 4: 統合テストと動作確認

このフェーズでは、実装した機能が正しく動作することを確認します。特に、日付セクションごとの既読処理が適切に動作し、UIが期待通りに更新されることを検証します。

### Requirements

- THE SYSTEM SHALL 開発環境で全ての機能が正常に動作する。
- THE SYSTEM SHALL 日付セクションのボタンをクリックすると、そのセクションの記事が非表示になる。
- THE SYSTEM SHALL ボタンクリック後、セクション自体も非表示になる（記事が0件になるため）。
- THE SYSTEM SHALL 他の日付セクションに影響を与えない。
- THE SYSTEM SHALL エラーケースで適切にロールバックする。

### Targets

- 全実装コード
- 開発環境でのブラウザ動作確認

### Tasks

- [ ] バックエンドのユニットテストを全て実行（`bun test src/backend/index.test.ts`）
- [ ] テストが全てパスすることを確認
- [ ] ビルドが成功することを確認（`bun run build`）
- [ ] 開発サーバーを起動（`bun run dev`）
- [ ] ブラウザで複数日付の記事が表示されることを確認
- [ ] 最新日付の「既読にする」ボタンが表示されることを確認
- [ ] ボタンをクリックして、その日付の記事が非表示になることを確認
- [ ] 他の日付セクションが影響を受けないことを確認
- [ ] ページをリロードして、既読状態が永続化されていることを確認
- [ ] Chrome拡張機能をビルド（`bun run build-extension`）
- [ ] Chrome拡張機能で同様の動作確認
- [ ] biomeによるコード品質チェック（`bunx @biomejs/biome check --apply ./`）

### References

- CLAUDE.md:13-38 - ビルド・開発コマンドの一覧
- packages/reader/README.md - Reader パッケージのドキュメント（もし存在する場合）

## Tech Stack

......

## Note

### 実装上の注意点

......

````

Markdown ができたら、この内容を詳しくレビューする。特に Requirements と Tasks セクションを重点的に見て、想定したものになっているかを確認する。
例えば以下のようなものがあれば調整する:

- 仕様の不足 / 不要な仕様が混じっている → 仕様、要件の軌道修正
- タスクの粒度が大きすぎる → 1 タスクを自身がレビューしやすいと思われるサイズに調整
- テストが足りていない → 書いてほしいテストを指示し追加
- 実装の順番が不適切 → タスクの順番を入れ替えを指示、大きく変えるときは直接編集して読み込み直す

````
> - WHEN 既読登録が成功した場合、THE SYSTEM SHALL `{ ids: string[], read: true, feature: "by-date" }` の形式でレスポンスを返す。\
\
read: true と feature フィールドは不要です

● 承知しました。レスポンス形式を { ids: string[] } のみに修正します。

● Update(.dev-plans/mark-as-read-by-date.md)
  ⎿  Updated .dev-plans/mark-as-read-by-date.md with 1 addition and 1 removal
       27    - WHEN 全ての記事IDが存在しない場合、THE SYSTEM SHALL 404エラーを返す。
       28    - WHEN 空配列がPOSTされた場合、THE SYSTEM SHALL 404エラーを返す。
       29    - WHEN 無効なデータ型が送信された場合、THE SYSTEM SHALL 400バリデーションエラーを返す。
       30 -  - WHEN 既読登録が成功した場合、THE SYSTEM SHALL `{ ids: string[], read: true, feature: "by-date" }` の形式でレスポンスを返す。
       30 +  - WHEN 既読登録が成功した場合、THE SYSTEM SHALL `{ ids: string[] }` の形式でレスポンスを返す。
       31
       32    ### Targets
       33

● Update(.dev-plans/mark-as-read-by-date.md)
  ⎿  Updated .dev-plans/mark-as-read-by-date.md with 1 removal
       41    - [ ] POST /api/articles/read/by-date が複数記事を一括既読できるテストを追加
       42    - [ ] 記事IDからArticleを検索し、ReadArticleテーブルに登録する処理を実装
       43    - [ ] POST /api/articles/read/by-date が成功時に正しいレスポンス構造を返すテストを追加
       44 -  - [ ] レスポンスに `feature: "by-date"` フィールドを含める実装を追加
       44    - [ ] POST /api/articles/read/by-date が部分的に存在しない記事があっても成功するテストを追加
       45    - [ ] 存在する記事のみを処理する実装を確認（既存コードで対応済み）
       46    - [ ] POST /api/articles/read/by-date が全て存在しない記事で404を返すテストを追加

● 修正完了しました。以下の変更を行いました：

  1. Requirementsセクション（30行目）: レスポンス形式を { ids: string[] } のみに変更
  2. Tasksセクション（46行目）: feature: "by-date" フィールド追加タスクを削除

  これで、APIレスポンスは既存の /api/articles/read/bulk と同じシンプルな形式になります。実装がよりシンプルになりますね。
````

調整が終わったら、一度 Claude Code を終了して、実装計画だけを読み込み直している。Git 管理していない場合は補完が効かず少しめんどくさい。
読み込んだあとは `/dev-plan:next phase` や都度の指示で、計画が完了するまで順番に消化していく。

````
> Read @.dev-plans/mark-as-read-by-date.md

● ファイルを確認しました。これは日付ごとの一括既読機能の実装計画書ですね。内容を要約します：

  📋 実装計画の概要

  ......

  ---
  次のステップ: Phase 1から順番に実装を進めますか？それとも特定のフェーズについて詳しく確認したいことがありますか？

> /dev-plan:next phase
````

基本的には Manual Accept で進め、特にテストコードは都度細かく確認するように意識している。
自分しか使わない UI の構築タスクなんかは Auto Accept で進めることもあるが、そもそもこの手法を採用するのは、自分の頭にあるコードを高速に書くツールとして AI を利用したいようなケースなので、 Auto Accept すること自体にあまり意味がないと考えている。

## 雑感

- ある程度規模のあるタスクを一元管理できるようになり、出力も安定しているように思うので、比較的安心してコードを生成できている肌感はある
- 一方で現状タスクやフェーズのゴールの定義が曖昧だなと感じていて、直近で Codex のイベントで紹介されていた方法は参考なりそうだが、まだ見れていない: https://www.youtube.com/watch?v=Gr41tYOzE20
- この手法で時間という意味での生産性があがるのかと言われると微妙で、結局計画をレビューするのに時間とスタミナを使ってしまう、最後の 10% (＝実際のコード生成) だけを見れば速いと思う
    - 慣れの問題だったり、記述するべきコードの量が多い場合は時間が短縮できるようには思う
- 結局実装計画のようなものを Git 管理に乗せるべきなのかはよくわからない
- 基本的にはこの形になっていたからか、少なくとも手元では Claude Code の性能の劣化、みたいなのをあまり感じなかった
- ファイルを Git 管理しない場合に Claude Code では補完が効かないのが不便
    - この辺は Issue になっている: https://github.com/anthropics/claude-code/issues/5105
    - .git 以下に置くのもためしたが、こちらは補完は効くが相談中に Auto Accept で複数行修正したいようなケースでそれが効かなくて不便、特別な権限が設定されている？
- この手法を続けるかは現時点ではわからないが、Spec Kit はしばらく使ってみたいと思っている
