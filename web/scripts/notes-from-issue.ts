import fs from 'fs';
import path from 'path';

// GitHub APIのIssueの型定義
interface GitHubLabel {
    name: string;
    [key: string]: any;
}

interface GitHubIssue {
    number: number;
    title: string;
    body: string;
    created_at: string;
    labels: GitHubLabel[];
    [key: string]: any;
}

const token = process.env.GH_TOKEN;
const owner = 'yaakaito';
const repo = 'yaakaito';

async function fetchIssues() {
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
    const params = new URLSearchParams({
        creator: owner,
        state: 'closed',
        per_page: '100' // 1ページあたりの最大数を指定
    });
    const headers = {
        'Authorization': `token ${token}`,
        'User-Agent': 'request'
    };

    try {
        let page = 1;
        let hasMoreIssues = true;
        let allIssues: GitHubIssue[] = [];

        // すべてのページを取得するまでループ
        while (hasMoreIssues) {
            console.log(`Fetching page ${page}...`);
            const url = `${baseUrl}?${params.toString()}&page=${page}`;
            const response = await fetch(url, { headers });

            if (!response.ok) {
                throw new Error(`GitHub API responded with status: ${response.status}`);
            }

            const issues = await response.json() as GitHubIssue[];

            // 結果が空の場合、ループを終了
            if (issues.length === 0) {
                hasMoreIssues = false;
            } else {
                allIssues = allIssues.concat(issues);
                page++;
            }
        }

        console.log(`Total issues fetched: ${allIssues.length}`);

        // 取得したすべてのIssueを処理
        allIssues.forEach(issue => {
            const hasNoteLabel = issue.labels.some((label: GitHubLabel) => label.name === 'Note');
            const hasWorkspaceLabel = issue.labels.some((label: GitHubLabel) => label.name === 'Workspace');

            if (hasWorkspaceLabel) {
                console.log(`Ignoring issue #${issue.number} with Workspace label`);
                return;
            }

            if (hasNoteLabel) {
                // 絵文字を検出する正規表現（絵文字の後の空白も含む）
                const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
                const match = issue.title.match(emojiRegex);
                
                let emoji = '🖊'; // デフォルトの絵文字
                let title = issue.title;
                
                // タイトルの1文字目が絵文字の場合
                if (match) {
                    // 絵文字部分のみを抽出（空白は含まない）
                    const emojiMatch = match[0].match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
                    if (emojiMatch) {
                        emoji = emojiMatch[0];
                        // タイトルから絵文字とその後の空白を削除
                        title = issue.title.substring(match[0].length);
                    }
                }
                
                const filePath = path.join(__dirname, '../src/pages/note', `${issue.number}.md`);
                const content = `---
layout: ../../layouts/blog-post.astro
title: "${title}"
emoji: ${emoji}
date: ${issue.created_at}
tags:
    - note
---

${issue.body}`;
                fs.writeFileSync(filePath, content);
                console.log(`Saved issue #${issue.number} as Markdown file`);
            }
        });

        console.log('All issues have been saved as Markdown files.');
    } catch (error) {
        console.error('Error fetching issues:', error);
    }
}

fetchIssues();
