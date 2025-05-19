import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	articles,
	Article
} from "./articles";

// Cloudflare Workersの環境変数の型定義
interface Env {
	MCP_OBJECT: DurableObjectNamespace;
	VECTORIZE: any; // Vectorizeの型
	AI: any; // AIの型
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator and Blog",
		version: "1.0.0",
	});


	async init() {
		// リソースとして記事を登録
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

		// 記事を検索するツールを追加
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
				} catch (error) {
					console.error("記事検索中にエラーが発生しました:", error);
					throw new Error("記事検索に失敗しました");
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
