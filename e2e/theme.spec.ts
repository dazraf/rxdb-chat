import { test, expect, type Page } from '@playwright/test';

function uniqueUser() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function signupAndLogin(page: Page) {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Username').fill(uniqueUser());
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('Theme Switcher', () => {
  test('cycles through light → dark → system', async ({ page }) => {
    await signupAndLogin(page);

    const themeBtn = page.locator('.theme-toggle');

    // Default is system — click to cycle to light
    await themeBtn.click();

    // Check data-theme attribute on html
    const getTheme = () => page.locator('html').getAttribute('data-theme');

    const theme1 = await getTheme();
    // After first click from 'system', we should be on 'light'
    // (system → light in the cycle: light → dark → system)
    // Actually the cycle is: current starts at 'system', click → 'light'
    expect(theme1).toBe('light');

    // Click again → dark
    await themeBtn.click();
    expect(await getTheme()).toBe('dark');

    // Click again → system (resolved to light or dark depending on OS)
    await themeBtn.click();
    const systemTheme = await getTheme();
    expect(['light', 'dark']).toContain(systemTheme);
  });

  test('dark mode changes background color', async ({ page }) => {
    await signupAndLogin(page);

    const themeBtn = page.locator('.theme-toggle');

    // Set to light
    await themeBtn.click();
    const lightBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );

    // Set to dark
    await themeBtn.click();
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );

    // They should be different colors
    expect(lightBg).not.toBe(darkBg);
  });

  test('theme persists across page reload', async ({ page }) => {
    await signupAndLogin(page);

    const themeBtn = page.locator('.theme-toggle');

    // Set to light then dark
    await themeBtn.click(); // light
    await themeBtn.click(); // dark
    expect(await page.locator('html').getAttribute('data-theme')).toBe('dark');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should still be dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
