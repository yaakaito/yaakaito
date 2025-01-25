import fs from 'fs';
import path from 'path';

const token = process.env.GH_TOKEN;
const owner = 'yaakaito';
const repo = 'yaakaito';

async function fetchIssues() {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?creator=${owner}&state=closed`;
    const headers = {
        'Authorization': `token ${token}`,
        'User-Agent': 'request'
    };

    try {
        const response = await fetch(url, { headers });
        const issues = await response.json();

        issues.forEach(issue => {
            const hasNoteLabel = issue.labels.some(label => label.name === 'Note');
            const hasWorkspaceLabel = issue.labels.some(label => label.name === 'Workspace');

            if (hasWorkspaceLabel) {
                console.log(`Ignoring issue #${issue.number} with Workspace label`);
                return;
            }

            if (hasNoteLabel) {
                const filePath = path.join(__dirname, '../content/note', `${issue.number}.md`);
                const content = `---
layout: ../../layouts/blog-post.astro
title: "${issue.title}"
emoji: 🖊
date: ${issue.created_at}
tags:
    - note
---

${issue.body}`;
                fs.writeFileSync(filePath, content);
            }
        });

        console.log('Issues have been saved as Markdown files.');
    } catch (error) {
        console.error('Error fetching issues:', error);
    }
}

fetchIssues();
