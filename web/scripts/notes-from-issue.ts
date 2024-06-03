// github の issue を全権取得して、markdown として src/pages/note へ配置する
// bun --env-file=.env scripts/notes-from-issue.ts

import fs from 'fs';
import path from 'path';

// 環境変数から GitHub のトークンとリポジトリ情報を取得
const token = process.env.GH_TOKEN;
const owner = 'yaakaito';
const repo = 'yaakaito';

// GitHub の issue を取得する関数
async function fetchIssues() {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?creator=${owner}&state=closed`;
    const headers = {
        'Authorization': `token ${token}`,
        'User-Agent': 'request'
    };

    try {
        const response = await fetch(url, { headers });
        const issues = await response.json();

        // 取得した issue を Markdown ファイルとして保存
        issues.forEach(issue => {
            console.log(issue)
            const filePath = path.join(__dirname, '../src/pages/note', `${issue.number}.md`);
            const content = `---
layout: ../../layouts/blog-post.astro
title: "${issue.title}"
emoji: 🖊
date: ${issue.created_at}
tags:
    - note
---

${issue.body}`;
            console.log(filePath)
            fs.writeFileSync(filePath, content);
        });

        console.log('Issues have been saved as Markdown files.');
    } catch (error) {
        console.error('Error fetching issues:', error);
    }
}

// 関数を実行
fetchIssues();
