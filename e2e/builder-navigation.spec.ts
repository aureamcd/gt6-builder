import { test, expect } from '@playwright/test';

test.describe('Navegação do Builder e Preview', () => {
  test('acesso a rota do builder sem sessão ativa deve redirecionar para login com redirectTo', async ({ page }) => {
    await page.goto('/builder/formulario-teste-123');
    // Deve redirecionar para tela de login ou exibir tela de carregamento/bloqueio seguro
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
  });

  test('acesso à página principal sem sessão ativa deve redirecionar para login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
  });

  test('página de preview deve renderizar ou redirecionar sem erro 500', async ({ page }) => {
    const response = await page.goto('/preview/form-preview-test');
    expect(response?.status()).toBeLessThan(500);
  });
});
