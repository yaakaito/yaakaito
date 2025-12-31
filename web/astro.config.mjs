import { defineConfig } from 'astro/config';
import remarkOgpCard from './scripts/remark-ogp-card.js';
import remarkAlert from 'remark-github-blockquote-alert';

// https://astro.build/config
export default defineConfig({
    site: 'https://yaakai.to',
    markdown: {
        remarkPlugins: [
            remarkOgpCard,
            remarkAlert
        ]
    }
});
