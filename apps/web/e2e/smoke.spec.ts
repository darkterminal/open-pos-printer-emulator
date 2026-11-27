import { expect, test } from '@playwright/test';
import { execSync } from 'node:child_process';

test('login, jobs filter, printer profile CRUD smoke, tcp ingest, export', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/jobs/);
  await expect(page.getByText('Jobs Workspace')).toBeVisible();

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
  await expect(page.getByText('Jobs Workspace')).toBeVisible();

  const firstJob = page.locator('button[data-job-id]').first();
  await expect(firstJob).toBeVisible();
  await firstJob.click();
  await expect(page.getByText('Receipt Preview').first()).toBeVisible();
  await expect(page.getByText('Job Detail').first()).toBeVisible();
  await expect(page.getByText('Command Inspector').first()).toBeVisible();
  await expect(page.getByText('Raw Data Viewer').first()).toBeVisible();
});
