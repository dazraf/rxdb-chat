import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  retries: 0,
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
      use: { baseURL: undefined },
    },
  ],
  webServer: [
    {
      command: 'npm run server',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
