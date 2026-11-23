import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://automationworker.io',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // SEO capability (capabilities/experience/seo): /404 and /subscribed/ are not content, so they stay out.
  integrations: [sitemap({ filter: (page) => !/\/(404|subscribed)\/?$/.test(new URL(page).pathname) })],
});
