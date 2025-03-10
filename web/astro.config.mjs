import { defineConfig } from 'astro/config';
import remarkOgpCard from './scripts/remark-ogp-card.js';

// https://astro.build/config
export default defineConfig({
    site: 'https://yaakai.to',
    markdown: {
        remarkPlugins: [
            remarkOgpCard
        ]
    }
});
