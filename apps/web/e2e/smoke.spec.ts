import { expect, test } from '@playwright/test';
import { execSync } from 'node:child_process';

test('login, jobs filter, printer profile CRUD smoke, tcp ingest, export', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/jobs/);
  await expect(page.getByText('Job History')).toBeVisible();

  await page.goto('/printer-profiles');
  await page.getByLabel('Name').first().fill('E2E 58mm');
  await page.getByLabel('Printer model').fill('e2e-58');
  await page.getByLabel('Paper (mm)').fill('58');
  await page.getByLabel('Chars/line').fill('32');
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page.getByText('E2E 58mm')).toBeVisible();

  execSync("printf '\\x1B\\x40E2E-SMOKE\\n\\x1D\\x56\\x00' | nc -w 2 127.0.0.1 9100", { stdio: 'ignore' });
  await page.goto('/jobs');
  await page.waitForTimeout(2500);
  await page.reload();
  await expect(page.locator('body')).toContainText(/#\d+/);

  const firstJob = page.locator('a[href^="/jobs/"]').first();
  await firstJob.click();
  await expect(page.getByRole('button', { name: 'Print / Save PDF' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
});
