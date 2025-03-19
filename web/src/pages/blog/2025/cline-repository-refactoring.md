---
layout: ../../../layouts/blog-post.astro
title: Cline でリポジトリ構造の変更とアーキテクチャのルール整備をした
emoji: 🪼
date: 2025-03-19
eyecatch: blog-cline-repository-refactoring
tags:
  - AI
  - 開発
---

個人的に作っているアプリで Feature Sliced Design (FSD) というアーキテクチャを途中から採用していて、導入以前に書かれたコードはそれに沿っていないという状態のリポジトリがあり、今回これを Cline を使ってこの移行を完了させようと思った。自分はこういう考えるところまではいいけど実際やるのはだるいな、みたいな作業こそ AI にやってもらいたいなと思っていたので題材としてちょうどいい感じだった。

- https://github.com/feature-sliced
- https://zenn.dev/moneyforward/articles/e1ed48c3974811

どんなアプリかというと Chrome のサイドパネルとタブで動く GitHub の Issue/PR/Discussion リーダーで、分かる方は Jasper の Chrome 拡張版とイメージしてもらえるといいと思う。完全に自分用に作っているのでコードの公開とかは出来ないので、うまいこと察してほしい。アプリがわからなくとも話自体は分かるようにしているつもり。

- https://jasperapp.io/

## 前提

- Tier 4 の 3.7 Sonnet
- このリポジトリでの AI Coding は Cursor で少しだけ
- TypeScript で、Biome を Linter/Formatter として使っている(いた)
- Cline だけでやりきる
- Memory Bank は個人のカスタマイズとして利用している

## やりたいと思っていたこと

このリポジトリを今後 AI と滞りなく開発できるよう状態にしたい。一旦 Cline だとして、そのためには次の要素が必要だと考えた:

- リポジトリの構造の完遂
- FSD に沿った ESLint のルール追加
- 既存コードへのテストの追加
- .clinerules の整備

現状は、 AI 向けのルールやガードレールが一切存在していないので、それも同時に整備することを目標にする。

## 現状と目指す状態

今はこんな感じに FSD に沿って書いたものと、それ以前に大きく lib と app(side-panel) に分けて書いていたものが混在している:
```
src/
├── entities/ # FSD 導入後に書いたもの
│   ├── github-search-result/
│   │   ├── model/
│   │   └── ui/
│   └── timeline-item/
│       ├── model/
│       └── ui/
│
├── features/ # FSD 導入後に書いたもの
│   └── timeline/
│       └── model/
│
├── lib/ # FSD 導入以前のコードは大体ここにある
│   ├── github/
│   │   ├── gql/
│   │   │   └── fragment/
│   │   └── __fixtures__/
│   └── stream.ts          # 主要ロジック
│
├── shared/ # FSD
├── side-panel/ # この下に FSD 以前のアプリが作られている
│   ├── components/
│   │   ├── side-panel-content.tsx
│   │   ├── side-panel-header.tsx
│   │   └── side-panel.tsx
│   ├── hooks/
│   │   └── use-side-panel.ts
│   ├── model/
│   │   ├── side-panel-model.ts
│   │   └── types.ts
│   ├── store/
│   │   └── side-panel-store.ts
│   └── ui/
│       └── side-panel-ui.tsx
├── timeline/ # エントリーポイント類は FSD を反映していない
└── worker/
```

これをこんな感じに整理したい:

```
src/
├── app/
│   └── entries/
│       ├── side-panel/
│       │   ├── index.html
│       │   └── index.tsx
│       └── timeline/
│           ├── index.html
│           └── index.tsx
│
├── entities/
│   ├── github-search-result/
│   │   ├── api/
│   │   │   └── gql/
│   │   ├── model/
│   │   │   ├── converters.ts
│   │   │   ├── io.ts
│   │   │   ├── timeline-item.ts
│   │   │   └── type.ts
│   │   └── ui/
│   │       ├── detail.tsx
│   │       ├── icons/
│   │       └── timeline-item.tsx
│   ├── stream/
│   │   └── model/
│   │       ├── keys.ts
│   │       ├── query-helper.ts
│   │       └── type.ts
│   └── timeline/
│       └── model/
│           ├── io.ts
│           └── type.ts
│
├── features/
│   ├── stream-notifications/
│   │   ├── api/
│   │   │   └── gql/
│   │   └── model/
│   │       ├── events.ts
│   │       ├── notifications.ts
│   │       └── stream-management.ts
│   └── timeline/
│       └── model/
│           ├── update-timeline.ts
│           └── use-timeline.ts
│
├── pages/
│   ├── side-panel/
│   │   ├── model/
│   │   │   └── use-notification-item.ts
│   │   └── ui/
│   │       └── page.tsx
│   └── timeline/
│       └── ui/
│           └── page.tsx
│
├── shared/
│   ├── config/
│   │   └── types.ts
│   └── lib/
│       ├── browser/
│       ├── event/
│       ├── storage/
│       └── time/
│
└── worker/
    └── index.ts
```

## 基本的な作業の方針

適当な作業の単位を 1 ループとして、そのループを次のような手順で進めた:

1. Plan で実装、改修の方針を相談して決める
2. その計画を Markdown として保存しておく
3. Act で Markdown を計画として実行する
    1. 必要な修正があれば適宜で修正をお願いする
    2. コンテキストが足りなくなったり挙動が怪しくなったら、 Markdown を使って新しい Task に引き継ぐ
4. 必要な修正が終わったら、その差分を Markdown に書き込ませてアップデート
5. update memory bank 、書き足すところがあれば .clinerules もアップデート
6. 適切なメッセージで git commit

特徴として、 Plan の内容を逐一 Markdown として残しておく、というものがある。
これはもっと小さい範囲で試してみて、あとにドキュメントとして残せるしよさそう、という感触があったのでこれを採用してみることにした。
このファイルの作成ルールは `.clinerules` に書いている:

```markdown
## ドキュメント規約

- `docs/plans/` - 計画ドキュメント
  - ファイル名は `{3桁の通し番号}_{kebab-case-name}.md` の形式で保存
```

これがある状態で、「計画を docs/plans に保存してから作業を始めてください」というような指示で ACT モードに切り替えると、その計画を保存してから進めてくれる。
最終的には次の 17 個の計画で作業が終わった:

```
plans
├── 001_migrate-from-biome-to-eslint-prettier.md
├── 002_monorepo-removal-plan.md
├── 003_migrate-to-jest-and-react-testing-library.md
├── 004_feature-sliced-design-eslint-rules.md
├── 005_test-implementation-plan.md
├── 006_github-search-result-timeline-restructuring.md
├── 007_lib-to-fsd-refactoring.md
├── 008_timeline-to-fsd-refactoring.md
├── 009_side-panel-to-fsd-refactoring.md
├── 010_config-stream-type-refactoring.md
├── 011_update-stream-refactoring.md
├── 012_entities-to-features-reference-fix.md
├── 013_created-at-type-fix.md
├── 014_timeline-items-type-guard.md
├── 015_other-type-errors-fix.md
├── 016_side-panel-item-removal.md
└── 017_timeline-api-call-fix.md
```

後から思ったこととして、もっと細かく分けるべきだったのと、指定と時系列の把握が楽になるので連番を使いたいが、複数人の場合にはコンフリクトのリスクがある。
作業をしていく中で、元々の計画とのズレが生まれたら Markdown にその差分を追記してもらっていた:

```
今回の実装に、計画との差分があれば @mdfile に追記を行ってください。
```


他に意識したこととして、常に `.clinerules` を更新することを組み込んでいた。
これも作業が終わったあとに次のようなプロンプトで更新していた:

```
今回の作業内容で、 @.clinerules に記載すべきことがあれば追記してください。
```

これはある程度ワークしていたように思うが、これは絶対入れてほしいなというルールが生まれたときは、その旨を随時お願いしていた。

最後の git commit は、 `.clinerules` にフォーマットを書いて置くことで「commit して」というだけでいい感じにコミットメッセージを作ってくれるようにしていた:

````markdown
### コミットメッセージ規約
```
<type>(<scope>): <適切なメッセージ>

- <詳細な変更内容>
- <詳細な変更内容>
```
````

## 実際の作業で特筆すべきところ

大きめのポイントや詰まったところ、その解決を抜粋して書く。それぞれを細かく解説しているわけではない。

### ESLint のルール作成関連

#### 001_migrate-from-biome-to-eslint-prettier

Biome から ESLint と Prettier に移行した、理由としてはカスタムルールが作りやすそうだったから。
モジュール関連の地雷を多少踏みながらも滞りなく移行できて、さすがこういうのは得意という感じだった。

#### 004_feature-sliced-design-eslint-rules

その後、FSD に沿ったアーキテクチャになるよう ESLint のルールを Cline に作ってもらった。
FSD のドキュメントやそこから抜粋した内容を渡して少し長めの Prompt から始めた。

```
このリポジトリは Feature Sliced Design (FSD) の考え方を取り込んだ構造になっており、現在は既存のコードをそれに向けて移行している最中です。FSD については @https://feature-sliced.design/docs や @https://feature-sliced.design/docs/get-started/overview を参照してください。
移行作業を進める前に、 ESLint でコードの配置に関するルールを作成します。
次のルールを作成してください:

- Layers は上から下にしか参照できないルール
- Layers 配下には Slices が配置され、さらにその配下に Segments が配置され、適切なコードが置かれるルール

ただし、現在コードを移行中のため、ルールに該当しないディレクトリにあるコードはすべて無視してください。

## Layers は上から下にしか参照できないルール

コードは次のいずれかのレイヤーに配置されます:

- app* — everything that makes the app run — routing, entrypoints, global styles, providers.
- pages — full pages or large parts of a page in nested routing.
- features — reused implementations of entire product features, i.e. actions that bring business value to the user.
- entities — business entities that the project works with, like user or product.
- shared* — reusable functionality, especially when it's detached from the specifics of the project/business, though not necessarily.

これは FSD の考え方から widgets と processes を省略したものです。
レイヤー間の参照は上から下にしか行うことが出来ず、例えば pages から features のモジュールを import することは出来ますが、その逆は出来ません。同じレイヤーでの横の参照は許可されます。
このルールが守られていることを ESLint でチェックできるようにしてください。

## Layers 配下には Slices が配置され、さらにその配下に Segments が配置され、適切なコードが置かれるルール

FSD では pages, features, entities レイヤーの下に Slice が配置され、さらにその配下に Segment が配置されます。
コードは任意の場所に配置出来ないため、このルールを守ることを ESLint でチェックできるようにしてください。

公式から引用したルールは次のようになります:
Slices
Next up are slices, which partition the code by business domain. You're free to choose any names for them, and create as many as you wish. Slices make your codebase easier to navigate by keeping logically related modules close together.

Slices cannot use other slices on the same layer, and that helps with high cohesion and low coupling.

Segments
Slices, as well as layers App and Shared, consist of segments, and segments group your code by its purpose. Segment names are not constrained by the standard, but there are several conventional names for the most common purposes:

ui — everything related to UI display: UI components, date formatters, styles, etc.
api — backend interactions: request functions, data types, mappers, etc.
model — the data model: schemas, interfaces, stores, and business logic.
lib — library code that other modules on this slice need.
config — configuration files and feature flags.
Usually these segments are enough for most layers, you would only create your own segments in Shared or App, but this is not a rule.
```

Cline と相談して、最終的に 5 つのルールを作ることになった:

```
# Feature Sliced Design (FSD) に基づいたESLintルールの実装

Feature Sliced Design (FSD) アーキテクチャに基づいたESLintルールを実装しました。これにより、コードベースがFSDの原則に従っているかを自動的にチェックできるようになります。

## 実装したルール

###レイヤー間の参照ルール

- 上位レイヤーから下位レイヤーへの参照のみ許可
- app → pages → features → entities → shared の順で参照可能

### 同一レイヤー内のSlice間参照禁止

- 例：entities/userからentities/productへの参照は禁止

### レイヤー構造ルール

- appとsharedレイヤーは直接Segmentsを配置
- pages, features, entitiesレイヤーはSlices配下にSegmentsを配置

### Public API強制ルール

- Sliceの内部実装を直接参照せず、公開APIのみを通じて参照
- 例：import { Something } from '@src/entities/user'は許可
- 例：import { Something } from '@src/entities/user/model/something'は禁止

### バレルファイル内容検証ルール

- index.tsファイルはimportとexportのみを含むべき
- ロジックや実装詳細は含めない
```

注意点として、ESLint を作ろうとするときに広く使われている TIPS を取り込んだり、 ESLint のプラグインだと認識しているからかやたら汎用的なコードを書きたがる傾向があるように思う。
前者としては、 `@src` のようないわゆる `paths` をこのリポジトリでは採用していなかったが、それが採用されているかのようなコードを書いていた。

後者は、例えば設定を `eslint.config.js` で出来るようなコードを書こうとして、結果複雑になる上に動作しないような状態になっていた。
これは「設定ファイルで出来る必要はないし、シンプルにベタ書きで実装すればいいよ」というような指示をしてあげると、考えることが減るのかちゃんと動くコードが出てくる

そんなこんなで ESLint を実行するとルールが適用され、 Cline が自身の書いたコードの誤りを検出できるようになった:

```
/workspaces/chrome-github-plugin/src/entities/github-search-result/ui/detail.tsx
  1:1  error  Sliceの内部実装を直接参照せず、公開API(features/timeline)を通じて参照してください。各Sliceはindex.tsでのみ外部に公開されるべきです。               fsd/public-api
  1:1  error  レイヤー 'entities' から上位レイヤー 'features' への参照は禁止されています。レイヤーは上から下にのみ参照可能です。                                fsd/layer-imports
  2:1  error  同一レイヤー 'entities' 内の異なるスライス間の参照は禁止されています。スライス 'github-search-result' から 'timeline-item' への参照はできません。  fsd/slice-imports
```
### テストを作ってもらう

#### 003_migrate-to-jest-and-react-testing-library

テストが全く無かったわけではなく、動作確認程度に Node の組み込みランナーでテストは書いていたが、 AI が書いてくれるなら React もやるかということで Jest と React Testing Library へ移行してもらった。例によってモジュール関連でゴチャることがあるものの、概ね得意。

#### 005_test-implementation-plan

全部のコードのテストを書いてもらう計画を立てた。とはいえ、元々テストを書くことを考えて書いていないコードなので、コードを変更しないと書けないのであれば無視してよい、というルールにした:

```
src 以下のテストが書かれていないコードに対して単体テストを追加します。
また、node:test から Jest への移行が出来ていないテストがあれば、それを Jest へ移行してください。
元のコードを変更することはせず、テストのためにコードを変更することは避けてください。
テストを書くことが難しければ、無視して構いません。
```

が、実際には「細かく分けたらテストできそうなので分けました！」と分けてくることがありつらい。

テストの内容を書いてもしょうもないのでそれは割愛する。テストの生成自体は全体的にはわりとうまくいくが、計画の実行方法に問題があり、すべてのテストを書くのでそれなりの計画になっているのだが、「計画を実行してください」だと途中で勝手に満足して終わってしまうということがあった。「いくつかのファイルに対してテストを追加・移行することができました。」ではなく全部やってほしい:

```
# テスト追加・移行完了レポート
テスト追加・移行計画に基づいて作業を進め、いくつかのファイルに対してテストを追加・移行することができました。
```

ここでは解決策として「すべてのステップが終わるまで続けて」とどの程度やってほしいのかを明確に伝えることでワークしたのだが、あとで思ったこととしてもっとタスクを分割するべきだった、というのがある。これは辻褄合わせフェーズではこの形を取ることにした。

### コードの移動や分割

これ全般に言えることとして、テスト、Lint、型チェックを仮でもよいので全て通してからこの作業に入るべきだった、という反省がある。

過去の経験から、多少テストや Lint が落ちている状態でも、その Task に関係がないものはうまく無視出来ている事が多く、今回もそれがうまく働いて最後に辻褄を合わせればよいだろう、と考えていた。今回は コアドメインの移動 → それを使うアプリの移動、という順番で移行を進めていたので、コアドメインが移動することでアプリからの参照が切れて、ビルドが通らなかったり型チェッ クが落ちるのは想定内。だがそれを「今回とは関係ないエラー」と認識していることがかなり多く、これはなるべく修正しながら進んでほしかった。

結果としては最後の辻褄合わせで大した苦労はなく、移行としては成功しているのだが、途中でほとんどビルドが出来なかったりといったところでそれなりに不便があった。とはいえ最後にちゃんと合うなら全体としてみればよかったとも言えるので、少しむずかしいところだなと思う。まぁこのあたりは人間がやる場合でも変わらないのでは？と言われればそうなのだが。

#### 002_monorepo-removal-plan

このリポジトリは元々 Monorepo になっていたのだが、このタイミングでルートへ統合した。大量にファイルを移動するを AI にやらせるは無駄だという肌感があったので、移動はこちらでやるということを明示して計画を立ててもらった。

#### 007_lib-to-fsd-refactoring

今回の肝で、適当に書いていたコードを FSD に沿って分割しながら再配置した。ぱっとイメージがあったわけではないので、分析して計画を大まかに立ててもらうところから始めた。

```
@/src/lib/ 以下のコードを FSD のルールにそって適切な構成に作り変えます。
まずは大まかにプランを考えてください。
```

いろいろ相談していったのだが要点としては以下:

- 似たような概念が FSD と lib それぞれに存在していて、これらを別々のものとして扱おうとしていたので、統合してもらうようにした
- アプリのドメイン知識が足りずに Notification を一般的な通知機能だと思い込み独立させようとしていた、これはこのアプリでは少し違う概念なので軌道修正した
    - これはアプリ内では「更新があったIssue」くらいの意味で使われていた
- GraphQL の query の扱い方を相談して決めた

計画が出来たら、細かいステップに分割してとお願いした後に、適当な単位で git commit するようにお願いしていた(これは `.clinerules` に含める以前の話):

```
計画の詳細さは維持したまま小さいステップに分割して
```

```
各ステップで git commit を行うようにしてください、フォーマットは以下

git add .
git commit -am "refactor: <適切なメッセージ>

- 詳細
- 詳細
- 詳細
"
```

で、これがうまく行ったかというと前述した通りあまりうまくいかなくて、途中まで進めて満足したのか止まってしまう。
ステップごとの git commit も途中まではうまく行っていたのだけど、一度止まったあとに再開させるとその指示が Markdown に含まれているのにもかかわらず忘れてしまったりで、ぐぬぬという感じだった。
今回は Cline 自体の検証も兼ねているので、満足行くような動きをするまでこのフェーズを何度かやり直していて、実装フェーズの実行だけで合計 $30 くらい吹き飛んでいった。つらい。

結果としてはここは「チェックリストを別ファイルとして作ってアップデートしながらやって」というのがある程度ワークしていてやり切ることは出来たのだが、更新のタイミングがまちまちだったりしてあまりおすすめできる感じではなかった。ちゃんと更新のルールをつめてあげるとか、Roo Code であればそういう Mode を作ればうまくいきそうという感じはしたが、あまりおすすめできない感じ。こんなプロンプトでやっていた:

````
@/docs/plans/007_lib-to-fsd-refactoring.md に沿って、 src/lib 以下を FSD に準じたコードにする作業を進めます。
最初に docs/checklist.md として詳細な作業のチェックリストを作ってください。ステップ毎の作業は以下の手順で進めるようにしてください。

```
1.  pnpm test を実行し、前の作業が問題を残していないことを確認する
2. 各ステップの実装を行う
3. 単体テスト: `pnpm test -- <作業したディレクトリ>`
4. 型チェック: `pnpm tsc --noEmit`
5. リンティング: `pnpm lint <作業したディレクトリ>`
6. 関連テスト: 作業内容に影響を受ける可能性のある他のテストを実行
7. 以下の形式で変更をすべて git commit

refactor: <適切なメッセージ>

- 詳細な変更点
- 詳細な変更点
- 詳細な変更点
```

以後何か作業を進めるごとに必ずこのチェックリストを更新しながら進めます。
準備が出来たら、すべてのステップの作業が完了するまで作業を続けてください。
````

一方でモデルの統合は計画で時間を書けたからかうまくやってくれていた、えらい。
あとはテストを移行するのを忘れるので、ちゃんと指示に含めたほうがよさそうだった。

### 辻褄合わせフェーズ

010 以降がこれにあたり、前述通り計画が大きすぎた反省を活かして、 Plan としては「pnpm eslint を実行して全部直して」くらいのものから始めるが、計画を保存するときに具体的な内容で分割して保存するようにした:

```
deleteLogic と ConfigStream へのリネームに関する作業計画と、 updateStreamの呼び出しに関する作業計画をそれぞれ docs/plans に書き出してください
```

こうすると 010 と 011 に計画を分けてくれたので、小さくなった個別の Task をそれぞれ実行させて完了させていった。番号のつけ方はともかく、これは結構うまく行ったように思う。

## .clinerules

終盤になって `.clinerules` にある程度情報が溜まった来たところで `.clinerules` をブラッシュアップさせた:

```
@/.clinerules をよりよいものにアップデートしたいと考えています。
より良いとは、次のような基準です。

- 明確かつ簡潔であること
- 全体のトーンが揃っていること
- 重要なアーキテクチャの核心についてはより詳しく書かれていること
- 特殊な表記を使わず、見出し、段落、箇条書き、リストを中心とした、人にも読みやすいシンプルな構成
- 記載されている順序がよく練られており、上から順に読めば開発に着手できる

また、次のような要素を付け加えたいと考えています。

- 簡単なコードを書くこと
- 早期リターンを意識しフラットな構造にする
- 関数で書くことを優先する
- ...

よりよい .clinerules が作れるよう、コードベースも参考にして考えてください。
```

最終的には次のような内容になった:

````
# プロジェクトルール

## 重要

1. コード変更前にテストを確認し、実行する
2. テストで期待する動作を事前に定義する
3. コード作成後、テストと静的解析を実行
4. 3回連続で問題解決できない場合、ユーザーに相談する

## 開発ワークフロー

### コマンド一覧
- **開発サーバー起動**: `pnpm dev`
- **ビルド**: `pnpm build`
- **テスト実行**: `pnpm test`
  - 特定のテストファイル実行: `pnpm test -- <filename>`
- **テスト（監視モード）**: `pnpm test:watch`
- **テストカバレッジ**: `pnpm test:coverage`
- **リンティング**: `pnpm lint`
  - 特定ファイルのリント: `pnpm lint -- <filename>`
- **コード自動修正**: `pnpm lint:fix`
- **フォーマット**: `pnpm format`

### 開発フロー
1. **機能実装前**: テストを先に書く（TDD）
2. **コード変更時**: 既存テストが通ることを確認
3. **コード作成後**: テストを実行して期待通りの動作を確認
   ```bash
   pnpm test -- <filename>  # 特定のファイルのテストを実行
   # または
   pnpm test                # すべてのテストを実行
   ```
4. **テスト失敗時**: テストが通るようにコードを修正
5. **リファクタリング時**: テストが引き続き通ることを確認
6. **コミット前**: ESLintを実行してコードスタイルを確認
   ```bash
   pnpm lint
   pnpm lint:fix  # 自動修正可能な問題を修正
   ```

### 拡張機能のロード方法
1. Chromeで`chrome://extensions`を開く
2. デベロッパーモードを有効化
3. `packages/extention/dist`ディレクトリを読み込む

### コミットメッセージ規約
```
<type>(<scope>): <適切なメッセージ>

- <詳細な変更内容>
- <詳細な変更内容>
```

## 開発の基本原則

### コード品質
- **シンプルなコード**: 複雑な実装より読みやすいコードを優先
- **早期リターン**: 条件分岐はネストを避け、早期リターンでフラットな構造に
  ```typescript
  // 良い例
  function processItem(item) {
    if (!item) return null;
    if (item.isInvalid) return null;

    return transformItem(item);
  }

  // 避けるべき例
  function processItem(item) {
    if (item) {
      if (!item.isInvalid) {
        return transformItem(item);
      }
    }
    return null;
  }
  ```

### 関数型アプローチ
- **関数優先**: クラスよりも関数で実装
- **純粋関数**: 副作用を持たない関数を優先
- **ループ処理**: `forEach`を避け、`for...of`または配列メソッドを使用
  ```typescript
  // 良い例（非同期処理の場合）
  for (const item of items) {
    await processItem(item);
  }

  // 良い例（同期処理の場合）
  const results = items.map(item => processItem(item));

  // 避けるべき例
  items.forEach(async (item) => {
    await processItem(item); // 非同期処理の制御が難しい
  });
  ```

### 依存管理
- **依存の最小化**: 可能な限りリポジトリ内のコードで解決
- **依存追加時**: 必ずユーザーに確認
- **外部依存のモック**: テスト時に外部依存を適切にモック化

### 抽象化
- **過度な抽象化を避ける**: 具体的で理解しやすいコードを優先
- **Sliceの具体性**: 抽象的なコードよりも具体的な実装を優先

## アーキテクチャ（Feature Sliced Design）

### レイヤー構造
1. **app** — アプリケーション実行に必要な要素
   - エントリーポイント、グローバルスタイル、ルーティング
2. **pages** — 完全なページまたはネストされたページ部分
3. **features** — ユーザーにビジネス価値をもたらす機能
4. **entities** — ビジネスエンティティ（GitHub Search Result、Timeline Itemなど）
5. **shared** — 再利用可能な機能（プロジェクト/ビジネスから独立）

### 参照ルール
- 上位レイヤーから下位レイヤーへの参照のみ許可
  - `app` → `pages` → `features` → `entities` → `shared`
- 下位レイヤーから上位レイヤーへの参照は禁止
- 同一レイヤー内のSlice間の参照も禁止

### Slice構造
- **app**と**shared**レイヤーは直接Segmentsを配置
- **pages**, **features**, **entities**レイヤーはSlices配下にSegmentsを配置

### Segment構造
- **ui** — UI表示（コンポーネント、スタイルなど）
- **model** — データモデル（スキーマ、ロジックなど）
- **api** — バックエンド連携（リクエスト関数など）
- **lib** — 他のモジュールが必要とするライブラリコード
- **config** — 設定ファイルとフラグ

### Public API
- 各Sliceの公開APIはindex.tsで明示的にエクスポート
- Sliceの内部実装詳細を直接参照することは禁止
- 各sliceの直下には必ずindex.tsファイルを配置

```typescript
// entities/github-search-result/index.ts
export * from './api';
export * from './model/io';
export * from './model/timeline-item';
export * from './model/type';
export * from './ui/detail';
// ...
```

## コーディング規約

### TypeScript
- 型定義を厳格に行う
- 型ガード関数を活用して型安全性を確保
  ```typescript
  function isCommentTimelineItem(item: any): item is CommentTimelineItem {
    return item.type === 'IssueComment' && 'bodyText' in item;
  }
  ```

### Reactコンポーネント
- 関数コンポーネントとして実装
- Reactフックを活用
- プロパティベースの設計（下位レイヤーのコンポーネントは上位レイヤーの機能を直接参照しない）

### スタイリング
- CSSモジュールを使用してスタイルをコンポーネントスコープに保つ
  ```typescript
  import styles from './component.module.css';

  function Component() {
    return <div className={styles.container}>...</div>;
  }
  ```

### ファイル命名
- ファイル名はキャメルケースを使用
- テストファイルは`.spec.ts(x)`という命名規則

### インポート
- 相対パスのみ使用（エイリアスは使用しない）
- パス記法は`./{path}`、`../{path}`のみ
  ```typescript
  // 良い例
  import { Button } from '../../shared/ui/button';

  // 避けるべき例
  import { Button } from '@shared/ui/button';
  ```

## 実装パターン

### ストリーム更新パターン
- `updateStream`関数でGitHubからデータを取得
- 各ストリームは`onUpdateThisLoop`関数で更新タイミングを制御
- 更新後は`notifyUpdated`でイベントを発行

```typescript
export const updateStream = async (name: keyof typeof streams, storage: Storage) => {
  // データ取得ロジック
  // ...

  // 通知条件の判定
  if (item.type === 'Issue' && shouldNotifyIssue(item, 'username', lastUpdated)) {
    createNotificationIfNeeds(storage, item.id, lastUpdated);
  }

  // ストレージ更新
  await Promise.all([
    setToStorage(storage, keyForItem(item.id), item),
    setToStorage(storage, keyForStreamItems(stream), newIds),
  ]);

  // イベント発行
  notifyUpdated(name, updatedIds);
};
```

### ストレージ管理パターン
- キーは`keyFor*`関数で生成（一貫性のため）
- `getFromStorageOrDefault`と`setToStorage`を使用
- アイテムIDをリストとして保存し、実際のデータは個別に保存

```typescript
const ids = await getFromStorageOrDefault(storage, keyForStreamItems(stream), () => []);
const items = [];

for (const id of ids) {
  const item = await getFromStorageOrDefault(storage, keyForItem(id), () => null);
  if (item) {
    items.push(item);
  }
}
```

### 通知システム
- `shouldNotifyIssue`と`shouldNotifyDiscussion`で通知条件を判定
- `createNotificationIfNeeds`で通知を作成
- `notifyNotificationUpdated`でイベントを発行

### イベント処理
- カスタムイベント（`stream:updated`、`notification:updated`）を使用
- `subscribeStreamUpdated`と`subscribeNotificationUpdated`で購読

```typescript
// イベント発行
export const notifyUpdated = (name: string, ids: string[], worker = false) => {
  dispatchUpdate('stream:updated', { name, ids }, worker);
};

// イベント購読
useEffect(() => {
  const unsubscribe = subscribeStreamUpdated(({ name }) => {
    if (name === streamName) {
      fetchData();
    }
  });

  return () => unsubscribe();
}, [streamName, fetchData]);
```

### プロパティベースのコンポーネント設計
- FSDレイヤー間参照ルールに従うため、下位レイヤー（entities）のコンポーネントは上位レイヤー（features）の機能を直接参照しない
- 通知状態などの機能は上位レイヤーからプロパティとして注入する
- 例: `IssueLine`コンポーネントは`hasNotification`や`onDeleteNotification`をプロパティとして受け取る

### 非同期処理パターン
- async/awaitを使用した読みやすい非同期コード
- Promise.allを使用した並列処理
- for...ofループを使用した非同期処理（forEachではなく）

```typescript
// 並列処理
const results = await Promise.all(
  queries.map(query => fetchData(query))
);

// 順次処理
for (const item of items) {
  await processItem(item);
}
```

## テスト戦略

### テストファイルの配置
- 実装ファイルと同じディレクトリに配置
- `.spec.ts(x)`という命名規則を使用

### テストファースト
- テストを先に書くことで、仕様を明確にする
- 実装前にテストを書くことで、APIや動作の設計が洗練される
- テストが通るように実装することで、要件を満たす保証になる

### テスティングトロフィー
- テスティングトロフィーを意識し、過度なモック化は避ける
- 単体テスト、統合テスト、E2Eテストのバランスを考慮
- 実際のユーザー体験に近いテストを優先
- モックは必要最小限にとどめ、可能な限り実際の実装を使用

### テスト関数
- `test`関数を使用（`describe`や`it`は使用しない）
- 日本語でテスト内容を記述

```typescript
test('初期状態ではpendingがtrueで、データ取得後にfalseになる', async () => {
  // テスト実装
});
```

### モックの活用
- Jestのモック機能を使用
- 外部依存関係を適切にモック化
- 過度なモック化は避け、実際の動作を反映したテストを心がける

```typescript
jest.mock('../../../entities/timeline/model/io');
jest.mock('../../../shared/lib/event');

beforeEach(() => {
  (timelineIO.getTimeline as jest.Mock).mockResolvedValue(mockTimeline);
});
```

### UIコンポーネントテスト
- React Testing Libraryを使用
- レンダリングの検証
- ユーザーイベントのシミュレーション
- アクセシビリティを考慮したセレクタの使用

```typescript
test('「Show all events」ボタンをクリックするとすべてのイベントが表示される', () => {
  render(<TimelineItems items={items} />);

  // ボタンをクリック
  fireEvent.click(screen.getByText(/Show all events/));

  // 表示を検証
  expect(screen.getByText(/testUser commented/)).toBeInTheDocument();
});
```

## コメント規約

- `TODO`: 将来的に実装すべき機能
- `MEMO`: 実装の背景や理由の説明

## ドキュメント規約

- `docs/plans/` - 計画ドキュメント
  - ファイル名は `{3桁の通し番号}_{kebab-case-name}.md` の形式で保存

## 制約と注意点

### GitHub API制限
- レート制限に注意（短時間に多数のリクエストを送らない）
- エラーハンドリングを適切に実装

### サービスワーカー制約
- サービスワーカーのライフサイクルに注意（長時間実行できない）
- 定期的なウェイクアップと処理の分散

### 既知の問題
- ユーザー名がハードコードされている箇所がある（将来的に設定から取得するよう変更予定）
- 初回データ取得時の挙動に制限あり
````

ちなみにこれを書いている途中に `.clinerules` がディレクトリにできるようになった。

## 所感

### 計画の管理方法と区切り方

管理方法に関しては答えがあまり考えられていないのだけど、計画の Markdown を中心に回すのは自分としては好みのフローだった。
フロー以外にも、想定していないとか動作がおかしなコードが見つかったときに、それがどこで生まれたかを Markdown を遡って探しに行ってくれていたりして、そういう意味もあったほうがいいのだとは思う。
とはいえ、ちょっとした bugfix まですべて管理したいのかと言われるとそうでもなく、 PR の単位で一つあればいいような温度感なので、 Plan というよりは Design Doc のような感覚で残せるといいのかなと思う。

番号は指定が楽になるので割とほしくて、複数人で管理する場合はやはり GitHub Issue などに連携できるとよさそう。そうするとそれをフロー化した Roo Code のカスタムモードが使いたくなるな、という感じだった。

実際の管理方法をどのようにしていくかにもよるが、計画自体は思っている 3 倍くらいは細かくしたほうがいいなと思った。 Design Doc のような形にする場合は、あまり分かれすぎていても効果が薄そうなので、 Git 管理下にない場所で個人的に使うのも手かもしれない。

### Lint は AI に整備させる

結構ちゃんとしたものがすぐに出てくるので便利。
汎用的なものを作ろうとする傾向にあるように思うので、局所最適して良いことを伝えると精度が上がるように思う。

### 多分作り直させたほうがいい

既存のコードを大きく書き換えるよりも、既存のコードを解析させて仕様抽出、その仕様をもとに新しいコードを生成させる方が得意だろうと思うので、今回のように Cline で移動させるみたいなのはあんまり向いていない気もする。
途中でやり直しているフェーズがいくつかあるとはいえ、やり切るのに大体 $100 かかっていて、「これ作り直したほうが安くね？」と思いながらやっていた。

### 名前を横着せずにちゃんとつける

別に人間がコードを書く場合でも変わらない話ではあるが、抽象度が高い名前を使っていると勝手に役割を推測されているような感覚があった。
新しく作る場合よりは、既存のコードを解析させたりリファクタリングさせる場合にこれは大きく影響してきそう、という肌感。
