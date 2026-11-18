import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://automationworker.io',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
