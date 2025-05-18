/**
 * このスクリプトは、/workspaces/yaakaito/web/src/pages/blog および
 * /workspaces/yaakaito/web/src/pages/note ディレクトリ内のマークダウンファイルを
 * 解析し、記事データを生成します。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Article } from '../src/articles/types';

// マークダウンファイルを探索するディレクトリパス
const BLOG_DIR = '/workspaces/yaakaito/web/src/pages/blog';
const NOTE_DIR = '/workspaces/yaakaito/web/src/pages/note';
// 出力ファイルのパス
const OUTPUT_FILE = path.resolve('/workspaces/yaakaito/mcp-server/src/articles/generated-articles.ts');

/**
 * ディレクトリを再帰的に探索し、マークダウンファイルのパスを収集します
 */
function findMarkdownFiles(dir: string): string[] {
  let results: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      results = results.concat(findMarkdownFiles(itemPath));
    } else if (item.endsWith('.md')) {
      results.push(itemPath);
    }
  }

  return results;
}

/**
 * フロントマターを解析する関数
 */
function parseFrontMatter(content: string): { frontMatter: Record<string, any>; content: string } {
  // フロントマターのパターン（---で囲まれた部分）
  const frontMatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontMatterPattern);

  if (!match) {
    return {
      frontMatter: {},
      content: content.trim()
    };
  }

  const [, frontMatterStr, contentStr] = match;
  const frontMatter: Record<string, any> = {};

  // フロントマターを行ごとに処理
  const lines = frontMatterStr.split(/\r?\n/);
  for (const line of lines) {
    // key: value の形式を解析
    const keyValueMatch = line.match(/^([^:]+):\s*(.+)\s*$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;

      // 配列の処理（[tag1, tag2]のような形式）
      if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
        const arrayItems = value.substring(1, value.length - 1)
          .split(',')
          .map(item => item.trim().replace(/['"]/g, ''));
        frontMatter[key.trim()] = arrayItems;
      } else {
        frontMatter[key.trim()] = value.trim().replace(/^['"](.*)['"]$/, '$1');
      }
    }
  }

  return {
    frontMatter,
    content: contentStr.trim()
  };
}

/**
 * マークダウンファイルからArticleオブジェクトを生成します
 */
function parseMarkdownFile(filePath: string): Article {
  // ファイルを読み込む
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // フロントマターとコンテンツを解析する
  const { frontMatter: data, content } = parseFrontMatter(fileContent);

  // ファイル名から記事IDを生成する（拡張子を除く）
  const id = path.basename(filePath, '.md');

  // パスを相対パスに変換
  const relativePath = filePath.includes('blog')
    ? path.relative(BLOG_DIR, filePath)
    : path.relative(NOTE_DIR, filePath);

  // 日付情報を取得
  const dateStr = data.date ? data.date.toString() : new Date().toISOString();
  const publishedDate = new Date(dateStr);

  // タグが配列でない場合は配列に変換
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];

  // パスをURLに変換
  const articlePath = filePath.includes('blog')
    ? `/blog/${id}`
    : `/note/${id}`;

  // Articleインターフェースに合わせたオブジェクトを返す
  return {
    id,
    title: data.title || '',
    content: content,
    createdAt: publishedDate.toISOString(), // Date型を文字列に変換
    updatedAt: publishedDate.toISOString(), // Date型を文字列に変換
    publishedAt: publishedDate.toISOString(),
    tags: tags,
    path: articlePath
  };
}

/**
 * メイン処理
 */
function generateArticles() {
  try {
    console.log('ブログとノートの記事を収集しています...');

    // ブログとノートのマークダウンファイルのパスを取得
    const blogPaths = findMarkdownFiles(BLOG_DIR);
    const notePaths = findMarkdownFiles(NOTE_DIR);
    const allPaths = [...blogPaths, ...notePaths];

    console.log(`${allPaths.length}個のマークダウンファイルが見つかりました`);

    // 各ファイルをパースして記事データを生成
    const articles = allPaths.map(filePath => {
      try {
        return parseMarkdownFile(filePath);
      } catch (err) {
        console.error(`${filePath} の解析中にエラーが発生しました:`, err);
        return null;
      }
    }).filter((article): article is Article => article !== null);

    console.log(`${articles.length}個の記事データを生成しました`);

    // TypeScriptファイルを生成
    const tsContent = `// filepath: ${OUTPUT_FILE}
// このファイルは自動生成されています。手動で変更しないでください。
// 生成日時: ${new Date().toISOString()}
import { Article } from './types';

/**
 * 全記事データ
 */
export const articles: Article[] = ${JSON.stringify(articles, null, 2)};`;

    // 出力ディレクトリの存在確認と作成
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // ファイルを書き込む
    fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');

    console.log(`記事データが正常に生成され、${OUTPUT_FILE} に保存されました`);
  } catch (error) {
    console.error('記事データの生成中にエラーが発生しました:', error);
    throw error; // process.exit(1) の代わりにエラーをスローする
  }
}

// スクリプトを実行
generateArticles();
