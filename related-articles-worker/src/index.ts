import { OpenAI } from 'openai';

export interface Env {
	VECTORIZE: Vectorize;
	AI: Ai;
	API_KEY: string;
	OPENAI_API_KEY: string;
	EYECATCH_STORE: KVNamespace;
}

// 画像処理用のインターフェース
interface ImageProcessingRequest {
	imageData: string; // Base64エンコードされた画像データ
	cropData: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	backgroundColor: string; // 背景色（HEX形式）
}

// 記事登録用のインターフェース
interface Article {
	id: string;
	url: string;
	title: string;
	emoji: string;
	content: string;
}

interface RelatedArticle {
	id: string;
	url: string;
	title: string;
	emoji: string;
	content: string;
	similarity: number;
}

// デプロイ時に評価される一意の値を削除
// const DEPLOY_ID = Date.now().toString(36) + Math.random().toString(36).slice(2);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORSヘッダーの設定
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST",
			"Access-Control-Allow-Headers": "Content-Type, X-API-Key",
		};

		// プリフライトリクエストの処理
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: corsHeaders
			});
		}

		// APIキーの検証関数
		const validateApiKey = (request: Request): boolean => {
			const apiKey = request.headers.get('X-API-Key');
			return apiKey === env.API_KEY;
		};

		// キャッシュインスタンスの取得
		const cache = caches.default;

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
				const embedding = response.data[0];

				// ベクトルDBに保存（upsertを使用して既存の記事を上書き）
				await env.VECTORIZE.upsert([{
					id: article.id,
					values: embedding,
					metadata: {
						url: article.url,
						title: article.title,
						emoji: article.emoji,
						content: article.content
					},
				}]);

				// 記事が既に存在するかチェック
				const existingArticle = await env.EYECATCH_STORE.get(`article:${article.id}`);

				// 記事が存在しない場合のみKVに保存
				if (!existingArticle) {
					// KVに記事の内容とアイキャッチ状態を保存
					await env.EYECATCH_STORE.put(`article:${article.id}`, JSON.stringify({
						id: article.id,
						content: article.content,
						hasEyecatch: false
					}));
					console.log(`New article saved: ${article.id}`);
				} else {
					console.log(`Article already exists: ${article.id}`);
				}

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

		// キャッシュパージエンドポイント
		if (path === "/purge_cache" && request.method === "POST") {
			// API認証
			if (!validateApiKey(request)) {
				return new Response(JSON.stringify({ error: "Invalid API key" }), {
					status: 401,
					headers: { "Content-Type": "application/json" }
				});
			}

			try {
				// キャッシュを削除
				await cache.delete(new Request(`${url.origin}/related_articles`));

				return new Response(JSON.stringify({ success: true }), {
					headers: { "Content-Type": "application/json" }
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: "Failed to purge cache" }), {
					status: 500,
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
					headers: {
						"Content-Type": "application/json",
					}
				});
			}

			try {
				// キャッシュキーの生成（デプロイIDを削除）
				const cacheKey = new Request(`${url.origin}/related_articles/${id}`);

				// キャッシュの確認
				const cachedResponse = await cache.match(cacheKey);
				if (cachedResponse) {
					// キャッシュされたレスポンスにCORSヘッダーを追加
					const newResponse = new Response(cachedResponse.body, {
						status: cachedResponse.status,
						headers: {
							...Object.fromEntries(cachedResponse.headers)
						}
					});
					return newResponse;
				}

				// 指定されたIDの記事のベクトルを取得
				const sourceVectors = await env.VECTORIZE.getByIds([id]);
				if (sourceVectors.length === 0) {
					return new Response(JSON.stringify({ error: "Article not found" }), {
						status: 404,
						headers: {
							"Content-Type": "application/json",
							...corsHeaders
						}
					});
				}

				// 類似記事を検索
				const matches = await env.VECTORIZE.query(sourceVectors[0].values, {
					topK: 4,
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
						emoji: match.metadata?.emoji as string || "",
						content: match.metadata?.content as string || "",
						similarity: match.score
					}));

				const response = new Response(JSON.stringify({ articles: relatedArticles }), {
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "public, max-age=86400", // 24時間のキャッシュ
						...corsHeaders
					}
				});

				// レスポンスをキャッシュに保存
				ctx.waitUntil(cache.put(cacheKey, response.clone()));

				return response;
			} catch (error) {
				return new Response(JSON.stringify({ error: "Internal server error" }), {
					status: 500,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}
		}

		// 技術キーワードと動物のマッピングテーブル
		const techAnimalMap = {
			"cloudflare": { animal: "alpaca", backgroundColor: "#F38020" },
			"ai": { animal: "owl", backgroundColor: "#8A2BE2" },
			"javascript": { animal: "rhino", backgroundColor: "#F7DF1E" },
			"typescript": { animal: "guanaco", backgroundColor: "#3178C6" },
			"html": { animal: "koala", backgroundColor: "#E34F26" },
			"css": { animal: "fish", backgroundColor: "#1572B6" },
			"database": { animal: "dumbo-octopus", backgroundColor: "#336791" }
		};

		// アイキャッチ画像生成エンドポイント
		if (path === "/create_eyecatch" && request.method === "POST") {
			// API認証
			if (!validateApiKey(request)) {
				return new Response(JSON.stringify({ error: "Invalid API key" }), {
					status: 401,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}

			try {
				const data = await request.json() as { id?: string, content?: string };
				let content = data.content;
				const id = data.id;

				// IDが指定されている場合は、KVから記事の内容を取得
				if (id && !content) {
					const articleData = await env.EYECATCH_STORE.get(`article:${id}`);
					if (!articleData) {
						return new Response(JSON.stringify({ error: "Article not found" }), {
							status: 404,
							headers: {
								"Content-Type": "application/json",
								...corsHeaders
							}
						});
					}

					const article = JSON.parse(articleData);
					content = article.content;
				}

				if (!content || typeof content !== 'string') {
					return new Response(JSON.stringify({ error: "Content is required and must be a string" }), {
						status: 400,
						headers: {
							"Content-Type": "application/json",
							...corsHeaders
						}
					});
				}

				// ステップ1: 記事からキーワードを抽出
				const keywordExtractionPrompt = `
		あなたは与えられた記事から重要なキーワードを抽出するアシスタントです。
		以下の記事を分析し、画像生成に役立つ特に重要なキーワードを**10個**抽出してください。
		キーワードのみをカンマ区切りで出力してください。

		記事:
		${content}
		`;

				const keywordResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
					prompt: keywordExtractionPrompt,
					max_tokens: 100
				}) as { response: string };

				const extractedKeywords = keywordResponse.response.trim().split(',').map(keyword => keyword.trim()).slice(0, 10);
				console.log('抽出されたキーワード:', extractedKeywords.join(', '));

				// ステップ2: キーワードの出現頻度と関連性を分析
				// 抽出されたキーワードを小文字に変換
				const normalizedKeywords = extractedKeywords.map(keyword => keyword.toLowerCase());

				// 技術キーワードの出現回数をカウント
				const keywordCounts: Record<string, number> = {};
				const techKeywords = Object.keys(techAnimalMap);

				// 各技術キーワードについて、抽出されたキーワードに含まれるか確認
				for (const techKeyword of techKeywords) {
					// 完全一致または部分一致をカウント
					const exactMatches = normalizedKeywords.filter(keyword => keyword === techKeyword).length;
					const partialMatches = normalizedKeywords.filter(keyword =>
						keyword.includes(techKeyword) || techKeyword.includes(keyword)
					).length;

					// 完全一致は重みを高く、部分一致は低く設定
					keywordCounts[techKeyword] = exactMatches * 2 + partialMatches;
				}

				console.log('キーワード出現回数:', keywordCounts);

				// 最も関連性の高いキーワードを特定
				let selectedTechKeyword = "cloudflare"; // デフォルト値
				let maxCount = 0;

				for (const [techKeyword, count] of Object.entries(keywordCounts)) {
					if (count > maxCount) {
						maxCount = count;
						selectedTechKeyword = techKeyword;
					}
				}

				// 出現回数が0の場合（マッチするキーワードがない場合）、コンテンツの内容から最適なキーワードを推定
				if (maxCount === 0) {
					const keywordSelectionPrompt = `
		あなたは与えられた記事の内容から、最も関連性の高い技術カテゴリを選択するアシスタントです。
		以下の記事を分析し、次のカテゴリの中から最も関連性の高いものを1つだけ選んでください。
		カテゴリ: cloudflare, ai, javascript, typescript, html, css, database

		記事:
		${content}

		カテゴリ名のみを出力してください。
		`;

					const categoryResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
						prompt: keywordSelectionPrompt,
						max_tokens: 20
					}) as { response: string };

					const suggestedCategory = categoryResponse.response.trim().toLowerCase();

					// 提案されたカテゴリが有効なものであれば採用
					if (techKeywords.includes(suggestedCategory)) {
						selectedTechKeyword = suggestedCategory;
					}
				}

				// あとでなおす
				selectedTechKeyword = "ai";

				console.log('選択された技術キーワード:', selectedTechKeyword);

				// 選択されたキーワードに対応する動物と背景色を取得
				const { animal, backgroundColor } = techAnimalMap[selectedTechKeyword as keyof typeof techAnimalMap];

				// ステップ3: OpenAIのDALL·E 3を使って画像を生成
				const openai = new OpenAI({
					apiKey: env.OPENAI_API_KEY,
				});

				// 抽出されたキーワードをカンマ区切りの文字列に変換
				const keywordsString = extractedKeywords.join(', ');

				// 5つの画像生成リクエストを並列に実行
				// frontend のデバッグでコストが掛かるので一旦 1
				const generateImagePromises = Array(5).fill(null).map(async (_, index) => {
					console.log(`画像生成リクエスト ${index + 1}/5 を開始`);

					// わずかにプロンプトを変えて多様性を確保
					const variations = [
						"cute and playful",
						"simple and minimalist",
						"detailed and expressive",
						"cheerful and colorful",
						"cool and stylish"
					];

					const imageResponse = await openai.images.generate({
						model: "dall-e-3",
						prompt: `Create an 8-bit retro game style pixel art of a ${animal} character representing the concept of ${selectedTechKeyword} and ${keywordsString}.
						The character should be centered on a solid ${backgroundColor} background.
						Style: Classic 8-bit NES/Famicom era pixel art, extremely limited color palette (4-8 colors maximum), ${variations[index]}.
						IMPORTANT: The ${animal} character MUST have a black outline/border around it - this is essential for the retro game look.
						The black outline should be exactly 1 pixel thick and should completely surround the character.
						The ${animal} character should be the ONLY element in the image - no icons, symbols, text, UI elements, or any other objects.
						Make it look like a character sprite from an 80s video game with sharp pixels, no anti-aliasing.
						The final result should be clean, minimalist, and instantly recognizable as an 8-bit game character with a distinct black outline.
						The final image should be exactly 64x64 pixels in size.`,
						// DO NOT include any text, logos, frames, or decorative elements.`,
						n: 1, // DALL-E 3では1枚ずつ生成
						size: "1024x1024", // DALL·E 3で利用可能なサイズ
						quality: "standard",
						response_format: "b64_json",
					});

					console.log(`画像生成リクエスト ${index + 1}/5 が完了`);
					return imageResponse.data[0].b64_json;
				});

				// すべての画像生成が完了するのを待つ
				const imageDataArray = await Promise.all(generateImagePromises);

				console.log('生成された画像数:', imageDataArray.length);

				// 画像データをBase64エンコードして返す
				return new Response(JSON.stringify({
					success: true,
					images: imageDataArray, // 複数の画像を配列として返す
					keywords: keywordsString,
					selectedTechKeyword,
					animal,
					backgroundColor
				}), {
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			} catch (error) {
				console.error('Error generating image:', error);
				return new Response(JSON.stringify({
					error: "Failed to generate image",
					details: error instanceof Error ? error.message : String(error)
				}), {
					status: 500,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}
		}

		// アイキャッチ画像処理エンドポイント
		if (path === "/process_eyecatch" && request.method === "POST") {
			try {
				const data = await request.json() as ImageProcessingRequest;

				// 必須パラメータの検証
				if (!data.imageData || !data.cropData || !data.backgroundColor) {
					return new Response(JSON.stringify({
						error: "必須パラメータが不足しています（imageData, cropData, backgroundColor）"
					}), {
						status: 400,
						headers: {
							"Content-Type": "application/json",
							...corsHeaders
						}
					});
				}

				// Base64データの検証（プレフィックスを削除）
				let base64Data = data.imageData;
				if (base64Data.startsWith('data:image/')) {
					base64Data = base64Data.split(',')[1];
				}

				// 処理結果を返す（実際の画像処理はクライアント側で行う）
				return new Response(JSON.stringify({
					success: true,
					originalImage: base64Data,
					cropData: data.cropData,
					backgroundColor: data.backgroundColor
				}), {
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			} catch (error) {
				console.error('Error processing image:', error);
				return new Response(JSON.stringify({
					error: "画像処理に失敗しました",
					details: error instanceof Error ? error.message : String(error)
				}), {
					status: 500,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}
		}

		// アイキャッチのない記事一覧を取得するエンドポイント
		if (path === "/pending_eyecatches" && request.method === "GET") {
			try {
				// KVからすべてのキーをリスト
				const keys = await env.EYECATCH_STORE.list({ prefix: "article:" });
				const pendingArticles = [];

				// 各記事を取得し、アイキャッチがないものをフィルタリング
				for (const key of keys.keys) {
					const articleData = await env.EYECATCH_STORE.get(key.name);
					if (articleData) {
						const article = JSON.parse(articleData);
						if (!article.hasEyecatch) {
							pendingArticles.push({
								id: article.id,
								content: article.content.substring(0, 100) + "..." // 内容は一部だけ表示
							});
						}
					}
				}

				return new Response(JSON.stringify({ articles: pendingArticles }), {
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			} catch (error) {
				return new Response(JSON.stringify({
					error: "Failed to fetch pending eyecatches",
					details: error instanceof Error ? error.message : String(error)
				}), {
					status: 500,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}
		}

		// アイキャッチ画像をアップロードするエンドポイント
		if (path === "/upload_eyecatch" && request.method === "POST") {
			// API認証
			if (!validateApiKey(request)) {
				return new Response(JSON.stringify({ error: "Invalid API key" }), {
					status: 401,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}

			try {
				const data = await request.json() as { id: string, imageData: string };

				if (!data.id || !data.imageData) {
					return new Response(JSON.stringify({ error: "ID and image data are required" }), {
						status: 400,
						headers: {
							"Content-Type": "application/json",
							...corsHeaders
						}
					});
				}

				// 記事データを取得
				const articleKey = `article:${data.id}`;
				const articleData = await env.EYECATCH_STORE.get(articleKey);

				if (!articleData) {
					return new Response(JSON.stringify({ error: "Article not found" }), {
						status: 404,
						headers: {
							"Content-Type": "application/json",
							...corsHeaders
						}
					});
				}

				// 記事データを更新
				const article = JSON.parse(articleData);
				article.hasEyecatch = true;
				await env.EYECATCH_STORE.put(articleKey, JSON.stringify(article));

				// アイキャッチ画像を保存
				await env.EYECATCH_STORE.put(`eyecatch:${data.id}`, data.imageData);

				return new Response(JSON.stringify({ success: true }), {
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			} catch (error) {
				return new Response(JSON.stringify({
					error: "Failed to upload eyecatch",
					details: error instanceof Error ? error.message : String(error)
				}), {
					status: 500,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}
		}

		// アイキャッチ画像を取得するエンドポイント
		if (path === "/eyecatch" && request.method === "GET") {
			const id = url.searchParams.get("id");
			if (!id) {
				return new Response(JSON.stringify({ error: "ID parameter is required" }), {
					status: 400,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}

			try {
				// アイキャッチ画像を取得
				const imageData = await env.EYECATCH_STORE.get(`eyecatch:${id}`);

				if (!imageData) {
					return new Response(JSON.stringify({ error: "Eyecatch not found" }), {
						status: 404,
						headers: {
							"Content-Type": "application/json",
							...corsHeaders
						}
					});
				}

				// Base64データをバイナリに変換
				const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));

				return new Response(imageBytes, {
					headers: {
						"Content-Type": "image/png",
						"Cache-Control": "public, max-age=86400", // 24時間のキャッシュ
						...corsHeaders
					}
				});
			} catch (error) {
				return new Response(JSON.stringify({
					error: "Failed to fetch eyecatch",
					details: error instanceof Error ? error.message : String(error)
				}), {
					status: 500,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders
					}
				});
			}
		}

		// 存在しないエンドポイントへのアクセス
		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: {
				"Content-Type": "application/json",
				...corsHeaders
			}
		});
	},
} satisfies ExportedHandler<Env>;
