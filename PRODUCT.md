# statickidz.com

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Engineering peers and community members, recruiters, and potential collaborators are equally important audiences. Visitors should understand Adrián's work and find a way to connect.

## Product Purpose

An English personal website for Adrián Barrio Andrés, known as statickidz, presenting his engineering career, credentials, and community involvement. Success means visitors understand his background and can reach his GitHub or LinkedIn profile.

## Operating Context

Visitors read the introduction, career journey, certifications, and community notes, then follow direct profile or community links. The site supports desktop and mobile browsers.

## Capabilities and Constraints

- Preserve the confirmed scope: personal introduction, career, credentials, community, and GitHub/LinkedIn contact.
- No blog, project gallery, backend, or analytics.
- Content and navigation remain usable without JavaScript.
- English content and policy URLs (`/privacy/` and `/cookies/`); preserve old Spanish links through exact Cloudflare redirects.
- Astro generates static files for GitHub Pages at the custom domain statickidz.com. Only `dist/` is published.
- Keep the existing CV PDF URLs and the website's general privacy and cookie pages.
- GitHub Pages preparation includes Playwright accessibility checks before deployment from `main`.

## Brand Commitments

Use the real name Adrián Barrio Andrés and the statickidz handle. Preserve the existing approved identity recorded in DESIGN.md. Keep copy factual; do not invent personal accomplishments, dates, testimonials, or credential verification links.

## Evidence on Hand

The current site copy is in `src/pages/index.astro`; it records the Oracle role, career narrative, three certifications, Cloud Native Rioja, and Agentic Rioja. Existing CVs and the domain declaration are in `public/`. These assets are repository evidence, not fresh external verification of current roles or credentials.

## Product Principles

- Give all confirmed audiences a clear path to understanding the person and connecting.
- Prefer a compact, factual narrative over an expanded portfolio.
- Preserve static delivery, privacy, and usable navigation without JavaScript.
- Keep personal claims grounded in supplied evidence.

## Accessibility & Inclusion

Preserve keyboard navigation, visible focus, a skip link, reduced-motion behavior, and mobile usability. Run automated WCAG A/AA checks with Playwright and axe alongside the existing browser checks; automated scans alone do not establish full accessibility conformance.
