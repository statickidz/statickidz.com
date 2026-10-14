import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://statickidz.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
