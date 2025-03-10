import { defineConfig } from 'vitest/config';

/**
 * 注意: 元々は @cloudflare/vitest-pool-workers を使用していましたが、
 * AI バインディングに関連するエラーが発生したため、標準の Node.js 環境に切り替えました。
 *
 * エラー内容:
 * "wrapped binding module can't be resolved (internal modules only);
 * moduleName = miniflare-internal:wrapped:__WRANGLER_EXTERNAL_AI_WORKER"
 *
 * 参考記事: https://zenn.dev/mshaka/articles/40bc91c7e7acc2
 * この記事によると、@cloudflare/vitest-pool-workers は vitest > 1.6.0 では
 * 動作しないという制約もあります。
 *
 * 将来的に AI バインディングのモックが必要になった場合や、
 * より本番環境に近いテスト環境が必要になった場合は、
 * unstable_dev API の使用も検討する価値があります。
 */
export default defineConfig({
  test: {
    environment: 'node',
  },
});
