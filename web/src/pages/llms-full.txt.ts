import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function GET() {
  // ディレクトリ内の全ての .md ファイルのメタデータを取得
  const blogPostsMetadata = Object.entries(import.meta.glob<any>('./blog/**/*.md', { eager: true }));
  const notePostsMetadata = Object.entries(import.meta.glob<any>('./note/**/*.md', { eager: true }));

  // 元の Markdown コンテンツを取得するための関数
  function getOriginalMarkdown(filePath: string): string {
    try {
      // ファイルパスを実際のファイルシステムのパスに変換
      const realPath = filePath.replace(/^\.\//, 'src/pages/');

      console.log(`Original path: ${filePath}`);
      console.log(`Resolved path: ${realPath}`);

      // ファイルが存在するか確認
      if (!fs.existsSync(realPath)) {
        console.error(`File does not exist: ${realPath}`);

        // 現在のディレクトリを確認
        const currentDir = process.cwd();
        console.log(`Current working directory: ${currentDir}`);

        // 絶対パスを試す
        const absolutePath = path.resolve(currentDir, realPath);
        console.log(`Absolute path: ${absolutePath}`);

        if (fs.existsSync(absolutePath)) {
          console.log(`File exists at absolute path: ${absolutePath}`);

          // 絶対パスでファイルを読み込む
          const content = fs.readFileSync(absolutePath, 'utf-8');

          // front matter を除去
          const { content: markdownContent } = matter(content);

          return markdownContent;
        }

        return '';
      }

      // ファイルを読み込む
      const content = fs.readFileSync(realPath, 'utf-8');

      // front matter を除去
      const { content: markdownContent } = matter(content);

      return markdownContent;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return '';
    }
  }

  // index.md ファイルを除外し、日付順にソート
  const blogs = blogPostsMetadata
    .filter(([path, post]) => !path.endsWith('index.md'))
    .map(([path, post]) => ({ path, ...post }))
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());

  const notes = notePostsMetadata
    .filter(([path, post]) => !path.endsWith('index.md'))
    .map(([path, post]) => ({ path, ...post }))
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());

  // llms-full.txt の内容を生成
  let content = `# yaakai.to


このサイトは主に技術的な記事やノートで構成されており、Web 開発者やプログラマー向けの情報を提供しています。コンテンツは不定期に更新され、技術的な正確さを重視しています。記事は主に日本語で書かれていますが、コードサンプルや技術用語は英語が含まれています。

## ブログ記事

`;

  // ブログ記事のリンクと内容を追加
  for (const post of blogs) {
    try {
      // ファイルパスを出力
      console.log(`Blog post:`, post);

      // 元の Markdown コンテンツを取得
      const markdownContent = getOriginalMarkdown(post.file);

      content += `------------\n## ${post.frontmatter.title}\n\n${markdownContent}\n\n`;
    } catch (error) {
      console.error(`Error processing blog post ${post.url}:`, error);
      content += `- [${post.frontmatter.title}](https://yaakai.to${post.url}): ${post.frontmatter.emoji || ''} ${post.frontmatter.description || ''}\n\n`;
    }
  }

  content += `## ノート

`;

  // ノートのリンクと内容を追加
  for (const post of notes) {
    try {
      // ファイルパスを出力
      console.log(`Note:`, post);

      // 元の Markdown コンテンツを取得
      const markdownContent = getOriginalMarkdown(post.file);

      content += `------------\n## ${post.frontmatter.title}\n\n${markdownContent}\n\n`;
    } catch (error) {
      console.error(`Error processing note ${post.url}:`, error);
      content += `- [${post.frontmatter.title}](https://yaakai.to${post.url}): ${post.frontmatter.emoji || ''} ${post.frontmatter.description || ''}\n\n`;
    }
  }

  content += `
------------

## API

- [RSS フィード](https://yaakai.to/rss.xml): 最新の記事を購読するための RSS フィード
- [humans.txt](https://yaakai.to/humans.txt): サイト作者情報

## Optional

- [GitHub リポジトリ](https://github.com/yaakaito/yaakaito): このサイトのソースコード
- [Twitter: @yaakaito](https://twitter.com/yaakaito): 作者の Twitter アカウント
- [GitHub: @yaakaito](https://github.com/yaakaito): 作者の GitHub アカウント
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
