import fs from 'fs/promises';
import path from 'path';

interface Article {
    id: string;
    url: string;
    title: string;
    emoji: string;
    content: string;
}

interface ArticleMetadata {
    title: string;
    emoji: string;
    content: string;
}

function convertMarkdownToPlainText(markdown: string): string {
    return markdown
        // コードブロックを削除
        .replace(/```[\s\S]*?```/g, '')
        // インラインコードを削除
        .replace(/`[^`]*`/g, '')
        // リンクを削除 [text](url) -> text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // 画像を削除 ![alt](url)
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        // 見出しの # を削除
        .replace(/^#{1,6}\s+/gm, '')
        // 太字と斜体を削除
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        // リストの * - + を削除
        .replace(/^[*\-+]\s+/gm, '')
        // 番号付きリストの数字を削除
        .replace(/^\d+\.\s+/gm, '')
        // 水平線を削除
        .replace(/^[\-*_]{3,}\s*$/gm, '')
        // 余分な空行を削除して整形
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join(' ')
        .trim();
}

function extractMetadataFromMarkdown(content: string): ArticleMetadata {
    // titleをダブルクォートありとなしの両方のパターンに対応
    const titleMatch = content.match(/title:\s*"([^"]+)"|title:\s*([^\n]+)/);
    const emojiMatch = content.match(/emoji:\s*([^\n]+)/);
    // titleMatch[1]はクォートあり、titleMatch[2]はクォートなしの場合にマッチ
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
    const emoji = emojiMatch ? emojiMatch[1].trim() : '';

    // フロントマターを除去（---で囲まれた部分を削除）
    const bodyContent = content.replace(/---\n[\s\S]*?\n---/, '').trim();

    // Markdownをプレーンテキストに変換
    const plainText = convertMarkdownToPlainText(bodyContent);

    // 本文を400文字程度に制限
    const truncatedContent = plainText.length > 400
        ? plainText.slice(0, 400) + '...'
        : plainText;

    return {
        title,
        emoji,
        content: truncatedContent
    };
}

async function registerArticle(article: Article, apiKey: string) {
    const response = await fetch('https://articles.yaakai.to/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify(article)
    });

    if (!response.ok) {
        throw new Error(`Failed to register article ${article.id}: ${await response.text()}`);
    }
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await findMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }

    return files;
}

async function main() {
    const apiKey = process.env.ARTICLES_API_KEY;
    if (!apiKey) {
        throw new Error('ARTICLES_API_KEY is not set');
    }

    // blog記事の登録
    const blogFiles = await findMarkdownFiles('src/pages/blog');
    for (const file of blogFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative('src/pages/blog', file);
        const fileName = path.basename(relativePath, '.md');
        const parentDir = path.dirname(relativePath);
        const id = `blog-${fileName}`;
        const url = `https://yaakai.to/blog/${parentDir}/${fileName}`;
        const metadata = extractMetadataFromMarkdown(content);

        await registerArticle({
            id,
            url,
            title: metadata.title,
            emoji: metadata.emoji,
            content: metadata.content
        }, apiKey);
        console.log(`Registered blog article: ${id}`);
    }

    // note記事の登録
    const noteFiles = await findMarkdownFiles('src/pages/note');
    for (const file of noteFiles) {
        if (file.endsWith('index.md')) continue;

        const content = await fs.readFile(file, 'utf-8');
        const fileName = path.basename(file, '.md');
        const id = `note-${fileName}`;
        const url = `https://yaakai.to/note/${fileName}`;
        const metadata = extractMetadataFromMarkdown(content);

        await registerArticle({
            id,
            url,
            title: metadata.title,
            emoji: metadata.emoji,
            content: metadata.content
        }, apiKey);
        console.log(`Registered note article: ${id}`);
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
