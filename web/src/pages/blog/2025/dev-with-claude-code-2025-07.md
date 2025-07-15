---
layout: ../../../layouts/blog-post.astro
title: 2025年7月版個人的開発スタイル with Claude Code
emoji: 🐿️
date: 2025-07-15
eyecatch: blog-dev-with-claude-code-2025-07
tags:
  - AI
---

最近の開発はほとんど Claude Code で行っているが、使い始めた 3 月から比べると利用スタイルも結構変わったなとふと思ったので、あとで懐かしむために今やっているスタイルを書き残すことにした。個人的な開発に使っているもので、業務にこのフローを適用しているわけではないのと、Claude Code でうまくコードを書く方法ではなくその周辺の話。

## 全体感

- 開発は Dev Containers もしくは GitHub Codespaces
- ローカル開発では VSCode でメインの Claude Code + git worktree でいくつかの並列作業
    - GitHub Copilot もたまに使う
- Claude Code Actions でレビューと GitHub Issues の分析
    - レビューは CodeRabbit も使っている
- HACK 的な設定は入れない
- コンテキストを充実させて解決することを意識する

## Dev Containers / Codespaces での開発

[数年前に個人的な開発はすべてこれらに移行している。](https://yaakai.to/blog/2023/develop-in-codespaces-and-devcontainer/)この地点からの変化として AI 系のツールの準備をどこで行うか、というのがあって今はいわゆる [dotfiles(envというリポジトリにしている)](https://github.com/yaakaito/env/) 側で管理していて、`setup.sh` の流れの中で Claude Code をインストールしている。

env にはいくつか Claude Code を便利に使うための設定やツールを含んでいて、自分の管理するどのリポジトリでも使えるようになっている。特に影響の大きいものだと全体の `CLAUDE.md` つまり `~/.claude/CLAUDE.md` に日本語で出力するよう設定している。

```md
## YOU MUST

- ユーザーの入力に使用された言語にかかわらず、日本語で返答やコードの出力を行います
- Git Commit や Pull request を作成する際、指示がなければ日本語で内容を作成します

## IMPORTANT

- git commit を行うときは、指示がなければ [commit.md](~/.claude/commands/commit.md) のルールに従ってください
```

加えて、全体の `settings.json` として、Read 系だったり、比較的安全なコマンドを許可している。issue なんかは価値観によるかもしれない。

```json
{
    "permissions": {
        "allow": [
            "Bash(cat:*)",
            "Bash(cp:*)",
            "Bash(find:*)",
            "Bash(head:*)",
            "Bash(gh api:*)",
            "Bash(gh issue create:*)",
            "Bash(gh issue edit:*)",
            "Bash(gh pr diff:*)",
            "Bash(gh pr list:*)",
            "Bash(gh pr view:*)",
            "Bash(git add:*)",
            "Bash(git branch:*)",
            "Bash(git log:*)",
            "Bash(git push:*)",
            "Bash(git rm:*)",
            "Bash(grep:*)",
            "Bash(ls:*)",
            "Bash(mkdir:*)",
            "Bash(mv:*)",
            "Bash(rg:*)",
            "Bash(tail:*)",
            "Bash(xargs grep:*)",
            "Read(~/.claude/commands/commit.md)"
        ]
    }
}
```

細かいツールやコマンドなんかはそれぞれが登場するときにまた紹介する。

## ローカルの Claude Code での開発

Claude Code は基本的に VSCode の Terminal で動作させているが、連携の拡張機能は使っていない。最近は「Create New Terminal in Editor Area」でファイルなどと同じエディター領域で開いてしまって、そこで Claude Code を実行している。自分がターミナルとして操作したい場合は、これまで通りの Terminal を使ったり、同じようにエディター領域で開いたりとその時の気分でやっている。

画面としてはこんな感じで作業している:

<img src="/images/dev-with-claude-code-2025-07.png" alt="Claude Code in editor area">

青い部分がメインの Claude Code のエリアで、ここでは Claude Code と対話しながら進めたい変更を行う。基本的に 1 ラインしか動くことはない。コアになる機能の開発なんかはここで行っている。

赤い部分はメインの変更点を Git diff で見る、もしくはサブタスクを Claude Code で並列しながら行う場合にそのターミナルをタブで出していて、これについては後述する。Git diff は VSCode についているソース管理のビューを使っていて、変更点をまとめて開くことが出来るので Claude Code が書いた内容をレビューするのに重宝している。このビューは worktree にも対応していて、裏でやっていた作業をまとめて確認する場合にも役立つ。

緑の部分は普通にエクスプローラーや検索を使う。VSCode がいろいろ機能がついていて便利なターミナルと化している気がしなくもない。

いわゆる右側の AI パネルは最近はほとんど使うことがなくなってしまったが、GitHub Copilot を使うときには出てきたりする。Copilot は主に、コンテキストの指定が面倒な JSX や CSS を範囲指定で渡して何かしらをしてもらう用途に使っている。Copilot 用の設定は特に入れていない。

### git worktree を使った並列作業

そこまで対話が必要なく、ある程度の指示があれば Claude Code が自走できるものは git worktree を使って裏で作業させている。これをローカルの Claude Code でやっている理由は GHA で Max プランが適用されないからなのだが、最近適用出来るようになったので GHA で間に合うものはなるべくそちらで済ますようにしている。アイデアはあるけど一度やらせてみてどうなるか見てみたい、というものは結構あるので、そういった中規模程度のタスクを一度やらせてみるのがメインな使い方になっているかもしれない。

実際の使い方については GitHub Issues を起点にしている。 env リポジトリに以下の流れを行う[スクリプトを用意していて](https://github.com/yaakaito/env/blob/main/resolve-issue.zsh)、実行すると worktree で実装が始まる。

1. Issue の一覧を peco で表示
1. 選択した Issue とコメントの内容を取得
1. Issue の内容から branch 名を生成
1. branch 名で branch と worktree を作成
1. worktree のディレクトリへ移動し、`.env` のコピーや依存関係の準備をする
1. Issue から prompt を作って、 `claude --dangerously-skip-permissions` で実行

この一連の流れが以下のコマンドで実行できるようにしている:

```
$ resolve-issue
```

実際に使うときは新しいターミナルを開いて上記のコマンドを実行するという感じ。worktree は `.git/working-trees` 以下に入れるようにしていて、こうしておくと管理が楽なのと、 VSCode のソース管理で Diff が見れるというメリットがある。

#### Claude Code Actions での Issue 作成のサポート

Issue をベースにするので当然 Issue を作る必要があるのと、あまりに内容があれだとうまくいかない。`-p` オプションで実行しているわけではないので、都度指示を継ぎ足したりすることも出来るが、基本的には Issue の内容をある程度書く形でやっている。これを補助するために Issue に対して GHA で Claude Code Actions を実行して、Issue の内容を分析したり、レビューを行うようにしている。

```yaml
- uses: anthropics/claude-code-action@beta
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    direct_prompt: |
        Issueとコメントの内容を確認し、コードベースをもとに実装は行わず分析して、実装計画を考えてください。
        その後、考えた実装計画から以下の点をユーザーにフィードバックしてください。
        - 変更内容の3行程度のサマリー
        - 主に変更されるファイルと変更内容
        - 不足している情報をユーザーに質問
        英語で考えて、最終的なアウトプットだけ日本語で出力してください。
```

これで自分がわかっていない変数を AI に補完してもらったりして Issue を完成させている。Claude Code からコメントが残り続けるとプロンプトになったときにノイズになりそうなので、 Issue の内容に満足したら削除するようにしている。実装できそうであればそのまま `@claude` で実装してもらうこともある。

以前は料金が気になって一部のものだけをラベルでトリガーしていたが、 Max プランが GHA にも適用できるようになって基本的にこれを流しておけるようになったので便利。

## リモートの Claude Code Actions での開発

ほとんど書いてしまったようなものだが、Max プランで動かせるようになってからは小さなタスクは積極的に `@claude` で実装を行ってもらっている。欠点として修正がいくつが必要な場合に PR が荒れがちになるというのがある。適当に見切りをつけてローカルでの実行に移行したいとは思っているが、このあたりはまだこれといって方針は見えていない。

## Claude Code の設定

ざっくり言えば、

- `CLAUDE.md` は `/init` で作成したものに日本語使用することだけを付け足している
    - 明らかに操作が変わったときは合わせて更新している
- Permissions はそれぞれのリポジトリに合わせて build test lint など普段の操作を許可している
- うまく開発を回すためにいくつか Custom Slash Command を作ったり Hook を設定したりしている

基本的にはあまり Claude Code 自体はカスタマイズはせずに、都度コンテキストを渡すことを意識している。

### Custom Slash Command

リポジトリ単位で作っているものと、共通で使っているものがある。リポジトリ単位では、複雑になりがちなフローをまとめたりしている。例えば以下は playwright で Chrome 拡張のテストを実行するためのフローをまとめたもの:

```md
---
allowed-tools: Bash(bun run build), Bash(bun run build-extension), Bash(bun run e2e)
description: Run end-to-end tests for the @repo/reader package with proper setup.
---

# Run E2E Tests

Run end-to-end tests for the @repo/reader package with proper setup:

1. Navigate to reader package: `cd /workspaces/repo/packages/reader`
2. Build web application: `bun run build`
3. Build Chrome extension: `bun run build-extension`
4. Run E2E tests: `bun run e2e`
5. Check screenshots in `screenshots/` directory

Show progress for each step and report test results with any failures highlighted.
```

共通のコマンドとして env に以下のようなものを用意している、お気に入りは `workflow-fix`。

- [/commit](https://github.com/yaakaito/env/blob/main/.claude/commands/commit.md) - コミットメッセージにここまでの AI とのやりとりを含めてコミットする
- [/reviews-fix](https://github.com/yaakaito/env/blob/main/.claude/commands/reviews-fix.md) - 現在のブランチに対応する PR のレビューコメントを集めて修正を行う
- [/workflow-fix](https://github.com/yaakaito/env/blob/main/.claude/commands/workflow-fix.md) - 現在のブランチに対応するワークフローを確認し、失敗していたら修正を行う
- [/workflow-fix-file](https://github.com/yaakaito/env/blob/main/.claude/commands/workflow-fix.md) - 指定したファイル名のワークフローを確認し、失敗していたら修正を行う

この辺りはリポジトリに依存しない、個人の開発スタイルだと考えて共通にしているが、`/commit` は怪しい。例えば `/create-pr` はリポジトリごとにある程度ルールが存在するはずなので共通にすることはないというのがわかりやすいが、このあたりの区別はまだまだ曖昧。それと、共通のものは `workflow-fix` のように `workflow` や `reviews` を前にしている、数が多くなったときにこの方が絞り込みがしやすいように思う。

### Hooks

編集時の format 、 commit 前の test と lint を設定しているのと、リポジトリに合わせて「bun を使っているのに npm を使おうとするのを止める」のような明らかな間違いを止める Hooks を設定している。

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Write|Edit|MultiEdit",
                "hooks": [
                    {
                        "type": "command",
                        "command": "jq -r '.tool_input.file_path | select(endswith(\".js\") or endswith(\".ts\") or endswith(\".jsx\") or endswith(\".tsx\")) or endswith(\".json\")) or endswith(\".css\"))' | xargs -r bun biome format --write"
                    }
                ]
            }
        ],
        "PreToolUse": [
            {
                "matcher": "Bash",
                "hooks": [
                    {
                        "type": "command",
                        "command": "jq -r '.tool_input.command // \"\"' | grep -q \"^git commit\" && (bun run lint 1>/dev/null; [ $? -eq 1 ] && echo '{\"decision\":\"block\",\"reason\":\"Lint errors found. Fix them before committing.\"}' && exit 2) || true"
                    },
                    {
                        "type": "command",
                        "command": "jq -r '.tool_input.command // \"\"' | grep -q \"^git commit\" && (bun run test 1>/dev/null; [ $? -eq 1 ] && echo '{\"decision\":\"block\",\"reason\":\"Tests failed. Fix them before committing.\"}' && exit 2) || true"
                    },
                    {
                        "type": "command",
                        "command": "jq -r '.tool_input.command // \"\"' | grep -qE \"^(npm|npx)\\s\" && echo '{\"decision\":\"block\",\"reason\":\"Consider using bun instead of npm/npx for better performance. Examples: npm install → bun install, npm run → bun run, npx → bun x\"}' && exit 2 || true"
                    },
                    {
                        "type": "command",
                        "command": "jq -r '.tool_input.command // \"\"' | grep -qE \"^bunx @biomejs/biome check\" && echo '{\"decision\":\"block\",\"reason\":\"Use bun biome lint instead of bunx @biomejs/biome check for better performance and consistency.\"}' && exit 2 || true"
                    }
                ]
            }
        ]
    }
}
```

## Pull request のレビュー環境

ローカルの Claude Code で作ったものと、Claude Code Actions で作ったものでフローが異なる。

前者はコードレビューだけ行っていて、Claude Code Actions と CodeRabbit、たまに GitHub Copilot を使っている。レビューされた内容は、web 上で不要なものは Resolve したりしつつ、前述の `/reviews-fix` を使って修正を行っている。

後者の Claude Code Actions で作成したコードは、ローカルの開発環境を経由せずにマージまで持っていきたかったので、作れるものに関しては Cloudflare の Preview URLs を使って確認用の環境を作ってみている、そうでないものは Codespaces で起動したりとか。

- https://developers.cloudflare.com/workers/configuration/previews/

Claude Code Actions ないしリモートの AI (コンテナ) で作られたものの動作をどう確認するのかというのは課題感としてあり、特に出力に AI が絡むものはテストコードなどでは保証が難しいのをどうしていくのがいいかあまりわかっていない。

## 雑感

個々のリポジトリで多少の違いはありつつも、全体的には Claude Code と GitHub Issues を中心に据えたスタイルになってきているように思う。
自分は積極的にコードが書きたいとかコード書いて楽しいと思っているタイプではないのもあり、モチベが低くとも一旦雑にでも Issue にさえしてしまえば、手をつけられる環境に近づいたことに価値を感じている。

やりたいと考えてはいるがうまくできていない、まだやっていないことを書き残して終わる。

- 人間と AI 向けのドキュメントを Markdown で残すようにしているものの AI が書くとどうしても淡々とした説明になってしまう、 Why を残すのであれば人間がうまく挟まる必要がありそう
- gemini-cli も導入して、 Issue に対して評価を行う際に Gemini と話し合ってほしい
- PR レビューが Bot で荒れがちになるのを整理したいが特にアイデアはなし
