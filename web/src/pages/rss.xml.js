import rss,  { pagesGlobToRssItems } from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';

export async function GET(context) {
    // ディレクトリ内の全ての .md ファイルを取得
    const blogPosts = Object.values(import.meta.glob('./blog/**/*.md', { eager: true }));
    const notePosts = Object.values(import.meta.glob('./note/**/*.md', { eager: true }));

    const items = [];
    for (const post of [...blogPosts, ...notePosts]) {
        const content = await post.compiledContent();
        items.push({
            link: post.url,
            title: post.frontmatter.title,
            content: sanitizeHtml(content),
            pubDate: new Date(post.frontmatter.date).toISOString(),
        });
    }
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    return rss({
        // 出力されるXMLの`<title>`フィールド
        title: 'yaakai.to',
        // 出力されるXMLの`<description>`フィールド
        description: 'yaakaito\'s weblog',
        // エンドポイントのコンテキストからプロジェクトの"site"を取得
        // https://docs.astro.build/ja/reference/api-reference/#contextsite
        site: context.site,
        // 出力されるXMLの<item>の
        // コンテンツコレクションやglobインポートを利用した例については「`items`の生成」セクションをご覧ください
        items,
        // (任意) カスタムXMLを挿入
        customData: `<language>ja-jp</language>`,
    });
}
