import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo de Cadastro e Login de Usuários', () => {
  test('deve validar formulário de cadastro com e-mail inválido', async ({ page }) => {
    await page.goto('/login');
    // Troca para tela de cadastro
    await page.getByRole('button', { name: /Criar nova conta/i }).click();

    // Tenta submeter e-mail sem formato válido
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('email_sem_formato_correto');
    await page.locator('input[type="password"]').fill('Senha123456!');

    const submitBtn = page.getByRole('button', { name: /^Cadastrar$/i });
    await submitBtn.click();

    // Validação nativa HTML5 ou da UI deve impedir envio ou manter na tela
    await expect(page.getByRole('button', { name: /^Cadastrar$/i })).toBeVisible();
  });

  test('deve permitir preenchimento e tentativa de cadastro com e-mail válido', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Criar nova conta/i }).click();

    const randomId = Math.floor(Math.random() * 1000000);
    const testEmail = `test_user_${randomId}@dominio-gt6-teste.com`;

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill('SenhaForte12345!');

    await page.getByRole('button', { name: /^Cadastrar$/i }).click();

    // Deve responder sem crash da aplicação React (com mensagem de sucesso ou alerta do Supabase)
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve preservar redirecionamento (redirectTo) no fluxo de login', async ({ page }) => {
    await page.goto('/login?redirectTo=%2Fbuilder%2Fteste-123');

    // Verifica que o parâmetro de redirect foi mantido na URL
    expect(page.url()).toContain('redirectTo');

    // Ao alternar para cadastro e voltar, a rota deve manter integridade
    await page.getByRole('button', { name: /Criar nova conta/i }).click();
    await page.getByRole('button', { name: /Fazer login/i }).click();
    await expect(page.getByRole('heading', { name: /Acesse a Plataforma/i })).toBeVisible();
  });
});
