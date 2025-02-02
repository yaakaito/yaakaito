---
layout: ../../../layouts/blog-post.astro
title: Cloudflare Workers の Static Assets と Frameworks を試す
emoji: ☁️
date: 2025-02-02
tags:
  - Web
  - Cloudflare
  - JavaScript
---

これを書いている時点ではβ版となっていますが、 Cloudflare Workers に Static Assets と Frameworks という機能が追加されていて、これまで Pages 側の機能だった静的ファイルの配信が Workers に統合されつつあるようです。これを利用すると Workers 単体で SSG なコンテンツを配信したり、 Next.js や Astro のサーバーサイド機能をうまく使うことが出来るようなので、これはそのサンプルを触ってみたログです。

- [Static Assets · Cloudflare Workers docs](https://developers.cloudflare.com/workers/static-assets/)
- [Frameworks · Cloudflare Workers docs](https://developers.cloudflare.com/workers/frameworks/)

チュートリアルをなぞって少し手を加えた程度のものですが、コードは以下にあります。

- https://github.com/yaakaito/workers-static-assets-example

## 基本的な機能

特にフレームワークを利用しないプレーンなアプリは [Deploy a full-stack application](https://developers.cloudflare.com/workers/static-assets/get-started/#deploy-a-full-stack-application) に従って以下のコマンドでこれを試すことができます。デフォルトが Vite なので、個人的にはもっとシンプルな構成であると嬉しかったです。

```shell
$ npm create cloudflare@latest -- my-dynamic-site --experimental
```

生成されたものをみると、Wrangler の設定ファイルである `wrangler.json` もしくは `wrangler.toml` に `assets` フィールドが追加されていて、これで設定を行うようです。

- [Configuration and Bindings · Cloudflare Workers docs](https://developers.cloudflare.com/workers/static-assets/binding/)

JSON の場合は次のようにディレクトリを指定すると、そのディレクトリ以下のファイルが `wrangler deploy` でアップロードされます。

```json
{
  "main": "src/index.ts",
  "assets": {
    "directory": "./public/"
  }
}
```

ここに該当するファイルがあれば Workers の `main` よりも先にそれが返され、そうでなければ `main` に指定したスクリプトに到達するようです。

## Next.js + PPR

- [Next.js · Cloudflare Workers docs](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/)

```shell
$ npm create cloudflare@latest my-next-app -- --framework=next --experimental
```

`@opennextjs/cloudflare` を利用して、 Workers で動作する形にビルドしているようです。

- [Index - OpenNext](https://opennext.js.org/cloudflare)
- [Cloudflare WorkersとNext.jsインテグレーションの問題にOpenNext実装が加わった - laiso](https://laiso.hatenablog.com/entry/2024/10/12/000528)

概ねうまく動作しているように見えるのですが、Partial Prerendering が備え付けの `preview` コマンドだとうまく動作しませんでした。`next dev` や実際の Workers の環境では問題なく動作しているので、 Wrangler 特有の問題なのかもしれませんが、基本的な開発は `next dev` だと思うのであまり気にする必要はなさそうです。

他にも現状だとサポートされていない機能がいくつかあって、特に ISR が使えないのが気になります。そのうち対応される気もするので使いたい場合は待つことになります。

- https://opennext.js.org/cloudflare#supported-nextjs-features


## Astro + Server Islands

- [Astro · Cloudflare Workers docs](https://developers.cloudflare.com/workers/frameworks/framework-guides/astro/)

```shell
npm create cloudflare@latest my-astro-app -- --framework=astro --experimental
```

`@astrojs/cloudflare` を使って動作します。

- [@astrojs/cloudflare | Docs](https://docs.astro.build/ja/guides/integrations-guide/cloudflare/)

Server Islands を試しましたが、問題なく動いているように思えました。個人的に Astro といえば SSG で、 GitHub Pages にデプロイすればいいかくらいの温度感で使っていたので、Workers で Server Islands が使えるのは出来ることが広がりそうだなという感触があります。この記事も Astro で書いたものを GitHub Pages においているのですが、そのうち Workers へ引っ越すかもしれません。

- [Server islands | Docs](https://docs.astro.build/en/guides/server-islands/)

直接今回の話とは関係ないのですが、Dev Container + OrbStack で `astro dev` で起動したサーバーにブラウザからアクセスができないという問題がありました。コンテナ内からの `curl` は通る状態です。Codespace や Dev Container でないローカル環境では動作するので、 OrbStack 特有の問題だと思いますが未解決です。Docker Desktop ですが次のような記事がありました。

- [[mac]devcontainerで立ち上げたローカルサーバーに接続できない（built-in port-forwarding） #Docker - Qiita](https://qiita.com/hamu3864kA/items/353f14d456f6aa672c3b)

## 雑感

Workers と Pages が徐々に統合されるという流れがあったと思うのですが、 Static Assets でこの流れが一気に進んだように思えます。出来るとわかりつつも、 Cloudflare Workers 上に Web UI をもつアプリケーションを作るのは少し億劫なところがあったのですが、 Static Assets が入るとそれが解決するので、個人開発レベルなら Cloudflare 1 本でも困ることがなくなりそうです。
