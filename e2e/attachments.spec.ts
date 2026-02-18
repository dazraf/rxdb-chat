import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

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

function createTestImage(): string {
  // Create a minimal valid PNG (1x1 red pixel)
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  );
  const tmpPath = path.join(os.tmpdir(), `test-image-${Date.now()}.png`);
  fs.writeFileSync(tmpPath, png);
  return tmpPath;
}

test.describe('Attachments', () => {
  test('upload image on post creation and display it', async ({ page }) => {
    await signupAndLogin(page);

    const imagePath = createTestImage();

    try {
      await page.getByRole('link', { name: 'New Post', exact: true }).click();
      await page.getByLabel('Title').fill('Image Post');
      await page.locator('#post-body').fill('Post with an image');

      // Click attach files and upload the image
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('.file-picker-btn').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(imagePath);

      // Should see pending file
      await expect(page.locator('.pending-file')).toBeVisible();
      await expect(page.locator('.pending-file')).toContainText('.png');

      // Submit the post
      await page.getByRole('button', { name: 'Create Post' }).click();
      await expect(page.locator('article.post-detail h1')).toHaveText('Image Post');

      // The image should appear in the attachment grid
      await expect(page.locator('.attachment-grid img')).toBeVisible({ timeout: 10_000 });
    } finally {
      fs.unlinkSync(imagePath);
    }
  });

  test('remove pending file before submitting', async ({ page }) => {
    await signupAndLogin(page);

    const imagePath = createTestImage();

    try {
      await page.getByRole('link', { name: 'New Post', exact: true }).click();

      // Attach a file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('.file-picker-btn').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(imagePath);

      // Pending file should be visible
      await expect(page.locator('.pending-file')).toBeVisible();

      // Remove it
      await page.locator('.pending-file button').click();

      // Should be gone
      await expect(page.locator('.pending-file')).not.toBeVisible();
    } finally {
      fs.unlinkSync(imagePath);
    }
  });

  test('upload image on comment and display it', async ({ page }) => {
    await signupAndLogin(page);

    const imagePath = createTestImage();

    try {
      // Create a post first
      await page.getByRole('link', { name: 'New Post', exact: true }).click();
      await page.getByLabel('Title').fill('Comment Attachment Test');
      await page.locator('#post-body').fill('Testing comment attachments');
      await page.getByRole('button', { name: 'Create Post' }).click();
      await expect(page.locator('article.post-detail h1')).toHaveText('Comment Attachment Test');

      // Write a comment with an attachment
      await page.getByPlaceholder('Write a comment...').fill('Comment with image');

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('.comment-form .file-picker-btn').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(imagePath);

      await expect(page.locator('.comment-form .pending-file')).toBeVisible();

      await page.getByRole('button', { name: 'Comment' }).click();

      // Comment should appear with the image
      await expect(page.locator('.comment .attachment-grid img')).toBeVisible({ timeout: 10_000 });
    } finally {
      fs.unlinkSync(imagePath);
    }
  });
});
