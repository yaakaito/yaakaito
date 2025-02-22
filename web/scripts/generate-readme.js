import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';

async function getLatestPosts(directory, count = 3) {
  const files = await glob(`src/pages/${directory}/**/*.md`);
  const posts = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, 'utf-8');
      const { data } = matter(content);
      return {
        ...data,
        url: `https://yaakai.to${file
          .replace('src/pages', '')
          .replace('.md', '')}`
      };
    })
  );

  return posts
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
}

async function generateReadme() {
  const humans = await readFile('public/humans.txt', 'utf-8');
  const blogs = await getLatestPosts('blog');
  const notes = await getLatestPosts('note');

  const readme = `### Hi there 👋

${humans}

## Latest Blog Posts

${blogs.map(post => `- ${post.emoji} [${post.title}](${post.url}) - ${new Date(post.date).toLocaleDateString()}`).join('\n')}

## Latest Notes

${notes.map(post => `- ${post.emoji} [${post.title}](${post.url}) - ${new Date(post.date).toLocaleDateString()}`).join('\n')}

<!--
**yaakaito/yaakaito** is a ✨ _special_ ✨ repository because its \`README.md\` (this file) appears on your GitHub profile.
-->
`;

  await writeFile('../README.md', readme);
}

generateReadme().catch(console.error);
