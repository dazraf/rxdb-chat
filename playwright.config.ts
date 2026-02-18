import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  projects: [
    {
      name: 'default',
      testDir: './e2e',
      testIgnore: ['**/offline-sync*'],
    },
    {
      name: 'offline-sync',
      testDir: './e2e',
      testMatch: ['**/offline-sync*'],
      dependencies: ['default'],
      use: { baseURL: undefined },
    },
  ],
  webServer: [
    {
      command: 'npm run server',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: 'npm run client',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
  ],
});
