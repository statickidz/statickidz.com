import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
});
const directory = new URL('../.verification/', import.meta.url);
await mkdir(directory, { recursive: true });
const report = [];

try {
  for (const width of [1440, 946, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, javaScriptEnabled: false });
    const page = await context.newPage();
    const failedAssets = [];
    page.on('response', (response) => { if (response.status() >= 400) failedAssets.push(response.url()); });
    assert.equal((await page.goto(base)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').innerText(), 'Adrián Barrio Andrés');
    assert.equal(await page.locator('.identity').innerText(), 'Adrián Barrio Andrés');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.match(await page.locator('.role').innerText(), /Senior Site Reliability Engineer at Oracle/);
    assert.equal(await page.locator('#journey h3').count(), 5);
    assert.match(await page.locator('#journey').innerText(), /AI-assisted engineering/);
    assert.equal(await page.locator('.header-nav a').count(), 5);
    assert.equal(await page.locator('#certifications .credential').count(), 3);
    assert.equal(await page.locator('#community a[href="https://agenticrioja.com/"]').count(), 1);
    assert.equal(await page.locator('a[href^="mailto:"]').count(), 0);
    assert.equal(await page.locator('#contact a[href="https://github.com/statickidz"]').count(), 1);
    assert.equal(await page.locator('#contact a[href="https://www.linkedin.com/in/adrianbarrio"]').count(), 1);

    const metrics = await page.evaluate(() => {
      const heading = document.querySelector('h1');
      const style = getComputedStyle(heading);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const luminance = (color) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((value) => {
          const s = value / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const ground = luminance(getComputedStyle(document.body).backgroundColor);
      const contrast = Object.fromEntries(['.bio', '.bio p + p', '.role', '.nav-link', '.site-footer', '.link-label'].map((selector) => {
        const ink = luminance(getComputedStyle(document.querySelector(selector)).color);
        return [selector, (Math.max(ground, ink) + 0.05) / (Math.min(ground, ink) + 0.05)];
      }));
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        headingLines: Math.round(heading.getBoundingClientRect().height / parseFloat(style.lineHeight)),
        fontLoaded: document.fonts.check('16px "IBM Plex Mono"'),
        sectionGaps: ['#journey', '#certifications', '#community', '#contact'].map((selector) => parseFloat(getComputedStyle(document.querySelector(selector)).marginTop)),
        bioGap: parseFloat(getComputedStyle(document.querySelector('.bio')).marginTop),
        contrast,
      };
    });
    assert.ok(metrics.documentWidth <= width, `no horizontal overflow at ${width}px`);
    assert.equal(metrics.headingLines, 1);
    assert.ok(metrics.fontLoaded, 'self-hosted font loaded');
    assert.ok(metrics.sectionGaps.every((gap) => gap <= 48), 'compact section spacing');
    assert.ok(metrics.bioGap <= 24, 'identity and biography stay grouped');
    for (const [selector, ratio] of Object.entries(metrics.contrast)) assert.ok(ratio >= 4.5, `${selector} contrast ${ratio}`);
    assert.deepEqual(failedAssets, [], 'all page assets load');
    assert.deepEqual(await context.cookies(), [], 'no cookies');

    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('class'), 'skip-link');
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash, '#main');
    await page.keyboard.press('Tab');
    const focus = await page.locator(':focus').evaluate((element) => ({ outline: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
    assert.equal(focus.outline, 'solid');
    assert.equal(focus.width, '2px');
    await page.locator(':focus').blur();
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: new URL(`home-${width}.png`, directory).pathname.replace(/^\/([A-Z]:)/i, '$1'), fullPage: true });
    report.push(metrics);
    await context.close();
  }

  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator('.contact-link').first().hover();
  assert.equal(await page.locator('.contact-link svg').first().evaluate((element) => getComputedStyle(element).transform), 'none');
  assert.equal(await page.locator('.contact-link svg').first().evaluate((element) => getComputedStyle(element).transitionDuration), '0s');
  assert.equal(await page.locator('.seal-orbit').evaluate((element) => getComputedStyle(element).animationName), 'none');
  assert.equal(await page.locator('.sigil-core').evaluate((element) => getComputedStyle(element).animationName), 'none');
  for (const selector of ['.seal-diamond', '.seal-satellites', '.seal-echo']) {
    assert.equal(await page.locator(selector).evaluate((element) => getComputedStyle(element).animationName), 'none');
  }
  assert.equal(await page.locator('.motion-control').count(), 0);

  for (const route of ['/privacy/', '/cookies/']) {
    assert.equal((await page.goto(`${base}${route}`)).status(), 200);
    assert.equal(await page.locator('h1').count(), 1);
    assert.ok(await page.locator('main').innerText());
  }
  for (const route of ['/blog/', '/diseno/como-abrir-archivos-sketchapp-en-windows/', '/wp-login.php']) {
    assert.equal((await page.goto(`${base}${route}`)).status(), 404);
    assert.match(await page.locator('main').innerText(), /Path not found/);
  }
  await page.screenshot({ path: new URL('404.png', directory).pathname.replace(/^\/([A-Z]:)/i, '$1'), fullPage: true });
  await context.close();

  const motionContext = await browser.newContext({ viewport: { width: 946, height: 956 }, reducedMotion: 'no-preference' });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(base);
  await motionPage.waitForFunction(() => document.querySelector('.seal-stage')?.getAttribute('data-motion') === 'running');
  const startTransform = await motionPage.locator('.seal-orbit').evaluate((element) => getComputedStyle(element).transform);
  await motionPage.waitForFunction((start) => getComputedStyle(document.querySelector('.seal-orbit')).transform !== start, startTransform);
  for (const selector of ['.seal-diamond', '.seal-satellites', '.seal-echo']) {
    assert.notEqual(await motionPage.locator(selector).evaluate((element) => getComputedStyle(element).animationName), 'none');
    const start = await motionPage.locator(selector).evaluate((element) => getComputedStyle(element).transform);
    await motionPage.waitForFunction(({ selector, start }) => getComputedStyle(document.querySelector(selector)).transform !== start, { selector, start });
  }
  assert.equal(await motionPage.getByRole('button', { name: /Pause motion|Resume motion/ }).count(), 0);
  assert.equal(await motionPage.locator('.seal-stage').getAttribute('data-motion'), 'running');
  await motionPage.screenshot({ path: new URL('hero-motion.png', directory).pathname.replace(/^\/([A-Z]:)/i, '$1') });
  await motionPage.locator('.terminal-menu summary').click();
  await motionPage.locator('.nav-link[href="/#community"]').click();
  const sectionTop = await motionPage.locator('#community').evaluate((element) => element.getBoundingClientRect().top);
  const menuBottom = await motionPage.locator('.site-header').evaluate((element) => element.getBoundingClientRect().bottom);
  assert.ok(sectionTop >= menuBottom, 'sticky navigation does not obscure anchor targets');
  await motionPage.locator('.terminal-menu summary').click();
  await motionPage.locator('.nav-link[href="/#contact"]').click();
  assert.equal(await motionPage.locator('.nav-link[href="/#contact"]').evaluate((element) => getComputedStyle(element).fontWeight), '500');
  await motionPage.waitForFunction(() => document.querySelector('.seal-stage')?.getAttribute('data-motion') === 'paused');
  for (const selector of ['.seal-diamond', '.seal-satellites', '.seal-echo']) {
    assert.equal(await motionPage.locator(selector).evaluate((element) => getComputedStyle(element).animationPlayState), 'paused');
  }
  await motionContext.close();
  for (const width of [946, 320]) {
    const terminalContext = await browser.newContext({ viewport: { width, height: 844 } });
    const terminalPage = await terminalContext.newPage();
    await terminalPage.goto(base);
    await terminalPage.waitForFunction(() => document.querySelector('[data-current-path]').textContent === 'about/');
    await terminalPage.locator('summary').click();
    await terminalPage.locator('#command').fill('help');
    await terminalPage.locator('#command').press('Enter');
    assert.match(await terminalPage.locator('[role="status"]').innerText(), /Choose a command/);
    await terminalPage.locator('#command').fill('unknown');
    await terminalPage.locator('#command').press('Enter');
    assert.match(await terminalPage.locator('[role="status"]').innerText(), /Unknown command/);
    await terminalPage.screenshot({ path: new URL(`terminal-${width}.png`, directory).pathname.replace(/^\/([A-Z]:)/i, '$1') });
    assert.ok(await terminalPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await terminalPage.locator('#command').fill('certs');
    await terminalPage.locator('#command').press('Enter');
    await terminalPage.waitForFunction(() => document.querySelector('[data-current-path]').textContent === 'certs/');
    assert.equal(new URL(terminalPage.url()).hash, '#certifications');
    assert.equal(await terminalPage.locator('details').getAttribute('open'), null);
    await terminalPage.locator('summary').click();
    await terminalPage.keyboard.press('Escape');
    assert.equal(await terminalPage.locator(':focus').evaluate((element) => element.tagName), 'SUMMARY');
    await terminalPage.mouse.wheel(0, 10000);
    await terminalPage.waitForFunction(() => document.querySelector('[data-current-path]').textContent === 'contact/');
    assert.equal(new URL(terminalPage.url()).hash, '#certifications', 'scrolling does not rewrite the URL');
    await terminalContext.close();
  }
  await writeFile(new URL('browser-report.json', directory), JSON.stringify(report, null, 2));
  console.log('Browser checks passed: 5 widths, compact spacing, no-JS content, font loading, contrast, keyboard focus, reduced motion, automatic animation/offscreen behavior, 2 policies, and 3 retired routes.');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
