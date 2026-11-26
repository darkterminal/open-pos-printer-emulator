import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    viewport: { width: 1440, height: 775 },
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
