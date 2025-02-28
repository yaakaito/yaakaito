export async function GET() {
  // ディレクトリ内の全ての .md ファイルを取得
  const blogPosts = Object.values(import.meta.glob<any>('./blog/**/*.md', { eager: true }));
  const notePosts = Object.values(import.meta.glob<any>('./note/**/*.md', { eager: true }));

  // index.md ファイルを除外し、日付順にソート
  const blogs = blogPosts
    .filter((post: any) => !post.file.endsWith('index.md'))
    .sort((a: any, b: any) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());

  const notes = notePosts
    .filter((post: any) => !post.file.endsWith('index.md'))
    .sort((a: any, b: any) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());

  // llms.txt の内容を生成
  const content = `# yaakai.to

このサイトは主に技術的な記事やノートで構成されており、Web 開発者やプログラマー向けの情報を提供しています。コンテンツは不定期に更新されています。

## ブログ記事

${blogs.map((post: any) => `- [${post.frontmatter.title}](https://yaakai.to${post.url}): ${post.frontmatter.emoji || ''} ${post.frontmatter.description || ''}`).join('\n')}

## ノート

${notes.map((post: any) => `- [${post.frontmatter.title}](https://yaakai.to${post.url}): ${post.frontmatter.emoji || ''} ${post.frontmatter.description || ''}`).join('\n')}

## API

- [RSS フィード](https://yaakai.to/rss.xml): 最新の記事を購読するためのフィード
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
