export interface Env {
	VECTORIZE: Vectorize;
	AI: Ai;
	API_KEY: string;
}

interface EmbeddingResponse {
	shape: number[];
	data: number[][];
}

// 記事登録用のインターフェース
interface Article {
	id: string;
	url: string;
	title: string;
	content: string;
}

interface RelatedArticle {
	id: string;
	url: string;
	title: string;
	content: string;
	similarity: number;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// APIキーの検証関数
		const validateApiKey = (request: Request): boolean => {
			const apiKey = request.headers.get('X-API-Key');
			return apiKey === env.API_KEY;
		};

		// 記事登録エンドポイント
		if (path === "/register" && request.method === "POST") {
			// API認証
			if (!validateApiKey(request)) {
				return new Response(JSON.stringify({ error: "Invalid API key" }), {
					status: 401,
					headers: { "Content-Type": "application/json" }
				});
			}

			try {
				const article: Article = await request.json();

				// 記事をベクトル化
				const response = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
					text: article.content,
				});
				const embedding = (response as EmbeddingResponse).data[0];

				// ベクトルDBに保存（upsertを使用して既存の記事を上書き）
				await env.VECTORIZE.upsert([{
					id: article.id,
					values: embedding,
					metadata: {
						url: article.url,
						title: article.title,
						content: article.content
					},
				}]);

				return new Response(JSON.stringify({ success: true }), {
					headers: { "Content-Type": "application/json" }
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: "Invalid request format" }), {
					status: 400,
					headers: { "Content-Type": "application/json" }
				});
			}
		}

		// 関連記事取得エンドポイント
		if (path === "/related_articles" && request.method === "GET") {
			const id = url.searchParams.get("id");
			if (!id) {
				return new Response(JSON.stringify({ error: "ID parameter is required" }), {
					status: 400,
					headers: { "Content-Type": "application/json" }
				});
			}

			try {
				// 指定されたIDの記事のベクトルを取得
				const sourceVectors = await env.VECTORIZE.getByIds([id]);
				if (sourceVectors.length === 0) {
					return new Response(JSON.stringify({ error: "Article not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" }
					});
				}

				// 類似記事を検索
				const matches = await env.VECTORIZE.query(sourceVectors[0].values, {
					topK: 4, // 自分自身も含まれるため4件取得
					returnValues: false,
					returnMetadata: true,
				});

				// 自分自身を除外し、関連記事を整形
				const relatedArticles: RelatedArticle[] = matches.matches
					.filter(match => match.id !== id)
					.slice(0, 3)
					.map(match => ({
						id: match.id,
						url: match.metadata?.url as string || "",
						title: match.metadata?.title as string || "",
						content: match.metadata?.content as string || "",
						similarity: match.score
					}));

				return new Response(JSON.stringify({ articles: relatedArticles }), {
					headers: { "Content-Type": "application/json" }
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: "Internal server error" }), {
					status: 500,
					headers: { "Content-Type": "application/json" }
				});
			}
		}

		// 存在しないエンドポイントへのアクセス
		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" }
		});
	},
} satisfies ExportedHandler<Env>;
