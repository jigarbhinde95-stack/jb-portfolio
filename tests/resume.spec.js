import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const resume = JSON.parse(readFileSync(new URL('../content/resume.json', import.meta.url), 'utf8'));

test('serves all company logos from local assets inside the correct company links', async ({ page }) => {
  const remoteRequests = [];
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) remoteRequests.push(request.url());
  });
  await page.goto('/');
  const companies = [...resume.experience.map(job => job.company), ...resume.experience.flatMap(job => (job.clients || []).map(client => client.company))];
  for (const id of companies) {
    const company = resume.organizations[id];
    const link = page.locator('.organization').filter({ hasText: company.name }).first();
    await expect(link).toHaveAttribute('href', company.url);
    const logo = link.locator('img');
    if (!company.logo) {
      await expect(logo).toHaveCount(0);
      continue;
    }
    await logo.scrollIntoViewIfNeeded();
    await expect(logo).toHaveAttribute('src', `./${company.logo}`);
    await expect.poll(() => logo.evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
  }
  expect(remoteRequests).toEqual([]);
});

test('renders the complete resume, contact details, and downloadable source PDF', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(resume.profile.title);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${resume.profile.name}.`);
  await expect(page.locator('.job')).toHaveCount(resume.experience.length);
  await expect(page.locator('.education-entry')).toHaveCount(resume.education.length);
  await expect(page.locator('.community-list > li')).toHaveCount(resume.community.length);
  for (const organization of resume.experience.map(job => resume.organizations[job.company].name)) {
    await expect(page.locator('.organization').filter({ hasText: organization }).first()).toBeVisible();
  }
  await expect(page.getByRole('link', { name: `Email ${resume.profile.name}`, exact: true })).toHaveAttribute('href', `mailto:${resume.profile.email}`);
  await expect(page.getByRole('link', { name: `Call ${resume.profile.name} at ${resume.profile.phone}` })).toHaveAttribute('href', `tel:${resume.profile.phoneLink}`);
  await expect(page.getByRole('link', { name: `${resume.profile.name} on LinkedIn (opens in a new tab)` })).toHaveAttribute('href', resume.profile.linkedin);
  const pdfLink = page.getByRole('link', { name: 'PDF', exact: true });
  const response = await request.get(await pdfLink.getAttribute('href'));
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const downloadPromise = page.waitForEvent('download');
  await pdfLink.click();
  expect((await downloadPromise).suggestedFilename()).toBe(resume.profile.pdf.split('/').at(-1));
  expect(errors).toEqual([]);
});

test('theme and text-size controls work, stay bounded, and persist across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Increase text size' }).click();
  await page.getByRole('button', { name: 'Increase text size' }).click();
  await expect(page.getByRole('button', { name: 'Increase text size' })).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('Largest text size');
  expect(await page.locator('html').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(18);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Increase text size' })).toBeDisabled();
  await expect(page.locator('.size-dots .active')).toHaveCount(1);
  for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Decrease text size' }).click();
  await expect(page.getByRole('button', { name: 'Decrease text size' })).toBeDisabled();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('has no accessibility violations in light and dark themes', async ({ page }) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});

test('all sections are reachable by keyboard and content fits narrow screens at the largest size', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to résumé' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const size of [1, 1.125]) {
      await page.locator('html').evaluate((el, scale) => el.style.setProperty('--text-scale', scale), size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
  }
  await page.locator('#education').scrollIntoViewIfNeeded();
  if (resume.education.length) await expect(page.getByRole('heading', { name: resume.education[0].degree, exact: true })).toBeVisible();
  await page.getByRole('link', { name: resume.labels.backToTop, exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test('renders resume content without JavaScript and prints without the toolbar', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${resume.profile.name}.`);
  await expect(page.locator('.job')).toHaveCount(resume.experience.length);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.toolbar')).toBeHidden();
  await expect(page.getByRole('heading', { name: resume.sections.experience.title, exact: true })).toBeVisible();
  await context.close();
});
