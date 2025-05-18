/**
 * 記事を表す型定義
 */
export interface Article {
  /** 記事のID（ファイル名から生成） */
  id: string;
  /** 記事のタイトル */
  title: string;
  /** 記事の内容（Markdown） */
  content: string;
  /** 記事の作成日時 */
  createdAt: Date | string;
  /** 記事の更新日時 */
  updatedAt: Date | string;
  /** 記事の公開日時 */
  publishedAt?: string;
  /** 記事のタグ */
  tags: string[];
  /** 記事のパス */
  path: string;
}
