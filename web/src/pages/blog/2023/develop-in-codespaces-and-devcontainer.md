---
layout: ../../../layouts/blog-post.astro
title: 個人開発を Codespaces と DevContainer へ移行
emoji: ⚙️
date: 2023-05-06
tags:
  - devcontainer
  - codespaces
  - vscode
---

[Codespaces](https://github.com/features/codespaces) が利用できるようになってから、ちょっとした開発は Codespaces を行っていたのですが、最近は個人の開発はすべて Codespaces で十分だなぁと思うようになりました。
ただ、基本的には無料枠でやっているので[^1]、ある程度腰を据えて開発していると枠が足りなくなったり、Chrome 拡張の開発は毎回成果物のダウンロードが必要だったりで不便なところは少しあるので、そこを埋めるために一部で [Dev Container](https://code.visualstudio.com/docs/devcontainers/containers) を使って、手元のマシン内で開発可能な環境を整えることにしました。

[^1]: 追加することに抵抗があるわけではないので、理由がなければ Codespaces を継続してます。

これは、その準備をしたときの作業ログと未来の自分に向けたメモです。ある程度 Codespaces を触ったことがあるという前提で書かれています。

## 開発用コンテナと Dockfile について

Codespaces と Dev Container で使用するコンテナに関する設定を区別する必要なく、同じものが使えます。
Docker Desktop に相当するものがインストールされていれば、VSCode に Dev Containers のプラグインを入れればそのまま利用可能です。

- https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers

ローカルで開発するときはコードを適当な場所に clone して「Open in container」から開きます。コマンドパレットからも開き直せます、その場合は Reopen ~ になります。

### Clone Repository in Container

コードの clone をコンテナの中で行うという方法もあるようです。これを利用すると Codespace とほとんど同じ感覚で使えるようです。

- [【vscode】devcontainerのClone in container volumeがよいという話](https://weseek.co.jp/tech/4112/)
- [Create a development container using Visual Studio Code Remote Development](https://code.visualstudio.com/docs/devcontainers/create-dev-container#_add-an-open-in-dev-container-badge)

ただ、何回試してみたのですが、shallow clone になってしまってだるいのと、成果物がコンテナ内に入ってしまうので取り出すのがめんどくさい、という理由があって使っていません。

### OrbStack

個人の MBA では Docker Desktop の代わりに [OrbStack](https://orbstack.dev/) を試しています。

- [OrbStack · Fast, light, simple Docker & Linux on macOS](https://orbstack.dev/)
- [OrbStack使ってみた](https://zenn.dev/daifukuninja/articles/6285b5491a05e5)

いまのところ特に問題なく Docker Desktop の代わりとして使えています。

## Dotfiles について

ここ数年は fish を使っていたのですが、devcontainers のものにはデフォルトでは入っていないので、これを機に zsh に戻してみることにしました。
これまで Codespaces を使うときは不便を感じつつも特にカスタマイズをしていなかったので、今回ちゃんと設定を整えてみることにしました。

- [yaakaito/env](https://github.com/yaakaito/env)

開発に使う devcontainer をある程度テンプレ化しておきたかったので[^2] dotfiles ではなくて env という名前にしてみました。

[^2]: テンプレートリポジトリはリポジトリが増えるし同じようなことをそれぞれに更新かけたりがだるいので。

Codepsaces の場合は、GitHub の設定から dotfiles のリポジトリを指定することで、Codespaces が起動するときに dotfiles の内容がコンテナにコピーされ、setup.sh が実行されます。

- [アカウントの GitHub Codespaces をパーソナライズする - GitHub Docs](https://docs.github.com/ja/codespaces/customizing-your-codespace/personalizing-github-codespaces-for-your-account#turning-on-settings-sync-in-a-codespace)

Dev Container の場合は、VSCode の設定から GitHub にある dotfiles のリポジトリを指定ことができます。これをすると Codespaces と同等の挙動になります。

```json
{
  "dotfiles.repository": "yaakaito/env",
  "dotfiles.targetPath": "~/.env",
}
```

### zsh のカスタマイズ

とはいえ欲しい物が fish っぽく動いてほしいくらいだったので、次の記事を参考に [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions) と [zsh-syntaxhighlight](https://github.com/zsh-users/zsh-syntax-highlighting/) を入れて、fish ライクに、peco で ctrl-r に履歴検索、ctrl-s でディレクトリ移動をバインドしています。

- [Setup guide for ZSH in GitHub codespaces - DEV Community](https://dev.to/krish_agarwal/setup-guide-for-zsh-in-github-codespaces-5152)
- [ghqでリポジトリ管理を簡単にする](https://zenn.dev/oreo2990/articles/13c80cf34a95af)
- [pecoを使ったらターミナルの操作が劇的に効率化できた話 - Qiita](https://qiita.com/keisukee/items/9b815e56a173a281f42f)

他には pnpm などの補完がほしいところですが、これは使うコンテナによって必要なものが違うので、Dockerfile の方で有効にしています。例えば pnpm の場合は以下のような感じです。

- [Command line tab-completion | pnpm](https://pnpm.io/completion)

```dockerfile
USER vscode
RUN corepack prepare pnpm@8.2.0 --activate
RUN pnpm install-completion zsh
```

## Copilot や VSCode の拡張機能について

これまではあまり意識せずに Copilot を Codespaces にインストールして使っていたのですが、これを設定している途中で、コンテナ内で開発する際に Copilot が有効にならないことがあることに気づきました。これは Codespaces に限らず、Dev Container でも同じでした。他にもいくつかの拡張機能が動作しないことがあったのですが、これは container.json に設定を追加することで解決しました。

- [GitHub Codespaces での GitHub Copilot の使用 - GitHub Docs](https://docs.github.com/ja/codespaces/codespaces-reference/using-github-copilot-in-github-codespaces)
- [Development Container Specification](https://containers.dev/implementors/spec/#implementation-specific-steps)

`customizations.vscode.extensions` フィールドを設定することで、コンテナで有効にする VSCode の拡張機能を指定することができるようです。これを使って Copilot や必要な拡張を有効にすることにしました。

```json
{
    "build": { "dockerfile": "Dockerfile" },
    "customizations": {
        "vscode": {
            "extensions": [
                "github.copilot",
                "astro-build.astro-vscode" // 例えば Astro を使う場合
            ]
        }
    }
}
```

## 今回やらなかったがやりたいこと

Codespaces や Dev Container を使った開発では、シェルの history が残らないため、永続化したい場合は別途手段を用意する必要があるようです。

- [GitHub Codespace で Terminal の入力履歴を永続化し Codepace 間で共有してみる](https://zenn.dev/hankei6km/articles/persist-command-history-in-github-codesapces)

history が永続化できるとそもそも不要かもしれませんが、cheat を使ったスニペットを env リポジトリに含めて置けると便利そうです。

- [cheat/cheat: cheat allows you to create and view interactive cheatsheets on the command-line. It was designed to help remind \*nix system administrators of options for commands that they use frequently, but not frequently enough to remember.](https://github.com/cheat/cheat)

## 2023-05-14 追記

しばらく触っていなかったリポジトリを同じ要領で触ってみたら、DevContainer 側で VSCode の Extention のインストールが全く進まずに困っていたのですが、Dockerfile が原因でした。
かなり前に公式を参考に devcontainer.json と Dockerfile を作った際に、その Dockerfile はこんな感じに定義されていて、

```
ARG VARIANT=bullseye
FROM --platform=linux/amd64 mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}
```

`linux/amd64` を指定していると M2 Mac 上のコンテナに Extention がインストールできなくなるようでした。platform は指定しなければ自動で選択してくれるので、

```
ARG VARIANT=bullseye
FROM mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}
```

に変更して無事動くようになりました。当時参考にしたドキュメントが見つからなかったんですが、現在のものは platform を指定していないので問題なさそうです。

- https://docs.github.com/ja/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers

そもそもトレンドとしては Dockerfile は使わず、devcontainer.json だけで完結するのがよいんですかね？
