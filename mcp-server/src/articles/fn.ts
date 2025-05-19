import { articles } from "./__generated-articles";
import { Article } from "./types";

/**
 * 記事IDから記事を取得する
 */
export function getArticleById(id: string): Article | undefined {
  return articles.find(article => article.id === id);
}

/**
 * 全記事を取得する
 */
export function getAllArticles(): Article[] {
  return articles;
}

/**
 * タグで記事をフィルタリングする関数
 */
export function getArticlesByTag(tag: string): Article[] {
  return articles.filter(article => article.tags.includes(tag));
}

/**
 * すべてのタグのリストを取得する関数
 */
export function getAllTags(): string[] {
  const tagsSet = new Set<string>();
  articles.forEach(article => {
    article.tags.forEach(tag => tagsSet.add(tag));
  });
  return Array.from(tagsSet);
}
