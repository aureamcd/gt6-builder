import { test, expect } from '@playwright/test';

test.describe('Fluxo de Resposta de Formulário Público (/f/[token])', () => {
  test('deve exibir mensagem amigável quando o formulário não for encontrado', async ({ page }) => {
    await page.goto('/f/token-inexistente-xyz-999');

    // Verifica que a aplicação trata o erro sem quebrar
    await expect(page.locator('text=Formulário não encontrado ou link inválido.')).toBeVisible({ timeout: 10000 });
  });

  test('não deve gerar exceções Javascript não tratadas na página de formulário', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto('/f/test-token');
    await page.waitForTimeout(1000);

    expect(pageErrors.length).toBe(0);
  });
});
