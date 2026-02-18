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

test.describe('Markdown', () => {
  test('post body renders markdown on detail page', async ({ page }) => {
    await signupAndLogin(page);

    // Create a post with markdown
    await page.getByRole('link', { name: 'New Post', exact: true }).click();
    await page.getByLabel('Title').fill('Markdown Test');
    await page.locator('#post-body').fill(
      '## Hello World\n\nThis is **bold** and *italic*.\n\n- item one\n- item two\n\n[a link](https://example.com)',
    );
    await page.getByRole('button', { name: 'Create Post' }).click();

    // Verify rendered markdown on detail page
    const postBody = page.locator('div.post-body');
    await expect(postBody.locator('h2')).toHaveText('Hello World');
    await expect(postBody.locator('strong')).toHaveText('bold');
    await expect(postBody.locator('em')).toHaveText('italic');
    await expect(postBody.locator('ul > li')).toHaveCount(2);
    await expect(postBody.locator('a[href="https://example.com"]')).toHaveText('a link');
  });

  test('preview toggle shows rendered markdown in create form', async ({ page }) => {
    await signupAndLogin(page);

    await page.getByRole('link', { name: 'New Post', exact: true }).click();
    await page.locator('#post-body').fill('**bold preview**');

    // Click Preview button
    await page.getByRole('button', { name: 'Preview' }).click();

    // Should see rendered bold text in preview pane
    const preview = page.locator('.md-preview');
    await expect(preview.locator('strong')).toHaveText('bold preview');

    // Click Write to go back
    await page.getByRole('button', { name: 'Write' }).click();
    await expect(page.locator('#post-body')).toBeVisible();
  });

  test('markdown toolbar inserts bold syntax', async ({ page }) => {
    await signupAndLogin(page);

    await page.getByRole('link', { name: 'New Post', exact: true }).click();
    const textarea = page.locator('#post-body');
    await textarea.focus();

    // Click the Bold button in the toolbar
    await page.locator('.md-toolbar button').first().click();

    // Should have inserted **bold text**
    await expect(textarea).toHaveValue('**bold text**');
  });

  test('comment renders markdown', async ({ page }) => {
    await signupAndLogin(page);

    // Create a simple post first
    await page.getByRole('link', { name: 'New Post', exact: true }).click();
    await page.getByLabel('Title').fill('Comment MD Test');
    await page.locator('#post-body').fill('A post for testing comments.');
    await page.getByRole('button', { name: 'Create Post' }).click();
    await expect(page.locator('article.post-detail h1')).toHaveText('Comment MD Test');

    // Write a comment with markdown
    await page.getByPlaceholder('Write a comment...').fill('This is **bold** in a comment');
    await page.getByRole('button', { name: 'Comment' }).click();

    // Verify the comment renders markdown
    await expect(page.locator('.comment .markdown-content strong')).toHaveText('bold');
  });

  test('post card shows stripped markdown in preview', async ({ page }) => {
    await signupAndLogin(page);

    // Create a post with markdown
    await page.getByRole('link', { name: 'New Post', exact: true }).click();
    await page.getByLabel('Title').fill('Preview Strip Test');
    await page.locator('#post-body').fill('## Heading\n\n**Bold text** in the body');
    await page.getByRole('button', { name: 'Create Post' }).click();

    // Go back to home
    await page.locator('a.back-link').click();
    await expect(page).toHaveURL('/');

    // The preview should show stripped text (no ## or **)
    const preview = page.locator('.post-body-preview').first();
    const text = await preview.textContent();
    expect(text).not.toContain('##');
    expect(text).not.toContain('**');
    expect(text).toContain('Bold text');
  });
});
