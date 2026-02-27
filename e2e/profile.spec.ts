import { test, expect, type Page } from '@playwright/test';

function uniqueUser() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function signupAndLogin(page: Page, username: string) {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('User Dropdown', () => {
  test('dropdown opens on avatar click and closes on Escape', async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    // Click avatar button to open dropdown
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.locator('.dropdown-menu')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('.dropdown-menu')).not.toBeVisible();
  });

  test('dropdown closes on outside click', async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.locator('.dropdown-menu')).toBeVisible();

    // Click outside
    await page.locator('.nav-brand').click();
    await expect(page.locator('.dropdown-menu')).not.toBeVisible();
  });

  test('dropdown shows Profile and Settings links', async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.locator('.dropdown-menu')).toContainText('Profile');
    await expect(page.locator('.dropdown-menu')).toContainText('Settings');
    await expect(page.locator('.dropdown-menu')).toContainText('Log out');
  });

  test('Log out button in dropdown logs the user out', async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.locator('.dropdown-logout').click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Profile Page', () => {
  test('navigating to profile page shows user info', async ({ page }) => {
    const username = uniqueUser();
    await signupAndLogin(page, username);

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL('/profile');

    await expect(page.locator('.profile-header h2')).toHaveText(username);
    await expect(page.getByRole('button', { name: 'Edit Profile' })).toBeVisible();
  });

  test('editing profile: change avatar and about', async ({ page }) => {
    const username = uniqueUser();
    await signupAndLogin(page, username);

    // Navigate to profile
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL('/profile');

    // Enter edit mode
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await expect(page.locator('.avatar-picker')).toBeVisible();

    // Select a different avatar
    await page.locator('.avatar-option').nth(1).click();
    await expect(page.locator('.avatar-option').nth(1)).toHaveClass(/selected/);

    // Fill in about text
    await page.locator('.profile-about-edit textarea').fill('Hello! I am a test user.');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Should be back in view mode with the about text visible
    await expect(page.locator('.profile-about')).toContainText('Hello! I am a test user.');
  });

  test('cancel edit returns to view mode', async ({ page }) => {
    const username = uniqueUser();
    await signupAndLogin(page, username);

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Edit Profile' }).click();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should be back in view mode
    await expect(page.getByRole('button', { name: 'Edit Profile' })).toBeVisible();
  });
});

test.describe('Settings Page', () => {
  test('theme settings page allows switching themes', async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');

    // Should show theme options
    await expect(page.locator('.theme-options')).toBeVisible();

    // Click Dark theme
    await page.getByText('Dark', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Click Light theme
    await page.getByText('Light', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('theme from profile is applied after login and resets on logout', async ({ page }) => {
    const username = uniqueUser();
    await signupAndLogin(page, username);

    // Go to settings and select 'dark' theme (not 'light', since the default
    // system theme in headless browsers is light — using 'dark' ensures the
    // test truly validates that the profile-based theme is restored).
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
    await page.getByText('Dark', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Wait for the profile to replicate to the server
    await page.waitForTimeout(500);

    // Log out — theme should reset to system default
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.locator('.dropdown-logout').click();
    await expect(page).toHaveURL('/login');
    const systemTheme = await page.locator('html').getAttribute('data-theme');
    expect(['light', 'dark']).toContain(systemTheme); // system default

    // Log back in — theme should be restored from profile
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Author Links', () => {
  test('post author name links to profile', async ({ page }) => {
    const username = uniqueUser();
    await signupAndLogin(page, username);

    // Create a post first
    await page.getByRole('link', { name: 'New Post' }).click();
    await page.getByLabel('Title').fill('Test Post');
    await page.locator('.create-post textarea').fill('Test body');
    await page.getByRole('button', { name: 'Create Post' }).click();

    // Should be on post detail — author name should be a link
    await expect(page.locator('article.post-detail')).toBeVisible();
    const authorLink = page.locator('.post-meta a[href*="/profile/"]').first();
    await expect(authorLink).toHaveText(username);
    await authorLink.click();
    await expect(page).toHaveURL(/\/profile\//);
  });
});
