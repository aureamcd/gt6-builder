import { test, expect, Page } from '@playwright/test';
import { createEmptyForm } from '../src/lib/api';

test.describe('Consistência de Front-end, Navegação de Ida e Volta & Acesso Público e Privado', () => {
  test.describe.configure({ mode: 'serial' });

  const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
  const userEmail = `tester.consistency.${randomSuffix}@instituicao.org`;
  const userPassword = `PassConsistency#${randomSuffix}`;
  let formId = '';
  let shareToken = '';
  let privateShareToken = '';
  const privateAccessCode = 'GT-7788';

  async function ensureLoggedIn(page: Page) {
    await page.goto('/login');
    await page.waitForTimeout(600);

    const btnCriarConta = page.getByRole('button', { name: /Criar nova conta/i });
    if (await btnCriarConta.isVisible()) {
      await btnCriarConta.click();
      await page.waitForTimeout(300);
      await page.locator('input[type="email"]').fill(userEmail);
      await page.locator('input[type="password"]').fill(userPassword);
      await page.getByRole('button', { name: /^Cadastrar$/i }).click();
      await page.waitForTimeout(1200);

      const btnFazerLogin = page.getByRole('button', { name: /Fazer login/i });
      if (await btnFazerLogin.isVisible()) {
        await btnFazerLogin.click();
        await page.waitForTimeout(300);
      }
    }

    await page.locator('input[type="email"]').fill(userEmail);
    await page.locator('input[type="password"]').fill(userPassword);
    await page.getByRole('button', { name: /^Entrar$/i }).click();
    await page.waitForTimeout(1500);
  }

  test('1. Setup dos Formulários (Público e Privado) e Autenticação', async ({ page }) => {
    // 1. Setup de banco
    try {
      const publicForm = await createEmptyForm(
        `Formulário Público ${randomSuffix}`
      );
      formId = publicForm.id;
      shareToken = publicForm.share_token || '';

      const privateForm = await createEmptyForm(
        `Formulário Privado ${randomSuffix}`,
        {
          visibility: 'private',
          access_token: privateAccessCode,
        }
      );
      privateShareToken = privateForm.share_token || '';
    } catch (e) {
      console.error('Setup DB error:', e);
    }

    await ensureLoggedIn(page);

    if (!formId) {
      await page.goto('/');
      await page.waitForTimeout(800);
      const btnNovo = page.getByRole('button', { name: /Novo Questionário|Criar Formulário/i });
      if (await btnNovo.isVisible()) {
        await btnNovo.click();
        await page.waitForTimeout(400);
        const inputTitle = page.locator('input[placeholder*="Título"], input[placeholder*="Nome"]').first();
        if (await inputTitle.isVisible()) {
          await inputTitle.fill('Formulário de Teste de Consistência');
        }
        await page.getByRole('button', { name: /Criar|Salvar|Confirmar/i }).last().click();
        await page.waitForTimeout(1500);
        const match = page.url().match(/\/builder\/([a-zA-Z0-9_-]+)/);
        if (match) formId = match[1];
      }
    }

    expect(formId).toBeTruthy();
  });

  test('2. Navegação de Ida e Volta entre Rotas (Builder <-> Preview <-> Dashboard)', async ({ page }) => {
    await ensureLoggedIn(page);

    // Acessar Builder
    await page.goto(`/builder/${formId}`);
    await page.waitForTimeout(1000);

    // Adicionar seção
    const btnNovaSecao = page.getByRole('button', { name: /Nova Seção|Adicionar Seção/i });
    if (await btnNovaSecao.isVisible()) {
      await btnNovaSecao.click();
      await page.waitForTimeout(400);
    }

    // Salvar
    const btnSalvar = page.getByRole('button', { name: /Salvar/i });
    if (await btnSalvar.isVisible()) {
      await btnSalvar.click();
      await page.waitForTimeout(800);
    }

    // Ir para Preview
    await page.goto(`/preview/${formId}`);
    await page.waitForTimeout(1000);

    // Clicar em 'Voltar ao Editor'
    const btnVoltarEditor = page.getByRole('button', { name: /Voltar ao Editor/i });
    await expect(btnVoltarEditor).toBeVisible();
    await btnVoltarEditor.click();
    await page.waitForURL(new RegExp(`/builder/${formId}`), { timeout: 8000 });
    expect(page.url()).toContain(`/builder/${formId}`);

    // Ir para Dashboard e voltar
    await page.goto('/');
    await page.waitForTimeout(800);
    expect(page.url()).not.toContain('/login');
  });

  test('3. Ida e Volta no Stepper (Seção 1 -> Seção 2 -> Seção 1) com Persistência de Dados', async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto(`/preview/${formId}`);
    await page.waitForTimeout(1200);

    // Preencher campos na Seção 1
    const inputsSec1 = page.locator('input[type="text"]:visible, textarea:visible');
    const sec1Count = await inputsSec1.count();
    if (sec1Count > 0) {
      await inputsSec1.first().fill('Valor Inicial Seção 1');
    }

    // Avançar para a Seção 2
    const btnProxima = page.getByRole('button', { name: /^Próxima$/i });
    if (await btnProxima.isVisible()) {
      await btnProxima.click();
      await page.waitForTimeout(400);

      // Preencher campos na Seção 2
      const inputsSec2 = page.locator('input[type="text"]:visible, textarea:visible');
      const sec2Count = await inputsSec2.count();
      if (sec2Count > 0) {
        await inputsSec2.first().fill('Valor Inicial Seção 2');
      }

      // Clicar em "Anterior" para voltar à Seção 1
      const btnAnterior = page.getByRole('button', { name: /^Anterior$/i });
      await expect(btnAnterior).toBeVisible();
      await btnAnterior.click();
      await page.waitForTimeout(400);

      // VERIFICAÇÃO DE CONSISTÊNCIA: Valor da Seção 1 preservado
      if (sec1Count > 0) {
        const val1 = await inputsSec1.first().inputValue();
        expect(val1).toBe('Valor Inicial Seção 1');
      }

      // Avançar novamente para Seção 2
      await btnProxima.click();
      await page.waitForTimeout(400);

      // VERIFICAÇÃO DE CONSISTÊNCIA: Valor da Seção 2 preservado
      if (sec2Count > 0) {
        const val2 = await inputsSec2.first().inputValue();
        expect(val2).toBe('Valor Inicial Seção 2');
      }
    }
  });

  test('4. Navegação do Histórico do Navegador (Browser Back & Forward Popstate)', async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto(`/builder/${formId}`);
    await page.waitForTimeout(800);

    await page.goto(`/preview/${formId}`);
    await page.waitForTimeout(800);

    // Voltar no histórico
    await page.goBack();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain(`/builder/${formId}`);

    // Avançar no histórico
    await page.goForward();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain(`/preview/${formId}`);
  });

  test('5. Formulário PÚBLICO (/f/[token]): Acesso Livre, Preenchimento e Navegação Anônima', async ({ page }) => {
    if (shareToken) {
      await page.goto(`/f/${shareToken}`);
      await page.waitForTimeout(1500);

      // No formulário público, o modal de bloqueio não deve existir
      const passcodeInput = page.locator('input[placeholder*="GT-"]');
      await expect(passcodeInput).not.toBeVisible();

      // Preencher campos se houver
      const inputs = page.locator('input[type="text"]:visible, textarea:visible');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        await inputs.nth(i).fill('Resposta Pública Anônima');
      }

      // Navegar pelas seções se houver
      const btnProxima = page.getByRole('button', { name: /^Próxima$/i });
      if (await btnProxima.isVisible()) {
        await btnProxima.click();
        await page.waitForTimeout(400);
        const btnAnterior = page.getByRole('button', { name: /^Anterior$/i });
        await expect(btnAnterior).toBeVisible();
      }
    }
  });

  test('6. Formulário PRIVADO (/f/[token]): Bloqueio por Código, Validação de Erro e Desbloqueio', async ({ browser, page }) => {
    // 1. No Builder (como dono), mudar visibilidade para Privado
    await ensureLoggedIn(page);
    await page.goto(`/builder/${formId}`);
    await page.waitForTimeout(1000);

    // Clicar no botão 'Privado' na sidebar
    const btnPrivado = page.locator('button:has-text("Privado")').first();
    await btnPrivado.scrollIntoViewIfNeeded();
    await btnPrivado.click();
    await page.waitForTimeout(500);

    // Obter o código de acesso gerado ou preencher código fixo
    const inputTokenSidebar = page.locator('input[placeholder*="GT-"]').first();
    let accessCode = privateAccessCode;
    if (await inputTokenSidebar.isVisible()) {
      await inputTokenSidebar.fill(accessCode);
      await page.waitForTimeout(300);
    }

    // Aguardar 2.5s para o auto-save persistir as novas configurações no banco de dados
    await page.waitForTimeout(2500);

    // 2. Abrir contexto anônimo de respondente (sem login de dono)
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    await anonPage.goto(`/f/${shareToken}`);
    await anonPage.waitForTimeout(1500);

    // 3. Deve exibir tela de bloqueio com input de código
    const passcodeInput = anonPage.locator('input[placeholder*="GT-"]');
    await expect(passcodeInput).toBeVisible({ timeout: 10000 });
    await expect(anonPage.getByText(/Formulário Privado/i)).toBeVisible();

    // 4. Testar código INCORRETO
    await passcodeInput.fill('GT-9999');
    const btnAcessar = anonPage.getByRole('button', { name: /Acessar Questionário/i });
    await btnAcessar.click();
    await anonPage.waitForTimeout(400);

    // Deve exibir mensagem de erro amigável
    await expect(anonPage.getByText(/Código de acesso incorreto/i)).toBeVisible();

    // 5. Testar código CORRETO
    await passcodeInput.fill(accessCode);
    await btnAcessar.click();
    await anonPage.waitForTimeout(1000);

    // Após desbloquear, a tela de bloqueio com o input do código deve sumir
    await expect(passcodeInput).not.toBeVisible();

    await anonContext.close();
  });
});
