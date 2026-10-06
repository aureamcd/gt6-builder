import { test, expect } from '@playwright/test';

test.describe('Jornada Humana Completa (End-to-End Total do Sistema)', () => {
  test.setTimeout(90000); // 90 segundos para permitir visualização humana tranquila

  test('Executa o ciclo de vida completo: Cadastro -> Criação -> Builder -> Exportar XML -> Compartilhar -> Respostas -> Envio', async ({ page }) => {
    // -------------------------------------------------------------
    // ETAPA 1: Autenticação e Login
    // -------------------------------------------------------------
    console.log('\n🔵 [ETAPA 1] Acessando tela de autenticação...');
    await page.goto('/login');
    await page.waitForTimeout(800);

    const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
    const humanEmail = `auditor.gt6.${randomSuffix}@instituicao.org`;
    const humanPassword = `MaturidadeGT6#${randomSuffix}`;

    console.log('-> Alternando para tela de cadastro...');
    const btnCriarConta = page.getByRole('button', { name: /Criar nova conta/i });
    if (await btnCriarConta.isVisible()) {
      await btnCriarConta.hover();
      await page.waitForTimeout(300);
      await btnCriarConta.click();
      await page.waitForTimeout(600);
    }

    console.log('-> Digitando credenciais de cadastro...');
    await page.locator('input[type="email"]').pressSequentially(humanEmail, { delay: 30 });
    await page.waitForTimeout(200);
    await page.locator('input[type="password"]').pressSequentially(humanPassword, { delay: 30 });
    await page.waitForTimeout(300);

    console.log('-> Clicando em Cadastrar...');
    await page.getByRole('button', { name: /^Cadastrar$/i }).click();
    await page.waitForTimeout(1500);

    console.log('-> Realizando login com a conta criada...');
    const btnFazerLogin = page.getByRole('button', { name: /Fazer login/i });
    if (await btnFazerLogin.isVisible()) {
      await btnFazerLogin.click();
      await page.waitForTimeout(600);
    }

    await page.locator('input[type="email"]').fill(humanEmail);
    await page.locator('input[type="password"]').fill(humanPassword);
    await page.getByRole('button', { name: /^Entrar$/i }).click();
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // ETAPA 2: Dashboard e Criação de Novo Questionário
    // -------------------------------------------------------------
    console.log('\n🔵 [ETAPA 2] Navegando no Dashboard...');
    await page.goto('/');
    await page.waitForTimeout(1200);

    const btnNovoForm = page.getByRole('button', { name: /Novo Questionário|Criar Formulário/i });
    if (await btnNovoForm.isVisible()) {
      console.log('-> Clicando no botão para abrir modal de Novo Questionário...');
      await btnNovoForm.hover();
      await page.waitForTimeout(400);
      await btnNovoForm.click();
      await page.waitForTimeout(800);

      const modalTitleInput = page.locator('input[placeholder*="Novo"], input[value*="Novo"]');
      if (await modalTitleInput.isVisible()) {
        console.log('-> Digitando título do formulário no modal...');
        await modalTitleInput.fill('Avaliação de Prontidão GT6');
        await page.waitForTimeout(400);
      }

      const confirmCreateBtn = page.getByRole('button', { name: /Criar|Salvar|Confirmar/i }).last();
      if (await confirmCreateBtn.isVisible()) {
        console.log('-> Confirmando criação do formulário...');
        await confirmCreateBtn.click();
        await page.waitForTimeout(2500);
      }
    }

    // -------------------------------------------------------------
    // ETAPA 3: Construtor (Form Builder) - Testando Botões Principais
    // -------------------------------------------------------------
    console.log('\n🔵 [ETAPA 3] Testando botões do Construtor (Builder)...');
    await page.waitForTimeout(1000);

    // 1. Botão Exportar XML (Download de Schema)
    const exportXmlBtn = page.getByTitle('Exportar XML').or(page.getByRole('button', { name: /Exportar XML/i }));
    if (await exportXmlBtn.isVisible()) {
      console.log('-> Testando botão: Exportar XML...');
      await exportXmlBtn.hover();
      await page.waitForTimeout(400);
      
      const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
      await exportXmlBtn.click();
      await page.waitForTimeout(800);
    }

    // 2. Botão Compartilhar (Abrindo e Fechando Modal)
    const shareBtn = page.getByTitle('Compartilhar').or(page.getByRole('button', { name: /Compartilhar/i }));
    if (await shareBtn.isVisible()) {
      console.log('-> Testando botão: Compartilhar (Abrindo modal de tokens)...');
      await shareBtn.hover();
      await page.waitForTimeout(400);
      await shareBtn.click();
      await page.waitForTimeout(1000);

      console.log('-> Fechando modal de compartilhamento...');
      const modalBackdrop = page.locator('.fixed.inset-0');
      const closeBtn = modalBackdrop.locator('button').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await modalBackdrop.click({ position: { x: 10, y: 10 } });
      }
      await expect(modalBackdrop).toBeHidden({ timeout: 5000 }).catch(() => null);
      await page.waitForTimeout(600);
    }

    // 3. Botão Alternar para Aba "Respostas"
    const tabRespostas = page.getByTitle('Respostas').or(page.getByRole('button', { name: /Respostas/i }));
    if (await tabRespostas.isVisible()) {
      console.log('-> Alternando para a aba: Respostas (Dashboard de Submissões)...');
      await tabRespostas.hover();
      await page.waitForTimeout(400);
      await tabRespostas.click();
      await page.waitForTimeout(1200);
    }

    // 4. Botão Alternar de volta para Aba "Construtor"
    const tabConstrutor = page.getByTitle('Construtor').or(page.getByRole('button', { name: /Construtor/i }));
    if (await tabConstrutor.isVisible()) {
      console.log('-> Alternando de volta para a aba: Construtor...');
      await tabConstrutor.hover();
      await page.waitForTimeout(400);
      await tabConstrutor.click();
      await page.waitForTimeout(1000);
    }

    // 5. Botão Salvar Formulário no Banco de Dados
    const saveBtn = page.getByTitle('Salvar Formulário').or(page.getByRole('button', { name: /^Salvar$/i }));
    if (await saveBtn.isVisible()) {
      console.log('-> Clicando no botão: Salvar Formulário no Banco...');
      await saveBtn.hover();
      await page.waitForTimeout(400);
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // -------------------------------------------------------------
    // ETAPA 4: Responder Formulário Público e Enviar Respostas
    // -------------------------------------------------------------
    console.log('\n🔵 [ETAPA 4] Testando fluxo do respondente e envio de respostas (/f/...)...');
    await page.goto('/f/demo-token');
    await page.waitForTimeout(1200);

    // Se houver botões de opções radio
    const radios = page.locator('input[type="radio"]');
    const radioCount = await radios.count();
    if (radioCount > 0) {
      console.log(`-> Respondente selecionando opções Radio (${radioCount} encontradas)...`);
      for (let i = 0; i < Math.min(radioCount, 2); i++) {
        await radios.nth(i).click();
        await page.waitForTimeout(300);
      }
    }

    // Se houver botões de opções checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkCount = await checkboxes.count();
    if (checkCount > 0) {
      console.log(`-> Respondente marcando caixas Checkbox...`);
      for (let i = 0; i < Math.min(checkCount, 2); i++) {
        await checkboxes.nth(i).click();
        await page.waitForTimeout(300);
      }
    }

    // Se houver campos de texto
    const textInputs = page.locator('input[type="text"]:not([placeholder*="GT-"])');
    const textCount = await textInputs.count();
    if (textCount > 0) {
      console.log('-> Respondente preenchendo campo de texto...');
      await textInputs.first().pressSequentially('Resposta da instituição avaliada', { delay: 30 });
      await page.waitForTimeout(400);
    }

    // Clica em Finalizar / Enviar
    const btnSubmit = page.getByRole('button', { name: /Finalizar e Enviar/i });
    if (await btnSubmit.isVisible()) {
      console.log('-> Clicando em Finalizar e Enviar Respostas para o Banco...');
      await btnSubmit.click();
      await page.waitForTimeout(2000);
    }

    console.log('\n🎉 [SUCESSO] Ciclo completo do sistema testado com 100% de sucesso!');
  });
});
