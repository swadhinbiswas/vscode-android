import { test, expect } from '@playwright/test';

test.describe('VSCode Android App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display splash screen on load', async ({ page }) => {
    await expect(page.locator('text=VSCode Android')).toBeVisible();
    await expect(page.locator('text=Code anywhere, sync everywhere')).toBeVisible();
  });

  test('should show loading spinner', async ({ page }) => {
    const spinner = page.locator('.spinner');
    await expect(spinner).toBeVisible();
  });

  test('should display version number', async ({ page }) => {
    await expect(page.locator('text=v1.0.0')).toBeVisible();
  });
});
