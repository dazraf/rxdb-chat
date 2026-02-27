import { test, expect } from '@playwright/test';

function uniqueUser() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueSubName() {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function signupAndLogin(page: import('@playwright/test').Page) {
  const username = uniqueUser();
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page).toHaveURL('/');
  // Wait for replication to complete initial sync
  await page.waitForTimeout(2000);
  return username;
}

test.describe('Subs', () => {
  test('new user is auto-subscribed to general', async ({ page }) => {
    await signupAndLogin(page);

    // Open sidebar
    await page.getByTitle('Toggle subs').click();
    await expect(page.locator('.sub-sidebar.open')).toBeVisible();

    // general should appear in sidebar (wait for replication)
    await expect(page.locator('.sidebar-link').filter({ hasText: 'general' })).toBeVisible({ timeout: 10000 });
  });

  test('create sub → appears in sub list and sidebar', async ({ page }) => {
    await signupAndLogin(page);
    const subName = uniqueSubName();

    // Navigate to create sub
    await page.goto('/create-sub');
    await page.getByLabel('Name').fill(subName);
    await page.locator('#sub-description').fill('A test sub for e2e');
    await page.getByRole('button', { name: 'Create Sub' }).click();

    // Should navigate to the sub detail page
    await expect(page).toHaveURL(`/s/${subName}`, { timeout: 10000 });
    await expect(page.locator('h1')).toHaveText(subName);

    // Open sidebar — sub should appear (creator is auto-subscribed)
    await page.getByTitle('Toggle subs').click();
    await expect(page.locator('.sidebar-nav .sidebar-link').filter({ hasText: subName })).toBeVisible({ timeout: 10000 });
  });

  test('browse all subs page lists subs', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/subs');
    await expect(page.locator('h1')).toHaveText('All Subs');

    // general sub should be listed (wait for replication)
    await expect(page.locator('.sub-card-name').filter({ hasText: 'general' })).toBeVisible({ timeout: 10000 });
  });

  test('subscribe and unsubscribe from sub list page', async ({ page }) => {
    await signupAndLogin(page);
    const subName = uniqueSubName();

    // Create a sub first
    await page.goto('/create-sub');
    await page.getByLabel('Name').fill(subName);
    await page.getByRole('button', { name: 'Create Sub' }).click();
    await expect(page).toHaveURL(`/s/${subName}`, { timeout: 10000 });

    // Go to subs list
    await page.goto('/subs');
    await expect(page.locator('.sub-card').filter({ hasText: subName })).toBeVisible({ timeout: 10000 });

    // Find the card for this sub and unsubscribe
    const subCard = page.locator('.sub-card').filter({ hasText: subName });
    await subCard.getByRole('button', { name: 'Unsubscribe' }).click();

    // Should now show Subscribe button
    await expect(subCard.getByRole('button', { name: 'Subscribe' })).toBeVisible({ timeout: 5000 });

    // Re-subscribe
    await subCard.getByRole('button', { name: 'Subscribe' }).click();
    await expect(subCard.getByRole('button', { name: 'Unsubscribe' })).toBeVisible({ timeout: 10000 });
  });

  test('create post in a specific sub → post shows sub name', async ({ page }) => {
    await signupAndLogin(page);
    const subName = uniqueSubName();
    const postTitle = `Post in ${subName} ${Date.now()}`;

    // Create a sub
    await page.goto('/create-sub');
    await page.getByLabel('Name').fill(subName);
    await page.getByRole('button', { name: 'Create Sub' }).click();
    await expect(page).toHaveURL(`/s/${subName}`, { timeout: 10000 });

    // Create a post — navigate to /create
    await page.goto('/create');

    // Wait for subs to load in the dropdown
    await expect(page.locator('select option').filter({ hasText: subName })).toBeAttached({ timeout: 10000 });

    // Select our sub
    await page.locator('select').selectOption(subName);
    await page.getByLabel('Title').fill(postTitle);
    await page.locator('#post-body').fill('Body of the post');
    await page.getByRole('button', { name: 'Create Post' }).click();

    // Should be on post detail with the sub badge
    await expect(page.locator('article.post-detail h1')).toHaveText(postTitle);
    await expect(page.locator('.post-sub-badge')).toHaveText(subName);
  });

  test('home page feed toggle between Subscribed and All', async ({ page }) => {
    await signupAndLogin(page);

    // Should see feed toggle buttons
    await expect(page.locator('.feed-toggle button').filter({ hasText: 'Subscribed' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.feed-toggle button').filter({ hasText: 'All' })).toBeVisible();

    // Default is Subscribed
    await expect(page.locator('.feed-toggle button.active')).toHaveText('Subscribed');

    // Switch to All
    await page.locator('.feed-toggle button').filter({ hasText: 'All' }).click();
    await expect(page.locator('.feed-toggle button.active')).toHaveText('All');
  });
});
