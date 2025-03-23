---
layout: ../../../layouts/blog-post.astro
title: Project Rules や .clinerules や CLAUDE.md をまとめて管理する
emoji: 🐠
date: 2025-03-24
eyecatch: blog-rule-files-unified-management
tags:
  - AI
  - 開発
---

これを書いている 2025 年 3 月 24 日時点では、いわゆる rules ファイルを作って AI Coding の性能を向上させようという共通認識はあるものの、各種ツールでそのフォーマットは統一されていない。
そのため現状では、複数のツールを使っていたり、人によってツールが異なるチームだと何かしらの方法でこれらを一元管理する必要があり、これは自分が今やっている方法を書き残したもの。

## 現状

### Cursor / Project Rules

`.cursorrules` というファイルを使っていたが非推奨になり、 Project Rules という独自形式に移行した。

- https://docs.cursor.com/context/rules-for-ai#project-rules-recommended

ここで使われる `.mdc` 形式は Front Matter でルールを適用する範囲を glob で定義できる:

```
---
description: frontend の開発ルール（常に参照）
globs: packages/frontend/**/*
alwaysApply: true
---
```

性質が異なるので一元的に評価することは難しいが、Cursor の操作感と相まって他より 1 歩進んでいるという印象。

### Cline / .clinerules

`.clinerules` というファイルを使っていたが、直近で `.clinerules` がディレクトリに出来るようになった。

- https://docs.cline.bot/improving-your-prompting-skills/prompting#clinerules-folder-system

Cursor の mdc のように glob 機能があるわけではなく、単純に `.clinerules` ディレクトリにあるファイルがすべて適用される。
コンテキストに含めるものの変更はファイルの移動が伴うため、公式に次のような運用が推奨されており、今回もこれを参考にしている:

- `clinerules-bank` のような非アクティブなルールを格納しておくディレクトリを作る
- 複数人で運用する場合は `.clinerules` は gitignore に入れておき、各自が必要なものを移動させて利用する
- コンテキストの切り替えをスムーズにするためのスクリプトを用意する

#### Roo Code

Cline のフォークだが、少し特殊で `.clinerules` `.cursorrules` `.windsurfrules` の 3 つを読み込んでくれる。

- https://docs.roocode.com/advanced-usage/custom-instructions/
- https://github.com/RooVetGit/Roo-Code/blob/main/src/core/prompts/sections/custom-instructions.ts#L20

### Claude Code / CLAUDE.md

Cursor や Cline のディレクトリ化以前のシンプルなファイルと本質的には変わらないが、 `claude` を実行したディレクトリのものが適用されるという特性がある。
当たり前といえばそうなのだが、これを Monorepo の場合で考えると、作業をする際にそのパッケージのディレクトリで `claude` を実行することでコンテキストを切り替えることができる。
今回はこの特性を基準として rules の構成を考えている。

CLAUDE.md を Claude Code に作らせたときに面白かったことして、 claude code 自身の解説による `/init` がこのファイルは 20 行程度に作るべきだと定義しているっぽく、他のツールと比べて明らかに内容が少なくなる、というのがあった。
自分はどちらかと言えばこれに賛成というか、(将来的には)長い知識を書き連ねるよりは、最小限にして毎度コンテキストを作ればいいよと思っている。

### Copilot / .github/copilot-instructions.md

Cursor を使っていて、兼用はしていないので作っていない。

### Windsurf / .windsurfrules

これに関しては自分は Windsurf は使っていないのでそれに関する言及はないが、他とコンフリクトしないので Roo Code 用に作成している。

## どう管理するか

現状を踏まえて次のようにやっている:

- rules ディレクトリを作り、その中に Monorepo のパッケージ構造と同じになるようルールを分割して配置する
- Cursor と claude はコンテキストに合わせたファイルをそれぞれ作成する
- Cline と `.windsurfrules` はコンテキストを指定してファイルを配置したり結合する

前述した通り、現状では CLAUDE.md を Monorepo の各パッケージに配置することで実質的にコンテキストを切り替えることができる、というのを基準に考えている。
コンテキストの切り替えを考える基準としては、ビジネス基準で考えるか技術基準で考えるかがあると思うが、 Monorepo 内で分けられたパッケージ単位でコンテキストが異なるレベルの技術が混在することは少ないだろうと考えて、ビジネス基準で分けている。
Single Repo (= リポジトリに一つのコンテキスト)の場合は単にファイルを分割して結合なりすればよいだけなので割愛するが、サブディレクトリが省略されるだけで同じものを使っている。

### Monorepo の構造

自分が情報収集のために作っているアプリを例に出す。これはざっくりいうと以下の 4 つ(の種類)のパッケージがあり、それぞれでコンテキストを切り替えて開発したい。

- RSS 収集し、 AI を使ってフィルタリングや要約を行うパッケージ
- 上で作られたデータや他の RSS を収集し、デイリーの単位でまとめを行うバックエンドアプリ
- それを読むための Chrome 拡張
- ユーティリティライブラリ

```
packages
├── claude-3
├── core
├── openai
├── reader-backend
├── reader-chrome-extension
├── rss-blog-release-notes
├── rss-books
├── rss-github-changelogs
├── rss-hatena-bookmark
├── rss-oss-release-notes
├── ...
├── rss-personal-blogs
├── rss-tech-blogs-en
├── rss-tech-blogs-jp
├── source-utils
├── string-utils
└── xml-utils
```

### rules の構造

これに合わせて次のように rules を分割して配置している。

```
/
├── packages
└── rules
    ├── reader-backend
    │   ├── 01-init.md
    │   ├── 02-workflow.md
    │   └── 03-architecture.md
    ├── reader-chrome-extension
    │   ├── 01-init.md
    │   ├── 02-workflow.md
    │   ├── 03-architecture.md
    │   └── 06-patterns.md
    ├── rss-
    │   ├── 01-init.md
    │   ├── 02-workflow.md
    │   ├── 03-architecture.md
    │   └── 06-patterns.md
    ├── 01-init.md
    ├── 02-workflow.md
    ├── 03-architecture.md
    ├── 04-coding.md
    ├── 05-testing.md
    ├── 06-patterns.md
    └── generate-ai-rules.js
```

それぞれのファイルには名前に対応した内容を書いているが、 rules 直下のものにはより広い範囲の事柄を、それぞれのものには狭い範囲の事柄を書いている。
例えば `rules/03-architecture.md` には Monorepo 全体の構造を書いて、 `rules/reader-backend/03-architecture.md` にはバックエンドアプリの設計方針が書いてある感じ。

工夫として、 `01-init.md` には次のように書いている:

```
最初に「reader-backend のコンテキストで処理しています。」と発言してください。
```

こうしておくことで、今読み込まれているものを認知できるようにしている。注意点として Cursor で 2 つのコンテキストをまたぐとうまく発言しないが、読み込み自体はうまく行っているはず。

また、ディレクトリ名が `-` で終わる場合は前方一致で対象のディレクトリを判定している。今回の場合は `rss-` で始まるパッケージには `rss-` 以下のルールがすべて適用される。

### スクリプトで連結して配置する

`rules/generate-ai-rules.js` を実行するとそれぞれに対応するファイルが一括で出力されるようになっている:

```
$ ./rules/generate-ai-rules.js
```

このスクリプトは引数を取ることが出来て、 `.clinerules` と `.windsurfrules` はこの引数によって内容が変化する:

```
$ ./rules/generate-ai-rules.js reader-backend
$ ./rules/generate-ai-rules.js rss-
```

これを例えば `reader-backend` を引数に実行するとこのようにファイルが配置される:

```
├── .clinerules
│   ├── reader-backend
│   │   ├── 01-init.md
│   │   ├── 02-workflow.md
│   │   └── 03-architecture.md
│   ├── 01-init.md
│   ├── 02-workflow.md
│   ├── 03-architecture.md
│   ├── 04-coding.md
│   ├── 05-testing.md
│   └── 06-patterns.md
├── .cursor
│   └── rules
│       ├── reader-backend.mdc
│       ├── reader-chrome-extension.mdc
│       ├── rss-.mdc
│       └── rules.mdc
├── packages
│   ├── reader-backend
│   │   └── CLAUDE.md
│   ├── reader-chrome-extension
│   │   └── CLAUDE.md
│   ├── rss-blog-release-notes
│   │   └── CLAUDE.md
│   ├── rss-books
│   │   └── CLAUDE.md
│   ├── rss-github-changelogs
│   │   └── CLAUDE.md
│   ...
├── CLAUDE.md
└── .windsurfrules
```

あまり汎用的なスクリプトという感じでもないし、この状況が長く続くとは思えないので破棄のしやすさも兼ねて、それぞれのリポジトリに合うものを作っている。

わかりやすいものから順に内容を解説する。

### .clinerules

Cline は `rules` 直下のものと、コマンドの引数で指定されたものを `.clinerules` ディレクトリに配置する。
コンテキストを変えたいときは、スクリプトを実行して配置されているファイルを切り替える。

### .windsurfrules

`.clinerules` と同じようにコマンドの引数でコンテキストが変わるが、ディレクトリには対応していないため 1 ファイルに内容をまとめる必要がある。
例えば rss- パッケージの場合は次のような順でファイルを連結したものを `.windsurfrules` としている:

```
rules/01-init.md
rules/rss-/01-init.md
rules/02-workflow.md
rules/rss-/02-workflow.md
rules/03-architecture.md
rules/rss-/03-architecture.md
rules/04-coding.md
rules/05-testing.md
rules/06-patterns.md
rules/rss-/06-patterns.md
```

### .cursor/rules

`rules` 直下のものはすべてを対象に、サブディレクトリ配下のものは対応するパッケージを対象に glob を設定して連結している。
例えば rss- パッケージ向けのものはこのようになっている:

```
---
description: rss- パッケージのルール（常に参照）
globs: packages/rss-*/**/*
alwaysApply: true
---

最初に「rss- のコンテキストで処理しています。」と発言してください。

...
```

それぞれのファイルは次のように連結している:

```
.cursor/rules/rules.mdc
  - rules/01-init.md
  - rules/02-workflow.md
  - rules/03-architecture.md
  - rules/04-coding.md
  - rules/05-testing.md
  - rules/06-patterns.md
.cursor/rules/reader-backend.mdc
  - rules/reader-backend/01-init.md
  - rules/reader-backend/02-workflow.md
  - rules/reader-backend/03-architecture.md
.cursor/rules/reader-chrome-extension.mdc
  - rules/reader-chrome-extension/01-init.md
  - rules/reader-chrome-extension/02-workflow.md
  - rules/reader-chrome-extension/03-architecture.md
  - rules/reader-chrome-extension/06-patterns.md
.cursor/rules/rss-.mdc
  - rules/rss-/01-init.md
  - rules/rss-/02-workflow.md
  - rules/rss-/03-architecture.md
  - rules/rss-/06-patterns.md
```

これに似たアプローチは他の方も試されていてそちらも参考になる：

- https://zenn.dev/ks0318/articles/b8eb2c9396f9cb


### CLAUDE.md

それぞれのパッケージに、 `.windsurfrules` として生成するものと同等のものを配置している。事前にすべて作っておけるイメージ。
例えば `packages/reader-backend/CLAUDE.md` の内容は `$ ./rules/generate-ai-rules.js reader-backend` を実行したときに生成される `.windsurfrules` と同じものになる。

コンテキストの切り替えはディレクトリ移動して `claude` を実行することで行う:

```
$ cd packages/reader-backend
$ claude
```

## その他

どのくらい効果があるかは分からないが 、Claude Code の CLI モードでプロンプトを評価させている。

```json
{
  "scripts": {
    "rules:lint": "rm -rf .cursor .clinerules CLAUDE.md .windsurfrules && claude -p \"あなたはリンターです。rules以下のmdファイルがあなたや他のAIコーディングツールに渡す情報として適切かをコードベースと照らし合わせてよく考えて回答してください。\""
  }
}
```

全くそうではないのに「このリポジトリは DDD でクリーンアーキテクチャです」みたいなことを書くとちゃんと怒ってくれるので、初期段階ではそれなりに効果があると思う。
実行する前に関連ファイルを消しておかないと、連結済みのものを読んだ状態になるので注意。
