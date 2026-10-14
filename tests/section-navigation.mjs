import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
});
try {
  for (const width of [1440, 987, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 956 } });
    await page.goto(`${process.env.SITE_URL || 'http://127.0.0.1:4321'}/#community`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => scrollY > 0);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator('[data-current-path]').textContent(), 'community/', `community deep link at ${width}px`);
    await page.locator('summary').click();
    await page.locator('[data-command="contact"]').click();
    await page.waitForFunction(() => document.querySelector('[data-current-path]').textContent === 'contact/');
    const top = await page.locator('#contact').evaluate((element) => element.getBoundingClientRect().top);
    const header = await page.locator('header').evaluate((element) => element.getBoundingClientRect().bottom);
    assert.ok(top >= header && top < 956, `contact is visible below the header at ${width}px: ${top}`);
    const footerGap = await page.evaluate(() => document.querySelector('footer').getBoundingClientRect().top - document.querySelector('#contact').getBoundingClientRect().bottom);
    assert.ok(footerGap <= 64, `compact footer gap at ${width}px: ${footerGap}`);
    await page.locator('summary').click();
    await page.locator('[data-command="community"]').click();
    await page.waitForFunction(() => document.querySelector('[data-current-path]').textContent === 'community/');
    await page.mouse.wheel(0, 24);
    await page.waitForFunction(() => document.querySelector('[data-current-path]').textContent === 'community/');
    assert.equal(new URL(page.url()).hash, '#community');
    await page.mouse.wheel(0, 1200);
    await page.waitForFunction(() => document.querySelector('[data-current-path]').textContent === 'contact/');
    assert.equal(new URL(page.url()).hash, '#community', 'scroll preserves the URL');
    await page.close();
  }
  console.log('Section navigation passed: direct links, commands, reading positions and scroll transitions at 4 widths.');
} finally {
  await browser.close();
}
