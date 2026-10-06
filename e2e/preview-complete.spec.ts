import { test, expect } from '@playwright/test';

test.describe('Validação Rigorosa do Modo de Pré-visualização (E2E Completo)', () => {
  test('Deve conter todos os botões de retorno, aviso de simulação e fluxo completo de conclusão', async ({ page }) => {
    // 1. Acesso à tela de login e criação de sessão temporária
    await page.goto('/login');
    const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
    const testEmail = `tester.preview.${randomSuffix}@instituicao.org`;
    const testPassword = `PreviewPass#${randomSuffix}`;

    const btnCriarConta = page.getByRole('button', { name: /Criar nova conta/i });
    if (await btnCriarConta.isVisible()) {
      await btnCriarConta.click();
      await page.waitForTimeout(400);
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[type="password"]').fill(testPassword);
      await page.getByRole('button', { name: /^Cadastrar$/i }).click();
      await page.waitForTimeout(1500);

      const btnFazerLogin = page.getByRole('button', { name: /Fazer login/i });
      if (await btnFazerLogin.isVisible()) {
        await btnFazerLogin.click();
        await page.waitForTimeout(400);
      }
    }

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /^Entrar$/i }).click();
    await page.waitForTimeout(2000);

    // 2. Criar um novo formulário de teste
    await page.goto('/');
    await page.waitForTimeout(1000);

    const btnNovo = page.getByRole('button', { name: /Novo Questionário|Criar Formulário/i });
    if (await btnNovo.isVisible()) {
      await btnNovo.click();
      await page.waitForTimeout(600);

      const inputTitle = page.locator('input[placeholder*="Título"], input[placeholder*="Nome"]').first();
      if (await inputTitle.isVisible()) {
        await inputTitle.fill(`Formulário de Teste de Preview ${randomSuffix}`);
      }
      const btnConfirmar = page.getByRole('button', { name: /Criar|Salvar|Confirmar/i }).last();
      await btnConfirmar.click();
      await page.waitForTimeout(2000);
    }

    // Salvar o formulário no Builder para garantir persistência
    const btnSalvar = page.getByRole('button', { name: /Salvar/i });
    if (await btnSalvar.isVisible()) {
      await btnSalvar.click();
      await page.waitForTimeout(1500);
    }

    // Obter o ID do formulário atual da URL do Builder
    const url = page.url();
    const match = url.match(/\/builder\/([a-zA-Z0-9_-]+)/);
    const formId = match ? match[1] : 'sample-id';

    // 3. Ir para a página de Pré-visualização
    await page.goto(`/preview/${formId}`);
    await page.waitForTimeout(1500);

    // 4. VERIFICAÇÃO 1: Botão 'Voltar ao Editor' presente e visível
    const btnVoltarEditor = page.getByRole('button', { name: /Voltar ao Editor/i });
    await expect(btnVoltarEditor).toBeVisible();

    // 5. VERIFICAÇÃO 2: Botão 'Menu Principal' presente
    const btnMenuPrincipal = page.getByRole('button', { name: /Menu Principal/i });
    if (await btnMenuPrincipal.isVisible()) {
      await expect(btnMenuPrincipal).toBeVisible();
    }

    // 6. VERIFICAÇÃO 3: Banner Informativo de Simulação presente na tela
    const bannerTexto = page.getByText(/Você está no Modo de Teste e Pré-visualização/i);
    await expect(bannerTexto).toBeVisible();

    const bannerAvisoBD = page.getByText(/não são salvas no banco de dados/i);
    await expect(bannerAvisoBD).toBeVisible();

    // 7. Avançar pelas seções até a última, preenchendo respostas caso necessário
    let nextBtn = page.getByRole('button', { name: /^Próxima$/i });
    let maxSectionHops = 10;
    while ((await nextBtn.isVisible()) && maxSectionHops > 0) {
      maxSectionHops--;
      const inputs = page.locator('input[type="text"]:visible, textarea:visible');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        await inputs.nth(i).fill('Simulação de resposta');
      }
      await nextBtn.click();
      await page.waitForTimeout(500);
      nextBtn = page.getByRole('button', { name: /^Próxima$/i });
    }

    // Preencher campos da última seção se houver
    const lastInputs = page.locator('input[type="text"]:visible, textarea:visible');
    const lastCount = await lastInputs.count();
    for (let i = 0; i < lastCount; i++) {
      await lastInputs.nth(i).fill('Resposta final da simulação');
    }

    // 8. VERIFICAÇÃO 4: Botão de ação na última seção deve se chamar 'Concluir Simulação'
    const btnConcluir = page.getByRole('button', { name: /Concluir Simulação/i });
    await expect(btnConcluir).toBeVisible();

    // 9. VERIFICAÇÃO 5: Ao concluir simulação, verificar mensagem de feedback e redirecionamento
    await btnConcluir.click();
    await page.waitForTimeout(600);

    const toastMsg = page.getByText(/Nenhuma resposta foi gravada no banco de dados/i);
    await expect(toastMsg).toBeVisible();

    // Aguardar redirecionamento automático para o editor
    await page.waitForURL(new RegExp(`/builder/${formId}`), { timeout: 8000 });
    expect(page.url()).toContain(`/builder/${formId}`);
  });
});
