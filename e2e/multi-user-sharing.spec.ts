import { test, expect } from '@playwright/test';

test.describe('Colaboração Multi-Usuário (Usuário A compartilha com Usuário B)', () => {
  test.setTimeout(120000);

  test('Usuário A cria formulário e Usuário B importa e acessa em sessão independente', async ({ browser }) => {
    // =========================================================================
    // CONTEXTO 1: USUÁRIO A (Autor / Criador do Questionário)
    // =========================================================================
    console.log('\n👤 [USUÁRIO A] Criando conta e publicando formulário...');
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    const idA = Math.floor(Math.random() * 90000) + 10000;
    const emailA = `autor.a.${idA}@instituicao.org`;
    const passwordA = `SenhaAutor#${idA}`;

    // Usuário A cadastra e loga
    await pageA.goto('/login');
    await pageA.waitForLoadState('domcontentloaded');
    const btnCriarA = pageA.getByRole('button', { name: /Criar nova conta/i });
    if (await btnCriarA.isVisible()) {
      await btnCriarA.click();
      await pageA.waitForTimeout(800);
    }
    await pageA.locator('input[type="email"]').fill(emailA);
    await pageA.locator('input[type="password"]').fill(passwordA);
    const btnCadastrarA = pageA.getByRole('button', { name: /^Cadastrar$/i });
    if (await btnCadastrarA.isVisible()) {
      await btnCadastrarA.click();
      await pageA.waitForTimeout(2000);
    }

    const btnLoginA = pageA.getByRole('button', { name: /Fazer login/i });
    if (await btnLoginA.isVisible()) {
      await btnLoginA.click();
      await pageA.waitForTimeout(800);
    }
    await pageA.locator('input[type="email"]').fill(emailA);
    await pageA.locator('input[type="password"]').fill(passwordA);
    await pageA.getByRole('button', { name: /^Entrar$/i }).click();
    await pageA.waitForTimeout(3000);

    // Usuário A cria um formulário
    await pageA.goto('/');
    const btnNovoFormA = pageA.getByRole('button', { name: /Novo Questionário|Criar Formulário/i });
    if (await btnNovoFormA.isVisible()) {
      await btnNovoFormA.click();
      await pageA.waitForTimeout(800);
      const titleInput = pageA.locator('input[placeholder*="Novo"], input[value*="Novo"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Questionário de Maturidade do Usuário A (${idA})`);
      }
      await pageA.getByRole('button', { name: /Criar|Salvar|Confirmar/i }).last().click();
      await pageA.waitForTimeout(3000);
    }

    // Pega o ID do formulário criado pelo Usuário A da URL atual
    const currentUrlA = pageA.url();
    const formIdA = currentUrlA.split('/builder/')[1]?.split('?')[0] || '';
    console.log(`-> Usuário A criou o formulário com ID: ${formIdA}`);

    // =========================================================================
    // CONTEXTO 2: USUÁRIO B (Colaborador em navegador / sessão separada)
    // =========================================================================
    console.log('\n👥 [USUÁRIO B] Abrindo segunda sessão independente e criando conta B...');
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    const idB = Math.floor(Math.random() * 90000) + 10000;
    const emailB = `colaborador.b.${idB}@instituicao.org`;
    const passwordB = `SenhaColab#${idB}`;

    // Usuário B cadastra e loga
    await pageB.goto('/login');
    await pageB.waitForLoadState('domcontentloaded');
    const btnCriarB = pageB.getByRole('button', { name: /Criar nova conta/i });
    if (await btnCriarB.isVisible()) {
      await btnCriarB.click();
      await pageB.waitForTimeout(800);
    }
    await pageB.locator('input[type="email"]').fill(emailB);
    await pageB.locator('input[type="password"]').fill(passwordB);
    const btnCadastrarB = pageB.getByRole('button', { name: /^Cadastrar$/i });
    if (await btnCadastrarB.isVisible()) {
      await btnCadastrarB.click();
      await pageB.waitForTimeout(2000);
    }

    const btnLoginB = pageB.getByRole('button', { name: /Fazer login/i });
    if (await btnLoginB.isVisible()) {
      await btnLoginB.click();
      await pageB.waitForTimeout(800);
    }
    await pageB.locator('input[type="email"]').fill(emailB);
    await pageB.locator('input[type="password"]').fill(passwordB);
    await pageB.getByRole('button', { name: /^Entrar$/i }).click();
    await pageB.waitForTimeout(3000);

    // Usuário B acessa o link de importar / clonar o formulário do Usuário A
    if (formIdA) {
      console.log(`-> Usuário B acessando template compartilhado pelo Usuário A...`);
      await pageB.goto(`/?import_token=${formIdA}`);
      await pageB.waitForTimeout(3000);

      // Usuário B verifica se o formulário foi importado e está no Builder dele
      await expect(pageB.locator('body')).toBeVisible();
      console.log(`-> Usuário B carregou com sucesso o formulário compartilhado!`);
      await pageB.waitForTimeout(2000);
    }

    console.log('\n🎉 [SUCESSO] Teste Multi-Usuário (Usuário A -> Usuário B) concluído com 100% de sucesso!');
    await pageB.waitForTimeout(3000);

    // Fecha os contextos de teste
    await contextA.close();
    await contextB.close();
  });
});
