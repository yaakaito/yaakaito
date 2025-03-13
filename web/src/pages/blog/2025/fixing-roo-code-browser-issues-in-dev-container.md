---
layout: ../../../layouts/blog-post.astro
title: Roo Code の Browser が Dev Container で動かない
emoji: 🐋
date: 2025-03-06
eyecatch: blog-fixing-roo-code-browser-issues-in-dev-container
tags:
  - AI
  - Dev Container
---

普段の開発は基本 Dev Container でやっているので、Roo Code もそのまま Dev Container 前提で触っていたが、動作確認なんかで Roo Code が使おうとするブラウザが動作しないのが気になったので直すことにした。
2025/03/14追記: Cline では `PUPPETEER_EXECUTABLE_PATH` に相当するものが設定でき、コンテナに chromium をインストールしておけば動作する。最後に記載する。

## 先に結論

Puppeteer がホストやコンテナの CPU アーキテクチャに関係なく x86_64 を要求するので、 amd64 のライブラリを揃えて動くようにした。

- https://github.com/puppeteer/puppeteer/issues/7740

なんだかんだで Puppeteer を使う機会が一切無かったので全然知らなかった。puppeteer-chromium-resolver のドキュメントに必要なライブラリが書いてある:

- https://github.com/cenfun/puppeteer-chromium-resolver/tree/master?tab=readme-ov-file#troubleshooting

これと日本語フォントとして `fonts-ipafont-gothic` を `amd64` でインストールする、これを `setup-browser-action.sh` としてまとめる:

```sh
#!/bin/zsh

# マルチアーキテクチャを有効にする
sudo dpkg --add-architecture amd64

# リポジトリを修正（Debianの場合）
echo 'deb [arch=arm64] http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb [arch=arm64] http://deb.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
deb [arch=arm64] http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
deb [arch=amd64] http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb [arch=amd64] http://deb.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
deb [arch=amd64] http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware' | sudo tee /etc/apt/sources.list

# リポジトリを更新しライブラリをインストール
sudo apt update
sudo apt install -y \
        ca-certificates:amd64 \
        fonts-ipafont-gothic:amd64 \
        fonts-liberation:amd64 \
        libasound2:amd64 \
        libatk-bridge2.0-0:amd64 \
        libatk1.0-0:amd64 \
        libc6:amd64 \
        libcairo2:amd64 \
        libcups2:amd64 \
        libdbus-1-3:amd64 \
        libexpat1:amd64 \
        libfontconfig1:amd64 \
        libgbm1:amd64 \
        libgcc1:amd64 \
        libglib2.0-0:amd64 \
        libgtk-3-0:amd64 \
        libnspr4:amd64 \
        libnss3:amd64 \
        libpango-1.0-0:amd64 \
        libpangocairo-1.0-0:amd64 \
        libstdc++6:amd64 \
        libx11-6:amd64 \
        libx11-xcb1:amd64 \
        libxcb1:amd64 \
        libxcomposite1:amd64 \
        libxcursor1:amd64 \
        libxdamage1:amd64 \
        libxext6:amd64 \
        libxfixes3:amd64 \
        libxi6:amd64 \
        libxrandr2:amd64 \
        libxrender1:amd64 \
        libxss1:amd64 \
        libxtst6:amd64 \
        lsb-release:amd64 \
        wget:amd64 \
        xdg-utils:amd64
```

これで動作自体はするが、 Roo Code が `--no-sandbox` で実行できるオプションを用意していなくて、それに対応する必要がある:

- https://github.com/RooVetGit/Roo-Code/blob/main/src/services/browser/BrowserSession.ts#L56-L67

Sonnet によると `--cap-add=SYS_ADMIN` をつけてコンテナを起動すればいけるらしく、それらを組み込んだ `devcontainer.json` は次のようになり、これで動くようになった:

```json
{
    "image": "mcr.microsoft.com/devcontainers/base:1-bookworm",
    "runArgs": [
        "--cap-add=SYS_ADMIN"
    ],
    "postCreateCommand": ".devcontainer/setup-browser-action.sh",
    "features": {
        "ghcr.io/devcontainers/features/node:1": {},
        "ghcr.io/shyim/devcontainers-features/bun:0": {},
        "ghcr.io/devcontainers/features/github-cli:1": {}
    }
}
```

下にある元の設定と比べて `base:1` から `base:1-bookworm` になっているが、 `setup-browser-action.sh` と揃えるためで本質的には違いがない。


## 動かない状態

M2 MacBookAir で OrbStack を使っている。devcontainer.json はこれ:

```json
{
    "image": "mcr.microsoft.com/devcontainers/base:1",
    "features": {
        "ghcr.io/devcontainers/features/node:1": {},
        "ghcr.io/shyim/devcontainers-features/bun:0": {},
        "ghcr.io/devcontainers/features/github-cli:1": {}
    }
}
```

これで作ったコンテナ内に Roo Code をインストールして Browser を使うと次のようになる:

```
Error executing browser action:
Failed to launch the browser process!
OrbStack ERROR: Dynamic loader not found: /lib64/ld-linux-x86-64.so.2

This usually means that you're running an x86 program on an arm64 OS without multi-arch libraries.
To fix this, you can:
  1. Use an Intel (amd64) container to run this program; or
  2. Install multi-arch libraries in this container.

This can also be caused by running a glibc executable in a musl distro (e.g. Alpine), or vice versa.

For more details and instructions, see https://go.orbstack.dev/multiarch


TROUBLESHOOTING: https://pptr.dev/troubleshooting
```

特に指定していないのでコンテナは `aarch64`:

```
$ uname -m
aarch64
```

## その他の案

### amd64 のコンテナにする

`--platform=linux/amd64` としてコンテナ側のアーキテクチャを揃える案。これは過去に VSCode の拡張が動かないものが出てきたので避けたもの。よって採用したくないのと、そもそもビルドがうまくいかなくて早々に諦めた。

### puppeteer が自前した Chromium を使うようにする

詳しい説明は下の参考記事を見てもらったほうがよいので割愛するが、次のようなコンテナでいけるか試してみた:

```json
{
    "image": "mcr.microsoft.com/devcontainers/base:1",
    "containerEnv": {
        "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true",
        "PUPPETEER_EXECUTABLE_PATH": "/usr/bin/chromium"
    },
    "postCreateCommand": "sudo apt update && sudo apt install -y chromium",
    "features": {
        "ghcr.io/devcontainers/features/node:1": {},
        "ghcr.io/shyim/devcontainers-features/bun:0": {},
        "ghcr.io/devcontainers/features/github-cli:1": {}
    }
}
```

これはうまくいかなかった。何が悪いのかちゃんと分かっていないが、 x86_64 で実行しようとする。環境変数を Roo Code が読んでくれない...？

## 参考にした記事

- https://zenn.dev/frog/articles/24a20e8a2811b5
- https://zenn.dev/tom1111/articles/0dc7cde5c8e9bf
- https://docs.orbstack.dev/machines/#multi-architecture

めちゃくちゃ参考になったので、この記事がまた誰かの解決に役立つと良いと思い残そうと思った。

## 2025/03/14 追記

Cline では `PUPPETEER_EXECUTABLE_PATH` に相当するものが設定でき、コンテナに chromium をインストールしておけば動作する。ので、この設定で動作するはず:

```json
{
    "image": "mcr.microsoft.com/devcontainers/base:1-bookworm",
    "runArgs": [
        "--cap-add=SYS_ADMIN"
    ],
    "postCreateCommand": "sudo apt update && sudo apt install -y chromium",
    "customizations": {
        "vscode": {
            "settings": {
                "cline.chromeExecutablePath": "/usr/bin/chromium"
            },
        }
    }
}
```
