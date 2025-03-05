import { defineConfig } from 'astro/config';
import remarkOgpCard from './scripts/remark-ogp-card.js';
import remarkCollapsibleCode from './scripts/remark-collapsible-code.js';

// https://astro.build/config
export default defineConfig({
    site: 'https://yaakai.to',
    markdown: {
        remarkPlugins: [
            remarkOgpCard,
            remarkCollapsibleCode
        ]
    }
});
