---
layout: ../../../layouts/blog-post.astro
title: このブログを Remote MCP Server にして検索できるようにしてみる
emoji: 🦋
date: 2025-05-20
eyecatch: blog-blog-remote-mcp-server
tags:
  - AI
---


技術的な素振りの側面が大きいが、比較的新し目のことを書いたりしているので MCP でブログの内容が検索できると、あとで実装に使いたいときに便利そうだと思ったので、このブログを Remote MCP Server にしてみた。

サンプルに毛が生えた程度の大したものではないが、コードはこのブログのリポジトリに含まれている:

- https://github.com/yaakaito/yaakaito/tree/main/mcp-server

## Cloudflare で Remote MCP Server を立てる

MCP といえばローカルで Node なんかで動いているイメージが強いが(もはやそうでもない？)、プロトコルとしては HTTP 経由でも利用できるようになっていて、先日 Cloudflare Workers でこれを動かす方法が公式から発表されたので、これに従っていく。

- https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/
- https://developers.cloudflare.com/agents/guides/remote-mcp-server/

少し前のテンプレートだと OAuth 認証がセットになっていて少しだるかった記憶があるが、最近試したら `remote-mcp-authless` というのになっていたので、ありがたくこれを使う。いつの間にかドキュメントが Bun のコマンドにも対応していた。

```shell
$ bun create cloudflare@latest my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

ざっくり言えば Cloudflare の提供する `agents/mcp` で `@modelcontextprotocol/sdk` のサーバーをラップするとイメージで実装されている。それ以外は `@modelcontextprotocol/sdk` と同様に実装できるはずなので、それの詳しい説明は割愛する。

- https://agents.cloudflare.com/
- https://github.com/modelcontextprotocol/typescript-sdk

## 検索できる Tool を実装する

中身については、前に作ったこのブログの関連記事用の Vectorize を流用している。

- https://yaakai.to/blog/2025/cf-vectorize-and-workes-ai/

Vectorize は Workers から使えるベクトルデータベースで、手軽にベクトルの保存や検索を行うことができる。

- https://developers.cloudflare.com/vectorize/

詳しい使い方や現状の実装は興味があれば前の記事を見てほしい、ここで作る MCP サーバーには、Vectroize からベクトル検索を行う Tool を実装しただけ。

```typescript
// 記事を検索すkるツールを追加
this.server.tool(
    "yaakaito_search_articles",
    "キーワードや文章を入力して、関連する記事を検索します。",
    {
        query: z.string().describe("検索キーワードまたは文章"),
        limit: z.number().optional().describe("取得する記事の最大数（デフォルト: 3）")
    },
    async ({ query, limit = 3 }) => {
        try {
            const env = this.env as Env;

            // 検索クエリをベクトル化
            const response = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
                text: query,
            });
            const embedding = response.data[0];

            // 類似記事を検索
            const matches = await env.VECTORIZE.query(embedding, {
                topK: limit,
                returnValues: false,
                returnMetadata: true,
            });

            // 検索結果を整形
            const searchResults = matches.matches.map((match: any) => ({
                id: match.id,
                title: match.metadata?.title as string || "",
                content: match.metadata?.content as string || "",
                tags: (match.metadata?.tags as string[]) || [],
                path: match.metadata?.path as string || "",
                createdAt: match.metadata?.createdAt as string || "",
                updatedAt: match.metadata?.updatedAt as string || "",
                similarity: match.score
            }));

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(searchResults)
                }]
            };
        } catch (error) { }
    }
);
```

ベクトル化には引き続き `@cf/baai/bge-base-en-v1.5` を使っているが、そこまで困っていない。
Tool を実装したらいつも通り Workers へデプロイし、今回は VSCode の Copilot に MCP Server を設定する。

```json
// settings.json
{
  "mcp": {
    "servers": {
      "yaakaito": {
        "url": "https://{worker}.workers.dev/mcp" // or /sse
      }
    }
  },
}
```

もしくは `MCP: Add Server...` とかでもできると思う、適当に起動なり再起動をしたらツールが使えるようになるので適当に質問を投げてみる。

<img src="/images/blog-remote-mcp-server-01.png" alt="plan">

## Resources としてブログ記事を追加する

MCP には Resources という機能もあり、Tool とはまた違う形で情報を提供することができる。

- https://modelcontextprotocol.io/docs/concepts/resources

今回の場合は、Resources に記事を配置しておくと、Claude Desktop でこんな感じに表示されて、プロンプトに本文を含めることができる。

<img src="/images/blog-remote-mcp-server-02.png" alt="plan">

Claude Desktop は Integrations が使えると URL のみでよいはずだが、Pro (以下) の場合は現状 `mcp-remote` を経由して設定する必要がある。

```json
{
  "mcpServers": {
    "yaakaito": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://{url}.workers.dev/sse"
      ]
    }
  }
}
```

- https://github.com/geelen/mcp-remote

実装としては、デプロイ時に記事をコード化して Worker としてビルドしてしまうという方法にしている。

```typescript
for (const article of articles) {
    this.server.resource(
        article.title,
        `articles://${article.id}.md`,
        { mimeType: 'text/plain', description: `${article.title} - ${article.content.substring(0, 50)}` },
        () => {
            return {
                contents: [{
                    uri: `article://${article.id}.md`,
                    mimeType: 'text/plain',
                    text: article.content,
                }]
            };
        }
    );
}
```

記事が増えるともう少し考えたほうがよさそうで、理想としては subscribe に対応するのがいいだろうが、そんな頻繁に増えるものでもないので、一旦はこれにしている。

## デバッグ

開発をサポートするツールとして MCP Inspector と AI Playground が紹介されている。

- https://github.com/modelcontextprotocol/inspector
- https://playground.ai.cloudflare.com/

自分は今回前者だけ使った、ただこれを Dev Container で動かそうとするとパッとはうまくいかなかったので、ホスト側で実行した。多分これと似たような問題でおそらく解決方法はあるが、面倒なのでやっていない。

- https://yaakai.to/note/28/
