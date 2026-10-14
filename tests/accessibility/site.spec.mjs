import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/privacy/', '/cookies/', '/does-not-exist/'];

async function audit(page, testInfo, name) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  await testInfo.attach(name, { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  expect(results.violations, `${name}: automated WCAG A/AA violations`).toEqual([]);
}

for (const route of routes) {
  test(`${route} has no automated accessibility violations`, async ({ page }, testInfo) => {
    const response = await page.goto(route);
    expect(response.status()).toBe(route === '/does-not-exist/' ? 404 : 200);
    await page.evaluate(() => document.fonts.ready);
    await audit(page, testInfo, 'page-audit');
    await page.getByLabel('Open navigation terminal', { exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Navigation command' })).toBeFocused();
    await audit(page, testInfo, 'navigation-audit');
  });
}

test('keyboard navigation opens, announces errors, executes and restores focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  const summary = page.getByLabel('Open navigation terminal', { exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  const command = page.getByRole('textbox', { name: 'Navigation command' });
  await expect(command).toBeFocused();
  await command.fill('unknown');
  await command.press('Enter');
  await expect(page.getByRole('status')).toContainText('Unknown command');
  await audit(page, testInfo, 'error-state-audit');
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
  await summary.press('Enter');
  await command.fill('contact');
  await command.press('Enter');
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  await expect(page.locator('#contact a').first()).toBeFocused();
});

test('content and native navigation remain accessible without JavaScript', async ({ browser }, testInfo) => {
  const { viewport, isMobile, hasTouch } = testInfo.project.use;
  const context = await browser.newContext({ viewport, isMobile, hasTouch, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4322/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Adrián Barrio Andrés');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    const summary = page.getByLabel('Open navigation terminal', { exact: true });
    await summary.focus();
    await summary.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.locator('.header-nav a')).toHaveCount(5);
    await page.locator('.header-nav a[href="/#contact"]').click();
    await expect(page).toHaveURL(/#contact$/);
  } finally {
    await context.close();
  }
});
