import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const output = new URL('../dist/', import.meta.url);
const read = (path) => readFileSync(new URL(path, output), 'utf8');

test('SEO metadata, profile data and sitemap describe the published site', () => {
  const locations = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locations.length, 3);
  const titles = new Set();
  const descriptions = new Set();
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, 'https://statickidz.com');
    assert.equal(url.hash, '');
    const html = read(url.pathname === '/' ? 'index.html' : `${url.pathname.slice(1)}index.html`);
    assert.match(html, new RegExp(`rel="canonical" href="${location}"`));
    assert.doesNotMatch(html, /content="noindex/);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    const description = html.match(/name="description" content="([^"]+)"/)[1];
    assert.ok(title.length > 10 && title.length < 80);
    assert.ok(description.length > 20);
    titles.add(title);
    descriptions.add(description);
    assert.match(html, /property="og:image" content="https:\/\/statickidz.com\/social-card.png"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
  }
  assert.equal(titles.size, 3);
  assert.equal(descriptions.size, 3);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/statickidz.com\/sitemap.xml/);
  const data = JSON.parse(read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const profile = data['@graph'].find((entry) => entry['@type'] === 'ProfilePage');
  assert.equal(profile.mainEntity['@type'], 'Person');
  assert.equal(profile.mainEntity.name, 'Adrián Barrio Andrés');
  assert.deepEqual(profile.mainEntity.sameAs, ['https://github.com/statickidz', 'https://www.linkedin.com/in/adrianbarrio']);
  const image = readFileSync(new URL('social-card.png', output));
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.match(read('404.html'), /content="noindex, follow"/);
});

test('all external website links open safely in a new tab', () => {
  const pages = readdirSync(output, { recursive: true }).filter((path) => path.endsWith('.html'));
  let count = 0;
  for (const path of pages) {
    for (const [tag] of read(path.replaceAll('\\', '/')).matchAll(/<a\b[^>]*href="https?:\/\/[^"\s]+"[^>]*>/g)) {
      assert.match(tag, /target="_blank"/, `${path}: ${tag}`);
      assert.match(tag, /rel="[^"]*\bnoopener\b[^"]*"/);
      assert.match(tag, /rel="[^"]*\bnoreferrer\b[^"]*"/);
      count++;
    }
  }
  assert.ok(count > 0, 'external links are present and checked');
});

test('the personal page provides identity and real contact destinations without a showcase', () => {
  const html = read('index.html');
  assert.match(html, /Adrián Barrio Andrés/);
  assert.match(html, /lang="en"/);
  assert.doesNotMatch(html, /mailto:|statickidz@gmail\.com/);
  assert.match(html, /href="https:\/\/github\.com\/statickidz"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/adrianbarrio"/);
  assert.match(html, /id="about"/);
  assert.match(html, /id="contact"/);
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.doesNotMatch(html, /href="[^" ]*(?:\/blog|\/proyectos|\/feed|wp-content)/i);
});

test('the published artifact excludes WordPress, blog archives, and private files', () => {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(relative(fileURLToPath(output), path).replaceAll('\\', '/'));
    }
  }
  walk(fileURLToPath(output));
  for (const path of files) {
    assert.doesNotMatch(path, /(?:^|\/)(?:wp-[^/]*|blog|feed|tag|author|backups|inet|\.git|\.mysql)(?:\/|$)|\.(?:php|sql|env)$/i);
  }
  assert.ok(files.length > 0);
});

test('retired routes are missing and old profile links redirect only to the correct sections', () => {
  assert.ok(existsSync(new URL('404.html', output)));
  assert.ok(!existsSync(new URL('blog/index.html', output)));
  assert.ok(!existsSync(new URL('diseno/como-abrir-archivos-sketchapp-en-windows/index.html', output)));
  const redirects = readFileSync(new URL('../deploy/cloudflare-redirects.csv', import.meta.url), 'utf8');
  const rows = redirects.trim().split(/\r?\n/).map((line) => line.split(','));
  assert.ok(rows.length >= 1);
  assert.equal(new Set(rows.map(([source]) => source)).size, rows.length, 'unique redirect sources');
  for (const [source, destination, status, query, subdomains, subpaths, suffix] of rows) {
    assert.equal(status, '301');
    assert.equal(subdomains, 'FALSE');
    assert.equal(subpaths, 'FALSE');
    assert.equal(suffix, 'FALSE');
    const from = new URL(`https://${source}`);
    const to = new URL(destination);
    assert.ok(['statickidz.com', 'www.statickidz.com'].includes(from.hostname));
    assert.equal(to.origin, 'https://statickidz.com');
    if (from.pathname.startsWith('/about')) {
      assert.equal(to.pathname + to.hash, '/#about');
      assert.equal(query, 'TRUE');
    } else if (from.pathname.startsWith('/contactar')) {
      assert.equal(to.pathname + to.hash, '/#contact');
      assert.equal(query, 'TRUE');
    } else {
      assert.ok(['/sitemap_index.xml', '/page-sitemap.xml'].includes(from.pathname));
      assert.equal(to.pathname, '/sitemap.xml');
      assert.equal(query, 'FALSE');
    }
  }
  assert.ok(!existsSync(new URL('_redirects', output)), 'no unsupported Netlify redirect file');
  assert.match(read('404.html'), /noindex/);
});

test('GitHub Pages output preserves the custom domain and original CV URLs', () => {
  assert.equal(read('CNAME').trim(), 'statickidz.com');
  assert.ok(existsSync(new URL('.nojekyll', output)));
  for (const path of ['adrian_barrio_andres_cv.pdf', 'adrian_barrio_andres_cv_en.pdf']) {
    assert.deepEqual(readFileSync(new URL(path, output)), readFileSync(new URL(`../public/${path}`, import.meta.url)));
  }
  const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /run: pnpm verify/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/main'/);
});

test('the source tree no longer contains the legacy WordPress installation or export', () => {
  for (const path of ['wp-admin', 'wp-content', 'wp-includes', 'www', '.mysql', 'replace', 'index.php', 'wp-config.php', 'wp-login.php', 'xmlrpc.php', 'docker-compose.yml', '.htaccess']) {
    assert.ok(!existsSync(new URL(`../${path}`, import.meta.url)), `${path} has been removed`);
  }
});

test('site privacy and cookies describe the new static site', () => {
  assert.match(read('politica-de-privacidad/index.html'), /info@statickidz\.com/);
  assert.match(read('politica-de-cookies/index.html'), /does not use cookies/i);
  assert.doesNotMatch(read('politica-de-privacidad/index.html'), /Hubspot|Mailchimp|Smartlook|Gravatar/i);
});

test('the grimoire provides a personal heading and an accessible decorative seal', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /<h1[^>]*>statickidz<\/h1>/);
  assert.match(html, /<h1[^>]*class="identity"[^>]*>Adrián Barrio Andrés<\/h1>/);
  assert.match(html, /class="seal-art"[^>]*aria-hidden="true"/);
  assert.match(html, /class="sigil"[^>]*viewBox="0 0 360 360"/);
});

test('the seal animates automatically without a pause control or hidden personal content', () => {
  const html = read('index.html');
  assert.match(html, /class="intro-copy"/);
  assert.doesNotMatch(html, /motion-control|Pause motion|Resume motion/);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter((match) => !match[1].includes('application/ld+json'));
  assert.ok(scripts.length >= 1);
  assert.match(scripts[0][1], /type="module"/);
  const source = scripts[0][1].match(/src="([^"]+)"/);
  if (source) assert.match(source[1], /^\/_astro\/[^/]+\.js$/);
  assert.doesNotMatch(scripts[0][2], /\bfetch\s*\(|localStorage|document\.cookie/);
  assert.match(html, /My journey has taken me/);
  assert.match(html, /Adrián Barrio Andrés/);
});

test('the career narrative and community links reflect the approved brief', () => {
  const html = read('index.html');
  assert.match(html, /Senior Site Reliability Engineer at Oracle/);
  assert.match(html, /id="journey"/);
  assert.match(html, /Engineering leadership/);
  assert.match(html, /Web &amp; mobile/);
  assert.match(html, /id="community"/);
  assert.match(html, /href="https:\/\/cloudnativerioja\.com\/"/);
  assert.match(html, /href="https:\/\/agenticrioja\.com\/"/);
  assert.match(html, /Community Organizer/);
  assert.match(html, /Model Context Protocol/);
  assert.match(html, /AGENTS\.md/);
  assert.match(html, /AI-assisted engineering/);
  assert.doesNotMatch(html, /Ambassador|foundation leader|2014–Now/i);
});

test('the terminal menu offers native disclosure links without JavaScript', () => {
  const html = read('index.html');
  const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  for (const section of ['about', 'journey', 'certifications', 'community', 'contact']) {
    assert.match(nav, new RegExp(`href="/#${section}"`));
  }
  assert.doesNotMatch(nav, /<button|<details/);
  assert.match(html, /<details class="terminal-menu"/);
  assert.match(html, /Available commands/);
});

test('certifications show the verified titles, issuers, and issue dates', () => {
  const html = read('index.html');
  assert.match(html, /id="certifications"/);
  assert.match(html, /OCI AI Foundations Associate/);
  assert.match(html, /OCI Foundations Associate/);
  assert.match(html, /Kubernetes Advanced Ops/);
  assert.match(html, /Government of La Rioja/);
  for (const date of ['2026-04', '2025-03', '2023-07']) {
    assert.match(html, new RegExp(`datetime="${date}"`));
  }
});

test('every published page uses English metadata, navigation, and visible copy', () => {
  const files = readdirSync(output, { recursive: true }).filter((path) => path.endsWith('.html'));
  for (const path of files) {
    const html = read(path.replaceAll('\\', '/'));
    assert.match(html, /<html lang="en"/);
    assert.match(html, /Skip to content/);
    assert.match(html, /aria-label="Legal information"/);
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), /Saltar al contenido|Política de|Desarrollador de software|Ruta no encontrada|Volver a|Consultar la|Si tienes/);
  }
  assert.match(read('404.html'), /Path not found/);
});
