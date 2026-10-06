import { test, expect } from '@playwright/test';

test.describe('Responsividade & Layout Mobile', () => {
  const routesToTest = [
    { path: '/login', name: 'Tela de Login' },
    { path: '/register', name: 'Tela de Cadastro' },
    { path: '/', name: 'Home / Dashboard' },
    { path: '/f/demo-token', name: 'Formulário Público' },
  ];

  for (const route of routesToTest) {
    test(`não deve ter vazamento/overflow horizontal em mobile na rota ${route.name} (${route.path})`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      // Verifica se a largura de rolagem do documento ultrapassa a largura visível da janela (tela de celular)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(
        hasHorizontalScroll,
        `A página ${route.path} vazou horizontalmente no mobile (scrollWidth > innerWidth)`
      ).toBe(false);
    });
  }

  test('campos de entrada e botões de login devem estar visíveis e dentro da tela em mobile', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const submitBtn = page.getByRole('button', { name: /Entrar/i });

    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Valida que o botão de submit tem largura suficiente e não é menor que o recomendado para toque (mínimo 36px de altura)
    const btnBox = await submitBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(btnBox.height).toBeGreaterThanOrEqual(36);
      expect(btnBox.width).toBeGreaterThan(150);
    }
  });
});
