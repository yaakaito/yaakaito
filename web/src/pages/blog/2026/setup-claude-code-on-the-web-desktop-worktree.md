---
layout: ../../../layouts/blog-post.astro
title: Claude Code on the web / on Desktop 向けの設定をしたログ
emoji: ☁️
date: 2026-02-21
tags:
  - AI
---

ここ最近 Claude Code on the web を意識的に使うようにしていたら on desktop と worktree まわりにもアップデートが来たので、備忘録的に設定や使い方をまとめておく。
これを触ったり書いているのが 2026/02 の 1-3 週目あたりで、ちょうど `claude -w` と Previews が入ったタイミングなので情報はすぐに古くなるかもしれない。
まったく使ったことのない人向けの内容ではないので、どういうものかだったり基本的な使い方は公式を参照。

- https://code.claude.com/docs/ja/claude-code-on-the-web
- https://code.claude.com/docs/ja/desktop

前提として、専用になにかしらの設定をしなくともある程度は on the web が動作し、調査タスクや bugfix 程度であれば十分にワークしている。ここに少し設定を加えて便利になればよいなという温度感。
また、 on the web と on desktop は同じ UI から利用できるが、中身は別物で有効な設定も違ったりするので注意。区別するために on the web と on desktop と書いている。

## 連携する GitHub アカウントを分ける

on the web の場合に、メインで利用しているものの中には Claude Code に触ってほしくないものが含まれている(可能性がある)のと、単純に UI に無数のリポジトリが表示されると扱いづらいので、専用のユーザーを作って必要なものだけアクセス権を与えて使うようにしている。
自分の場合は[前回の Issue 経由での開発フロー](https://yaakai.to/blog/2025/issue-driven-workflow-with-claude-and-coderabbit)で使っているユーザーが用途にマッチするのでそれをそのまま使っている。ユーザーの切り替えは単に Claude と連携している GitHub アカウントを切り替えれば OK。

## DevContainer に ssh する

基本的には OrbStack + DevContainer で開発しているので、 on desktop の ssh 接続を使いたい。
DevContainer は `ghcr.io/devcontainers/features/sshd` を使うことで sshd を立てることができるのでこれを利用する。

- https://github.com/devcontainers/features/pkgs/container/features%2Fsshd

必要なところだけ抜粋すると次のように devcontainer.json を設定している:

```json
{
    "postCreateCommand": ".devcontainer/setup.sh",
    "features": {
        "ghcr.io/devcontainers/features/sshd:1": {}
    },
    "mounts": [
        "source=${localEnv:HOME}/.ssh/id_rsa.pub,target=/home/vscode/.ssh-host-authorized_keys,type=bind,readonly"
    ]
}
```

setup.sh:

```sh
# SSH authorized_keys setup (skip on Codespaces)
if [ -z "$CODESPACES" ] && [ -s "$HOME/.ssh-host-authorized_keys" ]; then
    mkdir -p ~/.ssh && chmod 700 ~/.ssh
    cp "$HOME/.ssh-host-authorized_keys" ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi
```

このように設定すると、 OrbStack を使っている場合はコンテナ名を調べて以下のコマンドで ssh できるようになる:

```sh
$ ssh -p 2222 vscode@condescending_dewdney.orb.local
```

あとはこれを on desktop で ssh 接続先として登録すれば使えるようになる。

ただし、この設定自体が Claude Code on desktop を使いたいという個人的なニーズに紐づいているので、プライベートリポジトリだけの運用になりそう。
後述する Previews もこれを書いている時点では ssh には対応していないこともあり、使用頻度は低くなりそう。

## SessionStart で依存の install

on the web でのセットアップ手順として `SessionStart` hooks を使った方法が公式に紹介されているが、これを on desktop と `claude -w` でも使えるようにしたい。

- https://code.claude.com/docs/ja/claude-code-on-the-web#%E4%BE%9D%E5%AD%98%E9%96%A2%E4%BF%82%E7%AE%A1%E7%90%86

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/session-start.sh"
          }
        ]
      }
    ],
  }
}
```

session-start.sh で環境に合わせて必要なスクリプトを動かすようにしている:

```sh
#!/bin/bash

# Claude Code on the Web environment
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  bun install --no-save
fi

# Inside a worktree
if [[ "$PWD" == */.claude/worktrees/* ]]; then
  # Copy files listed in .worktreeinclude from the main working tree
  main_tree="$(git worktree list --porcelain | head -1 | sed 's/^worktree //')"
  include_file="$main_tree/.worktreeinclude"
  if [ -f "$include_file" ]; then
    while IFS= read -r entry || [ -n "$entry" ]; do
      [ -z "$entry" ] && continue
      src="$main_tree/$entry"
      [ -e "$src" ] && cp -a "$src" "$PWD/$entry"
    done < "$include_file"
  fi

  bun install --no-save
fi
```

`.claude/worktrees` 以下で実行されているなら on desktop か `claude -w` で動いているだろうという判定をしている。worktree 内で claude を起動し直すと少し無駄な感じになるが気になることはなさそう。

worktree の場合、後述する `.worktreeinclude` というファイルを読んで、 git 管理下にないファイルをコピーするようにしている。
claude 自体が持っている `.worktreeinclude` が `claude -w` の場合には動作しないのでその workaround。

on the web でたまに SessionStart が終わらないことがあり、おそらく `bun install` でネットワークに接続できていない(ログが見れないためよくわからない...)。
クラウド環境の設定からネットワークアクセスをポチポチいじるとなおったりする。謎。

## .worktreeinclude

https://code.claude.com/docs/ja/desktop#gitignore-%E3%81%A7%E7%84%A1%E8%A6%96%E3%81%95%E3%82%8C%E3%81%9F%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E3%82%B3%E3%83%94%E3%83%BC

昨今の流れ的にそれ自体がどうという話はあるが、 `.env` なんかを worktree にコピーしたいときに使える。元ファイルが必要なので on desktop 用で on the web の場合は代わりに環境変数を定義できる。
`claude -w` が出て、そちらはこのファイルには対応していないので、自分は前述のようにしている。

特に難しいことはなくて、`.gitignore` に入っているが worktree でも必要なファイルを同じフォーマットで列挙すればよい:

```
.env
```

## PR のフォーマットを指定する

on the web では最終的に PR にして完結させることが多いのだが、 UI にある PR ボタンを押した場合に、これを書いている時点では CLAUDE.md を読んでいないように見える。
一般的な PR のテンプレート + 英語で作られるのだが、これをカスタマイズしたくてもこれを書いている時点では方法がない。

幸いリポジトリにある Skills などは問題なく動作するので、PR を作るための Skills を user レベルから repository に移すことにした。
そのままだと gh を使おうとするが on the web ではデフォルトでは gh が利用できず、あえて用意されていないようにも思うのでリンクを作らせるようにした。

大した内容ではないが、Skill の手順の最後をこんな感じにしている:

```markdown
Check if `gh` CLI is available by running `which gh`
  - **If available**: Create the PR using `gh pr create` with the formatted body based on the template
  - **If not available**: Output a GitHub PR creation URL: `https://github.com/{owner}/{repo}/compare/main...{branch}?expand=1&title={url-encoded-title}&body={url-encoded-body}`
```

ただ、これはこれで PR を作成するのが今ブラウザでログインしているアカウントになってしまうため、分けている意味が少し薄れてしまうのがマイナス。そのうち解決しそうな話ではある。

## Previews for Claude Code

今のところ対応しているのが on desktop の Local だけなのでまだ使っていない。そのうち ssh や on the web でも対応してくれると嬉しいのだが...。

## 今の運用と雑感

個人的なリポジトリは on the web で十分に開発ができる + PR を出せば Preview URLs で動作確認が完結することもあってかなり使いやすい。
Issue ベースでの開発フローも整備してはいるので、それとの兼ね合いが少し曖昧になっているが、なんとなく以下の感じでやっている:

- メインの開発はこれまで通り CLI
- 新しいことを試してみたり、調査タスクは on the web
- バグレポートへの対応や、Issue として書いて残せるもの、一旦 Issue にしておいてあとで考えたいものは Issue ベース

CLI 以外は都度レスポンスすることがほとんどなくて、ポイポイと投げておいてあとで暇なときにまとめて確認している。
自分は並列にいくつも Agent を動かすみたいなのが苦手であまりやっていなかったが、この運用だと少しできているのかなと思う。

on desktop の ssh と `claude -w` はこれまで自作の worktree 管理をしていたが、そっちは廃止して基本 claude に乗ることにした。

一方で on desktop の local がちょっと難しくて、これは単純に次のようなペインポイントがあって扱いに困ることがあるため:

- on desktop で worktree を作るとき、 `.worktreeinclude` との兼ね合いなのかブランチを指定しても main worktree の状態から worktree が作られているように思う
- diff 表示も少しおかしくて、常に main worktree が優先されている
- Claude Code Desktop の Claude Code が `NODE_EXTRA_CA_CERTS` を見ていなくて、それ起因で環境によってはそもそも使えないことがある([Issue](https://github.com/anthropics/claude-code/issues/22559))

自分の場合は on desktop を使いたい環境で、現状では main worktree を綺麗に保つことが結構難しくて(例えば特定のパスに依存して動作するようなものがある環境)、 branch や diff がめちゃくちゃになってしまうし、そもそも Claude Code が動かなかったりする。
Codex App だとこのあたりがうまく動いていて、今はそっちを使っている。

ただ、Previews を使いこなせればフロントエンド開発にはかなり有効に思えるのでうまく使いたいとは思っている。

### その他

- on the web は常に push しているっぽいので、 GHA とか設定次第では結構使うかも
- rewind ができないので困ることがある
- AI Agent 全体的な話になってしまうが、 DevContainer のサポートが弱いのがぐぬぬという感じ、相性自体はいいはずなのだが...
