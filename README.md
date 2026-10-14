# statickidz.com

Personal website for Adrián Barrio Andrés. Astro generates a static English site with a short introduction, a compact IT career narrative, community involvement in Cloud Native Rioja and AAIF, and direct contact links. No backend, blog, project showcase, or analytics. A small optional script controls the decorative seal animation; all content and navigation work with JavaScript disabled.

## Development

Use Node 24 and pnpm 11.25.0 (the package manager pinned in `package.json`).

```sh
corepack enable
pnpm install
pnpm dev
```

## Verification and preview

```sh
pnpm verify
pnpm test:a11y
pnpm preview
```

`verify` checks Astro/TypeScript, builds the site, and tests the generated output. The tests require a completed build. `test:a11y` starts its own preview server on port 4322 and runs Playwright/axe automated WCAG A/AA scans, keyboard checks, and no-JavaScript navigation at desktop/mobile sizes. Reports are saved under `playwright-report/` and `test-results/`. Leave port 4322 free for the test server. Automated checks supplement manual accessibility assessment.

For browser checks, install Playwright's browser once with `pnpm exec playwright install chromium`, run `pnpm preview`, then run `pnpm test:browser`. Set `BROWSER_EXECUTABLE` to use an existing Chrome/Edge binary instead. Screenshots and the browser report are saved under `.verification/` (ignored by Git).

## Deployment

GitHub Pages hosts **only `dist/`** at `https://statickidz.com`. `.github/workflows/deploy.yml` runs build/output, Playwright browser, and accessibility checks before deploying from `main` using the official Pages actions. Pull requests run checks without deployment. Select GitHub Actions in the repository Pages settings and configure the custom domain; `public/CNAME` preserves it in the build. No backend or adapter is required.

The publish directory contains the personal site, a 404 page, two website privacy/cookie pages, and CV PDFs at their existing URLs. Optional Cloudflare rules provide HTTP 301 redirects for old about/contact URLs and replaced sitemap URLs. Import and enable `deploy/cloudflare-redirects.csv` in Cloudflare Bulk Redirects; committing it does not activate the rules. GitHub Pages cannot consume Netlify `_redirects` files. Unknown URLs return 404; there is no home-page catch-all redirect. See [deployment and activation instructions](deploy/README.md).

Use `pnpm dev` for the current website. Local development and verification commands do not deploy the site.

## Editing

Basic SEO includes unique page titles/descriptions, HTTPS canonical URLs, a crawlable sitemap/robots file, a noindex 404, Open Graph/Twitter metadata and homepage Person/ProfilePage structured data. `public/social-card.png` is the 1200×630 sharing image. Local checks do not establish live indexing or rich-result eligibility.

- `src/pages/index.astro`: identity, career narrative, community, contact links.
- `src/styles/global.css`: colors, typography, spacing, responsive layout.
- `src/layouts/Layout.astro`: shared header/footer and page metadata.
- `PRODUCT.md`: confirmed audiences, purpose, and scope.
- `tests/accessibility/site.spec.mjs`: accessibility and keyboard checks.
- `deploy/cloudflare-redirects.csv`: exact legacy URL mappings for Cloudflare HTTP 301 responses.
- `.github/workflows/deploy.yml`: verified GitHub Pages build and deployment.

The three requested design skills are project-local under `.agents/skills/`, with their sources recorded in `skills-lock.json`.
