import type { MarkdownInstance } from "astro";

export interface PostFrontmatter {
  title: string;
  date: string;
  emoji: string;
  eyecatch?: string;
  tags?: string[];
}

export interface Post {
  frontmatter: PostFrontmatter;
  url: string;
  rawContent: () => string;
}

/** 新しい順に並べた投稿一覧にする */
export function sortPosts(posts: MarkdownInstance<PostFrontmatter>[]): Post[] {
  return posts
    .map((post) => ({
      frontmatter: post.frontmatter,
      url: post.url ?? "",
      rawContent: post.rawContent,
    }))
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());
}

// 日付だけの frontmatter は UTC 0 時として解釈されるため、日本時間で日付を取り出す
const dateParts = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function partsOf(date: string | Date) {
  const parts = Object.fromEntries(
    dateParts.formatToParts(new Date(date)).map(({ type, value }) => [type, value]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** サイト全体で使う日付表記（YYYY/MM/DD） */
export function formatDate(date: string | Date): string {
  const { year, month, day } = partsOf(date);
  return `${year}/${month}/${day}`;
}

/** 年ごとにまとめた一覧で使う日付表記（MM/DD） */
export function formatMonthDay(date: string | Date): string {
  const { month, day } = partsOf(date);
  return `${month}/${day}`;
}

export function yearOf(date: string | Date): string {
  return partsOf(date).year;
}

/** Markdown 本文の冒頭から、記法を取り除いた抜粋を作る */
export function excerptOf(markdown: string, length = 110): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
