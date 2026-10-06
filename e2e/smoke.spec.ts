import { test, expect } from '@playwright/test';

test.describe('Smoke & Integridade do Sistema', () => {
  test('deve carregar a Home sem erros fatais no console', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);

    // Garante que o body foi renderizado
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve renderizar a página de login corretamente', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('deve renderizar a página de cadastro (register)', async ({ page }) => {
    const response = await page.goto('/register');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });
});
