import { test, expect } from '@playwright/test';

test.describe('Editor Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Set up mock auth state
    await page.evaluate(() => {
      localStorage.setItem('vscode_android_auth', JSON.stringify({
        isAuthenticated: true,
        user: {
          login: 'testuser',
          id: 12345,
          avatar_url: 'https://example.com/avatar.png',
          html_url: 'https://github.com/testuser',
        },
        codespace: {
          name: 'test-codespace',
          id: 'cs-123',
          state: 'available',
          repository: {
            full_name: 'testuser/test-repo',
            default_branch: 'main',
          },
        },
      }));
    });
    
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test('should display editor area', async ({ page }) => {
    await expect(page.locator('text=No file open')).toBeVisible();
  });

  test('should show keyboard shortcuts hint', async ({ page }) => {
    await expect(page.locator('text=Ctrl+P')).toBeVisible();
    await expect(page.locator('text=Ctrl+Shift+P')).toBeVisible();
  });

  test('should open command palette with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Control+Shift+P');
    
    const commandPalette = page.locator('[placeholder*="Type a command"]');
    await expect(commandPalette).toBeVisible();
  });

  test('should toggle sidebar with keyboard shortcut', async ({ page }) => {
    // Initial state - sidebar should be visible
    await expect(page.locator('text=Explorer')).toBeVisible();
    
    // Toggle sidebar
    await page.keyboard.press('Control+b');
    
    // Sidebar should be hidden
    await page.waitForTimeout(300);
  });

  test('should display status bar', async ({ page }) => {
    await expect(page.locator('text=Synced')).toBeVisible();
  });

  test('should display activity bar icons', async ({ page }) => {
    await expect(page.locator('[data-testid="icon-files"]')).toBeVisible();
    await expect(page.locator('[data-testid="icon-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="icon-git"]')).toBeVisible();
  });
});

test('should display Monaco editor container', async ({ page }) => {
  await expect(page.locator('.monaco-editor-container')).toBeVisible();
});
