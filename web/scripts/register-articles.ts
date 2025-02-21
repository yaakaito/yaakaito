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

function extractMetadataFromMarkdown(content: string): ArticleMetadata {
    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    const emojiMatch = content.match(/emoji:\s*([^\n]+)/);
    const title = titleMatch ? titleMatch[1] : '';
    const emoji = emojiMatch ? emojiMatch[1].trim() : '';

    // フロントマターを除去（---で囲まれた部分を削除）
    const bodyContent = content.replace(/---\n[\s\S]*?\n---/, '').trim();

    // 本文を400文字程度に制限
    const truncatedContent = bodyContent.length > 400
        ? bodyContent.slice(0, 400) + '...'
        : bodyContent;

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
        const id = `blog-${fileName}`;
        const url = `https://yaakaito.github.io/blog/${fileName}`;
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
        const url = `https://yaakaito.github.io/note/${fileName}`;
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
