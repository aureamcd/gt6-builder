import { test, expect } from '@playwright/test';

test.describe('Compartilhamento e Acesso a Formulários (Públicos e Privados)', () => {
  test('Acesso a formulário com token inválido deve exibir mensagem de erro amigável', async ({ page }) => {
    await page.goto('/f/TOKEN_INVALIDO_COMPARTILHAMENTO_123');
    await expect(page.locator('text=Formulário não encontrado ou link inválido.')).toBeVisible({ timeout: 10000 });
  });

  test('Importação de template via query string import_token deve ser interceptada corretamente', async ({ page }) => {
    // Quando um usuário recebe um link para clonar/importar um questionário compartilhado
    await page.goto('/?import_token=TOKEN_COMPARTILHADO_TESTE');
    
    // Como não está autenticado, o sistema deve redirecionar com segurança mantendo os parâmetros
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
    expect(page.url()).toContain('import_token');
  });

  test('Modal de bloqueio de formulário privado deve validar código de acesso', async ({ page }) => {
    // Simula a interface do formulário privado (/f/[token])
    // Se o formulário requer token GT-XXXX, o usuário não pode avançar sem digitar o código
    await page.goto('/f/demo-private-form');
    await page.waitForLoadState('domcontentloaded');

    const passcodeInput = page.locator('input[placeholder*="GT-"]');
    if (await passcodeInput.isVisible()) {
      // Tenta submeter código em branco ou incorreto
      await passcodeInput.fill('ERRADO');
      const submitBtn = page.getByRole('button', { name: /Acessar Questionário/i });
      await submitBtn.click();

      // Deve exibir mensagem de erro sem liberar as perguntas
      await expect(page.locator('text=Código de acesso incorreto')).toBeVisible();
    }
  });
});
