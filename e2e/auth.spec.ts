import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display GitHub login button', async ({ page }) => {
    await page.goto('/');
    
    // Wait for splash to finish
    await page.waitForTimeout(2000);
    
    // Check for auth screen
    const loginButton = page.locator('button:has-text("Sign in with GitHub")');
    await expect(loginButton).toBeVisible();
  });

  test('should display feature list on auth screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('text=Access your GitHub Codespaces')).toBeVisible();
    await expect(page.locator('text=Real-time sync with remote')).toBeVisible();
    await expect(page.locator('text=Full Monaco Editor experience')).toBeVisible();
    await expect(page.locator('text=Offline mode support')).toBeVisible();
  });

  test('should show privacy notice', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    await expect(
      page.locator('text=Your tokens are stored securely')
    ).toBeVisible();
  });
});

test('should display GitHub logo', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  const githubIcon = page.locator('[data-testid="icon-github"]');
  await expect(githubIcon).toBeVisible();
});
