import { test, expect, type Page, chromium } from '@playwright/test';
import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';

const SERVER_DIR = resolve(process.cwd(), 'server');
const BASE = 'http://localhost:5173';

function spawnServer(): Promise<ChildProcess> {
  return new Promise((resolvePromise) => {
    const proc = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: SERVER_DIR,
      stdio: 'pipe',
      detached: true,
    });
    const timeout = setTimeout(() => resolvePromise(proc), 8000);
    const onData = (data: Buffer) => {
      if (data.toString().includes('Server running')) {
        clearTimeout(timeout);
        resolvePromise(proc);
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
  });
}

function killServer(proc: ChildProcess | null) {
  if (proc?.pid) {
    try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
  }
}

function uniqueUser() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function signup(page: Page, username: string) {
  await page.goto(`${BASE}/signup`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page).toHaveURL(`${BASE}/`);
}

async function postComment(page: Page, text: string) {
  await page.getByPlaceholder('Write a comment...').fill(text);
  await page.getByRole('button', { name: 'Comment' }).click();
  await expect(page.getByText(text)).toBeVisible();
}

// This test manages its own server lifecycle — skip the webServer-managed one
test.use({ baseURL: undefined });

test.describe('Offline sync', () => {
  test('comments sync between separate browsers after server returns', async () => {
    test.setTimeout(120_000);

    // Kill the Playwright-managed server so we own port 3001
    // (the client on 5173 stays up since it's a separate process)
    const { execSync } = await import('child_process');
    try { execSync('fuser -k 3001/tcp 2>/dev/null', { stdio: 'ignore' }); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    let serverProc = await spawnServer();

    const browserA = await chromium.launch();
    const browserB = await chromium.launch();
    const alice = await browserA.newPage();
    const bob = await browserB.newPage();

    try {
      alice.on('console', (msg) => { if (msg.text().match(/\[(repl|sse|health)[:]/)) console.log(`  [Alice] ${msg.text()}`); });
      bob.on('console', (msg) => console.log(`  [Bob]   ${msg.text()}`));

      const aliceName = uniqueUser();
      const bobName = uniqueUser();

      await signup(alice, aliceName);
      await signup(bob, bobName);

      // Alice creates a post
      const postTitle = `Sync Test ${Date.now()}`;
      await alice.getByRole('link', { name: 'New Post', exact: true }).click();
      await alice.getByLabel('Title').fill(postTitle);
      await alice.locator('#post-body').fill('Test body');
      await alice.getByRole('button', { name: 'Create Post' }).click();
      await expect(alice.locator('article.post-detail h1')).toHaveText(postTitle);

      // Bob navigates to the same post
      await bob.goto(`${BASE}/`);
      await expect(bob.getByText(postTitle)).toBeVisible({ timeout: 15_000 });
      await bob.getByText(postTitle).click();
      await expect(bob.locator('article.post-detail h1')).toHaveText(postTitle);

      // Kill the server
      console.log('--- Stopping server ---');
      killServer(serverProc);
      serverProc = null as any;
      await new Promise((r) => setTimeout(r, 2000));

      // Verify server is dead
      const health = await alice.evaluate(async () => {
        try {
          const r = await fetch('/api/health');
          return r.ok ? 'up' : 'down';
        } catch { return 'down'; }
      });
      console.log(`Server health: ${health}`);
      expect(health).toBe('down');

      // Both post comments while offline
      console.log('--- Alice commenting offline ---');
      await postComment(alice, 'Alice offline comment');
      console.log('--- Bob commenting offline ---');
      await postComment(bob, 'Bob offline comment');

      // Verify isolation
      await new Promise((r) => setTimeout(r, 1000));
      expect(await alice.getByText('Bob offline comment').count()).toBe(0);
      expect(await bob.getByText('Alice offline comment').count()).toBe(0);
      console.log('--- Confirmed: comments are isolated ---');

      // Bring server back
      console.log('--- Starting server ---');
      serverProc = await spawnServer();

      // Wait for sync
      console.log('--- Waiting for sync ---');
      await expect(alice.getByText('Bob offline comment')).toBeVisible({ timeout: 30_000 });
      await expect(bob.getByText('Alice offline comment')).toBeVisible({ timeout: 30_000 });

      console.log('--- PASSED ---');
    } finally {
      await browserA.close();
      await browserB.close();
      killServer(serverProc);
    }
  });
});
