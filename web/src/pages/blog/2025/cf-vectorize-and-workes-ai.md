---
layout: ../../../layouts/blog-post.astro
title: Cloudflare Vectorize と Workers AI で関連する記事を作ってみる
emoji: 📚
date: 2025-02-23
tags:
  - Cloudflare
  - AI
---

このブログは SSG したものを GitHub Pages にデプロイしているのですが、 Cloudflare Vectorize と Workers AI を使うと関連記事を表示することができそうだったので作ってみました。

このブログのリポジトリにある Worker として実装しています：

- https://github.com/yaakaito/yaakaito/tree/main/related-articles-worker

チュートリアルと被る部分も多々あるので、そちらも参考にしてください。

- https://developers.cloudflare.com/vectorize/get-started/embeddings/

## Workers AI による埋め込みベクトルの生成

- https://developers.cloudflare.com/workers-ai/

Workers AI は Cloudflare Workers から各種 AI モデルを呼び出すことができるサービスです。モデルは結構色々あって、Text Embedding に使える `@cf/baai/bge-base-en-v1.5` というモデルがあり、今回はこれを使って記事の内容をベクトル化しています。

- https://developers.cloudflare.com/workers-ai/models/

`wrangler.jsonc` に設定を行い、次のようなコードでベクトルを生成できます：

```jsonc
{
  "ai": {
    "binding": "AI"
  }
}
```

```ts
const response = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: article.content,
});
const embedding = response.data[0]; // number[]
```

`@cf/baai/bge-base-en-v1.5` は英語用のモデルで、現時点では英語のモデルしか利用できませんが、今回は Cloudflare Workers で完結させたかったため、精度には目をつぶることにしました。記事が少ないのでなんとも言えないですが、それっぽい結果にはなってる気がします。ここは好きなモデルを使えるので、 Workers AI ではなく、コードを書いて Open AI のモデルを使うとかでもよいです。

## Vectorize でのベクトルデータの管理

- https://developers.cloudflare.com/vectorize/

Cloudflare Workers から触れるベクトルデータベースで、手軽にベクトルの保存や検索を行うことができます。

使用するために準備として wrangler からデータベースを作成します：

```bash
bun wrangler vectorize create related-articles-index --preset="@cf/baai/bge-base-en-v1.5"
```

Workers AI を使用する場合モデルに合わせてプリセットを指定することで、互換性のある設定が自動的に行われます。そうでない場合は、 `--dimensions` と `--metric` を指定して作成します。

出力された設定情報を `wrangler.jsonc` に追加します：

```jsonc
{
  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "related-articles-index"
    }
  ],
}
```

### データの挿入

検索対象にしたい記事をベクトル化してデータベースに登録します。 Worker AI で取得した `embedding` を、以下のように `upsert` で保存します：

```ts
await env.VECTORIZE.upsert([{
    id: article.id, // どこからでも作れるように、記事の URL に対応した形式にしている
    values: embedding,
    metadata: {
        url: article.url,
        title: article.title,
        emoji: article.emoji,
        content: article.content
    },
}]);
```

これを適当な Web API としてまとめ、 GitHub Actions で SSG するときに全記事分リクエストを投げています。現状は記事数が少ないため、毎回全データを上書きする形で実装しています。

## 関連記事の取得

関連記事を取得する API は、次のような URL で記事の ID を受け取って類似度の高い記事を返します。

```
https://articles.yaakai.to/related_articles?id=note-1
```

この API では、 ID に登録されているベクトルを取り出して、そのベクトルを利用して Vectorize の `query` メソッドで類似度の高い記事を検索しています：

```ts
const sourceVectors = await env.VECTORIZE.getByIds([id]);
const matches = await env.VECTORIZE.query(sourceVectors[0].values, {
    topK: 4,
    returnValues: false,
    returnMetadata: true,
});
```

完全一致の記事（自分自身）を除外し、上位3件を関連記事として返しています：

```ts
const relatedArticles = matches.matches
    .filter(match => match.id !== id)
    .slice(0, 3)
    .map(match => ({
        id: match.id,
        url: match.metadata?.url as string,
        title: match.metadata?.title as string,
        emoji: match.metadata?.emoji as string,
        content: match.metadata?.content as string,
        similarity: match.score
    }));
```

このブログには、クライアントサイドからこの API にリクエストして、取得したデータを整形して表示しています。

## ローカル開発環境

注意点としてローカルでの開発時は、Workers AI と Vectorize を使用するために `--remote` オプションを付けて起動する必要があります：

```bash
$ wrangler dev --remote
```
