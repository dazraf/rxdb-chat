import { test, expect } from '@playwright/test';

function uniqueUser() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function signupAndLogin(page: import('@playwright/test').Page) {
  const username = uniqueUser();
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page).toHaveURL('/');
  return username;
}

test.describe('Posts', () => {
  test('create post → appears on post detail → appears on home page', async ({ page }) => {
    await signupAndLogin(page);

    const title = `Test Post ${Date.now()}`;

    // Navigate to create
    await page.getByRole('link', { name: 'New Post', exact: true }).click();
    await expect(page).toHaveURL('/create');

    // Fill and submit
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Body').fill('This is the body of my test post.');
    await page.getByRole('button', { name: 'Create Post' }).click();

    // Should be on post detail page
    await expect(page.locator('article.post-detail h1')).toHaveText(title);
    await expect(page.locator('div.post-body')).toContainText('This is the body of my test post.');

    // Navigate back to home
    await page.locator('a.back-link').click();
    await expect(page).toHaveURL('/');

    // Post should appear on home page
    await expect(page.getByText(title)).toBeVisible();
  });
});
