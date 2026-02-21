import { test, expect, type Page } from '@playwright/test';

function uniqueUser() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function fillSignupForm(page: Page, username: string, password: string) {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();
}

async function logoutViaDropdown(page: Page) {
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.locator('.dropdown-logout').click();
}

test.describe('Auth', () => {
  test('signup: new user → redirected to home, avatar button visible', async ({ page }) => {
    const username = uniqueUser();
    await fillSignupForm(page, username, 'password123');

    await expect(page).toHaveURL('/');
    // Avatar button is visible in navbar (replaces old nav-user span)
    await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible();
    // Username shown in dropdown
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.locator('.dropdown-header')).toHaveText(username);
  });

  test('signup: duplicate username → error message shown', async ({ page }) => {
    const username = uniqueUser();

    // First signup
    await fillSignupForm(page, username, 'password123');
    await expect(page).toHaveURL('/');

    // Log out, try same username
    await logoutViaDropdown(page);
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('password456');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.locator('div.error')).toBeVisible();
    await expect(page.locator('div.error')).toContainText('already taken');
  });

  test('login: valid credentials → home page', async ({ page }) => {
    const username = uniqueUser();

    // Signup first
    await fillSignupForm(page, username, 'password123');
    await expect(page).toHaveURL('/');

    // Log out
    await logoutViaDropdown(page);

    // Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL('/');
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.locator('.dropdown-header')).toHaveText(username);
  });

  test('login: wrong password → error message', async ({ page }) => {
    const username = uniqueUser();

    // Signup first
    await fillSignupForm(page, username, 'password123');
    await expect(page).toHaveURL('/');

    // Log out
    await logoutViaDropdown(page);

    // Login with wrong password
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page.locator('div.error')).toBeVisible();
  });

  test('unauthenticated → redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('navigation between login/signup pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();

    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL('/signup');
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();

    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/login');
  });
});
