import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src';
import type { Env } from '../src';

// Cloudflare Workers環境のグローバル変数をモック
(global as any).caches = {
  default: {
    match: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(false)
  }
};

// モックデータ
const mockArticleData = {
  id: 'test-article-1',
  url: 'https://example.com/test-article-1',
  title: 'テスト記事1',
  emoji: '🚀',
  content: 'これはテスト記事の内容です。',
  similarity: 0.95
};

const mockEyecatchData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// テスト用のモックEnvオブジェクト
const mockEnv: Env = {
  VECTORIZE: {
    upsert: vi.fn(),
    getByIds: vi.fn().mockResolvedValue([{
      id: 'test-article-1',
      values: [0.1, 0.2, 0.3],
      metadata: null
    }]),
    query: vi.fn().mockResolvedValue({
      matches: [{
        id: 'test-article-2',
        score: 0.95,
        values: null,
        metadata: {
          url: 'https://example.com/test-article-2',
          title: 'テスト記事2',
          emoji: '🔥',
          content: 'これは関連記事のテスト内容です。'
        }
      }]
    })
  } as any,
  AI: {} as any,
  API_KEY: 'test-api-key',
  OPENAI_API_KEY: 'test-openai-api-key',
  EYECATCH_STORE: {
    put: vi.fn(),
    get: vi.fn().mockImplementation(async (key: string) => {
      if (key === 'eyecatch:test-article-1') {
        return mockEyecatchData;
      }
      return null;
    }),
    list: vi.fn().mockResolvedValue({ keys: [] })
  } as any,
  ASSETS: {
    fetch: vi.fn().mockImplementation(() => {
      return Promise.resolve(new Response('Static asset content'));
    })
  }
};

// モックExecutionContext
const createMockExecutionContext = () => {
  const waitUntilPromises: Promise<any>[] = [];
  return {
    waitUntil: (promise: Promise<any>) => {
      waitUntilPromises.push(promise);
    },
    passThroughOnException: vi.fn(),
    exports: {},
    props: {},
    abort: vi.fn(),
    // すべてのwaitUntilプロミスが解決するのを待つヘルパー関数
    waitForAllPromises: async () => {
      await Promise.all(waitUntilPromises);
    }
  } as any; // any型を使用して型チェックをバイパス
};

describe('関連記事ワーカーのテスト', () => {
  describe('認証なしでアクセスできるエンドポイント', () => {
    it('/related_articles エンドポイントは認証なしでアクセスできる', async () => {
      // 認証なしのリクエスト
      const request = new Request('http://example.com/related_articles?id=test-article-1');
      const ctx = createMockExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await ctx.waitForAllPromises();

      // レスポンスのステータスコードが200であることを確認
      expect(response.status).toBe(200);

      // レスポンスのJSONを取得
      const responseData = await response.json() as { articles: any[] };

      // レスポンスに関連記事が含まれていることを確認
      expect(responseData).toHaveProperty('articles');
      expect(Array.isArray(responseData.articles)).toBe(true);
    });

    it('/eyecatch エンドポイントは認証なしでアクセスできる', async () => {
      // 認証なしのリクエスト
      const request = new Request('http://example.com/eyecatch?id=test-article-1');
      const ctx = createMockExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await ctx.waitForAllPromises();

      // レスポンスのステータスコードが200であることを確認
      expect(response.status).toBe(200);

      // レスポンスのContent-Typeがimage/pngであることを確認
      expect(response.headers.get('Content-Type')).toBe('image/png');
    });
  });

  describe('認証が必要なエンドポイント', () => {
    it('/register.html エンドポイントは認証なしではアクセスできない', async () => {
      // 認証なしのリクエスト
      const request = new Request('http://example.com/register.html');
      const ctx = createMockExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await ctx.waitForAllPromises();

      // リダイレクトされることを確認（302ステータスコード）
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('http://example.com/');
    });
  });
});
