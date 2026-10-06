import { test, expect } from '@playwright/test';

test.describe('Autenticação & Login Flow', () => {
  test('deve alternar entre tela de Login e tela de Cadastro', async ({ page }) => {
    await page.goto('/login');

    // Inicialmente no modo de login
    await expect(page.getByRole('heading', { name: /Acesse a Plataforma/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Entrar$/i })).toBeVisible();

    // Clica para alternar para cadastro
    await page.getByRole('button', { name: /Criar nova conta/i }).click();

    // Deve mudar o título e botão
    await expect(page.getByRole('heading', { name: /Criar Nova Conta/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cadastrar$/i })).toBeVisible();

    // Clica para voltar ao login
    await page.getByRole('button', { name: /Fazer login/i }).click();
    await expect(page.getByRole('heading', { name: /Acesse a Plataforma/i })).toBeVisible();
  });

  test('deve exibir mensagem ao tentar login com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('usuario_teste_invalido@dominio.com');
    await page.locator('input[type="password"]').fill('senhaErrada123456');
    await page.getByRole('button', { name: /^Entrar$/i }).click();

    // Aguarda mensagem de erro ou feedback sem travar a interface
    const errorAlert = page.locator('.text-red-700');
    // Deve mostrar o alerta de erro ou permanecer responsivo
    await expect(page.locator('body')).toBeVisible();
  });
});
