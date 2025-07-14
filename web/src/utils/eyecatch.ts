/**
 * 汎用アイキャッチ画像の色を選択するユーティリティ関数
 * URLに基づいて固定の色を選択します
 */

const GENERIC_EYECATCH_COLORS = ['red', 'blue', 'orange'] as const;

/**
 * URLからパス部分のみを抽出し、末尾にスラッシュを追加
 * @param url - 処理対象のURL
 * @returns 正規化されたパス名
 */
function normalizePathname(url: string): string {
  let pathname = url.startsWith('/') ? url : new URL(url, 'http://dummy').pathname;
  if (!pathname.endsWith('/')) {
    pathname = `${pathname}/`;
  }
  return pathname;
}

/**
 * URLに基づいて汎用アイキャッチ画像の色を選択
 * @param url - 処理対象のURL
 * @returns 選択された色 ('red' | 'blue' | 'orange')
 */
export function getGenericEyecatchColor(url: string): typeof GENERIC_EYECATCH_COLORS[number] {
  const pathname = normalizePathname(url);
  const index = Math.abs(
    Array.from(pathname).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % GENERIC_EYECATCH_COLORS.length;
  return GENERIC_EYECATCH_COLORS[index];
}

/**
 * 汎用アイキャッチ画像のURLを生成
 * @param url - 処理対象のURL
 * @returns 汎用アイキャッチ画像のURL
 */
export function getGenericEyecatchUrl(url: string): string {
  const color = getGenericEyecatchColor(url);
  return `https://articles.yaakai.to/common/${color}.png`;
}