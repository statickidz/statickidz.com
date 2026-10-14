# GitHub Pages deployment

`.github/workflows/deploy.yml` verifies pull requests and deploys pushes to `main`. It installs the pinned pnpm version with Node 24, checks Astro, builds, tests the output, runs Playwright/axe accessibility checks, and runs the browser regressions. Only `dist/` is uploaded after every check passes. Reports are retained as the `browser-reports` Actions artifact.

## Activation

1. Push the local `main` branch to `https://github.com/statickidz/statickidz.com`.
2. In repository Settings → Pages, select **GitHub Actions** as the source.
3. Set the custom domain to `statickidz.com`. Keep `public/CNAME` and the Astro `site` setting aligned.
4. Configure the domain's DNS for GitHub Pages, then enable HTTPS when available.
5. Check the Actions run and verify the homepage, policy links, CV downloads, and a missing URL after deployment.

See [GitHub's custom domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

The site assumes its existing custom domain. Serving it under `/statickidz.com/` on the default repository URL requires changing the base path and root-relative links.

## Optional legacy redirects

`cloudflare-redirects.csv` supplies exact 301 mappings for old about/contact and sitemap paths. Import it into Cloudflare Bulk Redirects and enable the rules if Cloudflare serves this domain. Committing the file does not activate redirects; GitHub Pages does not consume it. There is no wildcard redirect to the homepage.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify
pnpm test:a11y
```

The accessibility command starts and stops its own preview server on port 4322. Leave that port free for the tests. For browser regressions, start `pnpm preview` in another terminal and run `pnpm test:browser`. Automated checks cover desktop/mobile pages, open navigation and command-error states, keyboard interaction, and no-JavaScript navigation. They supplement manual accessibility assessment.
