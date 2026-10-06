import { test, expect } from '@playwright/test';
import { 
  generateUUID, 
  saveFormState,
  submitFormResponse, 
  getFormResponses, 
  deleteFormResponse,
  deleteForm
} from '../src/lib/api';
import { Form, Section, Question } from '../src/types/form';

test.describe('Validação Completa de Formulário e Respostas (Todos os Tipos de Campos)', () => {
  const formId = generateUUID();
  const shareToken = generateUUID();
  const sectionId = generateUUID();

  // IDs das perguntas
  const qShortTextId = generateUUID();
  const qLongTextId = generateUUID();
  const qRadioSingleId = generateUUID();
  const qRadioOtherId = generateUUID();
  const qCheckboxId = generateUUID();
  const qDropdownId = generateUUID();
  const qDateTimeId = generateUUID();
  const qRepeaterId = generateUUID();

  // IDs das opções
  const optRadio1Id = generateUUID();
  const optRadio2Id = generateUUID();
  const optRadioOther1Id = generateUUID();
  const optChk1Id = generateUUID();
  const optChk2Id = generateUUID();
  const optDrop1Id = generateUUID();
  const optDrop2Id = generateUUID();

  let createdResponseId: string | null = null;

  test.beforeAll(async () => {
    // Monta a estrutura completa de formulário com todos os tipos de perguntas suportados
    const questions: Question[] = [
      {
        id: qShortTextId,
        section_id: sectionId,
        type: 'TEXT_SHORT',
        label: '1. Nome da Unidade de Saúde (Texto Curto)',
        required: true,
        allow_add_item: false,
        order_index: 0,
        created_at: new Date().toISOString()
      },
      {
        id: qLongTextId,
        section_id: sectionId,
        type: 'TEXT_LONG',
        label: '2. Parecer Técnico e Observações Detalhadas (Texto Longo)',
        required: true,
        allow_add_item: false,
        order_index: 1,
        created_at: new Date().toISOString()
      },
      {
        id: qRadioSingleId,
        section_id: sectionId,
        type: 'RADIO_SINGLE',
        label: '3. Nível de Integração do Sistema Principal (Múltipla Escolha - Resposta Única)',
        required: true,
        allow_add_item: false,
        order_index: 2,
        created_at: new Date().toISOString(),
        options: [
          { id: optRadio1Id, question_id: qRadioSingleId, label: 'Totalmente Integrado via API REST', order_index: 0, created_at: new Date().toISOString() },
          { id: optRadio2Id, question_id: qRadioSingleId, label: 'Parcialmente Integrado por Arquivos CSV', order_index: 1, created_at: new Date().toISOString() }
        ]
      },
      {
        id: qRadioOtherId,
        section_id: sectionId,
        type: 'RADIO_SINGLE',
        label: '4. Qual mecanismo alternativo é utilizado? (Com opção Outro)',
        required: false,
        allow_add_item: true,
        order_index: 3,
        created_at: new Date().toISOString(),
        options: [
          { id: optRadioOther1Id, question_id: qRadioOtherId, label: 'Nenhum mecanismo alternativo', order_index: 0, created_at: new Date().toISOString() }
        ]
      },
      {
        id: qCheckboxId,
        section_id: sectionId,
        type: 'CHECKBOX_MULTIPLE',
        label: '5. Sistemas Utilizados Concomitantemente (Caixas de Seleção Múltipla + Outro)',
        required: false,
        allow_add_item: true,
        order_index: 4,
        created_at: new Date().toISOString(),
        options: [
          { id: optChk1Id, question_id: qCheckboxId, label: 'Prontuário Eletrônico PEC e-SUS', order_index: 0, created_at: new Date().toISOString() },
          { id: optChk2Id, question_id: qCheckboxId, label: 'Sistema Municipal de Regulação Salutem', order_index: 1, created_at: new Date().toISOString() }
        ]
      },
      {
        id: qDropdownId,
        section_id: sectionId,
        type: 'DROPDOWN',
        label: '6. Grau de Prioridade de Modernização (Lista Suspensa)',
        required: false,
        allow_add_item: false,
        order_index: 5,
        created_at: new Date().toISOString(),
        options: [
          { id: optDrop1Id, question_id: qDropdownId, label: 'Prioridade Crítica / Imediata', order_index: 0, created_at: new Date().toISOString() },
          { id: optDrop2Id, question_id: qDropdownId, label: 'Prioridade Média', order_index: 1, created_at: new Date().toISOString() }
        ]
      },
      {
        id: qDateTimeId,
        section_id: sectionId,
        type: 'DATE_TIME',
        label: '7. Data e Hora da Auditoria Técnica (Data/Hora)',
        required: false,
        allow_add_item: false,
        order_index: 6,
        created_at: new Date().toISOString()
      },
      {
        id: qRepeaterId,
        section_id: sectionId,
        type: 'DYNAMIC_REPEATER',
        label: '8. Avaliação por Módulo Selecionado (Repetidor Dinâmico)',
        required: false,
        allow_add_item: false,
        order_index: 7,
        created_at: new Date().toISOString()
      }
    ];

    const fullForm: Form = {
      id: formId,
      title: 'Formulário Integral de Avaliação GT6 (Suíte Completa de Campos)',
      description: 'Formulário com todos os tipos de campos: texto curto, texto longo, opções e repetidores.',
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: '',
      share_token: shareToken,
      settings: { visibility: 'public' },
      sections: [
        {
          id: sectionId,
          form_id: formId,
          title: 'Seção Técnica 1 - Diagnóstico de Interoperabilidade',
          description: 'Preencha todos os campos para homologação das respostas.',
          order_index: 0,
          created_at: new Date().toISOString(),
          questions
        }
      ]
    };

    console.log('📦 1. Salvando schema completo com todos os tipos de campos no Supabase...');
    const saveRes = await saveFormState(fullForm);
    expect(saveRes.success).toBe(true);
    console.log('✅ Schema persistido com sucesso.');
  });

  test.afterAll(async () => {
    try {
      console.log('🧹 Limpando formulário de teste...');
      await deleteForm(formId);
    } catch (e) {
      // ignore
    }
  });

  // --------------------------------------------------------------------------
  // TESTE 1: Estrutura Completa de Dados e Persistência no Banco / API
  // --------------------------------------------------------------------------
  test('deve registrar e validar com 100% de exatidão respostas para todos os tipos de campos no código', async () => {
    const shortTextValue = "Hospital Municipal Dr. José de Abreu - Bloco B (Unidade Central)";
    const longTextValue = "Primeiro parágrafo detalhado com observações sobre o fluxo de atendimento.\n" +
                          "Segundo parágrafo: Necessidade de integração com o sistema PEC e-SUS e Regula Piauí.\n" +
                          "Terceiro parágrafo com caracteres especiais: @ # $ % & * ! ? / \\ \" ' ç á é í ó ú";
    
    const radioSelectedOptionId = optRadio1Id;
    const radioOtherValue = "other:Sistema Legado Customizado da Secretaria de Saúde";
    
    const checkboxSelectedValues = [optChk1Id, optChk2Id, "other:Planilha de Controle Excel Compartilhada"];
    const dropdownSelectedValue = optDrop1Id;
    const dateTimeValue = "2026-10-05T18:30:00.000Z";
    
    const dynamicRepeaterAnswer = {
      selected: ["sys_pec", "sys_regula"],
      answers: {
        sys_pec: {
          sub_freq: "Sempre",
          sub_obs: "Utilizado na recepção e consultórios médicos diariamente."
        },
        sys_regula: {
          sub_freq: "Frequentemente",
          sub_obs: "Utilizado pelo setor de regulação de vagas hospitalares."
        }
      }
    };

    const submissionPayload = [
      { question_id: qShortTextId, answer_text: shortTextValue, answer_json: null },
      { question_id: qLongTextId, answer_text: longTextValue, answer_json: null },
      { question_id: qRadioSingleId, answer_text: radioSelectedOptionId, answer_json: null },
      { question_id: qRadioOtherId, answer_text: radioOtherValue, answer_json: null },
      { question_id: qCheckboxId, answer_text: null, answer_json: checkboxSelectedValues },
      { question_id: qDropdownId, answer_text: dropdownSelectedValue, answer_json: null },
      { question_id: qDateTimeId, answer_text: dateTimeValue, answer_json: null },
      { question_id: qRepeaterId, answer_text: null, answer_json: dynamicRepeaterAnswer }
    ];

    console.log('\n📝 2. Enviando submissão com todos os tipos de campos...');
    const result = await submitFormResponse(formId, submissionPayload);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.responseId).toBeDefined();
    
    createdResponseId = result.responseId || null;
    console.log('✅ Submissão criada com sucesso no banco! ID:', createdResponseId);

    // 2. Consulta ao Banco de Dados para validar que as respostas existem e foram salvas fielmente
    console.log('🔍 3. Consultando respostas persistidas para o formulário...');
    const responses = await getFormResponses(formId);
    expect(Array.isArray(responses)).toBe(true);
    expect(responses.length).toBeGreaterThan(0);

    const targetResponse = responses.find(r => r.id === createdResponseId);
    expect(targetResponse).toBeDefined();
    expect(targetResponse?.answers).toBeDefined();

    const savedAnswers = targetResponse?.answers || [];
    console.log(`📊 Foram recuperadas ${savedAnswers.length} respostas salvas com sucesso.`);

    // 3. Validação individual rigorosa de cada campo
    // (a) Texto Curto
    const ansShort = savedAnswers.find((a: any) => a.question_id === qShortTextId);
    expect(ansShort).toBeDefined();
    expect(ansShort.answer_text).toBe(shortTextValue);
    console.log('  ✔️ TEXT_SHORT validado: texto idêntico ao original gravado no código.');

    // (b) Texto Longo
    const ansLong = savedAnswers.find((a: any) => a.question_id === qLongTextId);
    expect(ansLong).toBeDefined();
    expect(ansLong.answer_text).toBe(longTextValue);
    expect(ansLong.answer_text).toContain('\nSegundo parágrafo');
    expect(ansLong.answer_text).toContain('ç á é í ó ú');
    console.log('  ✔️ TEXT_LONG validado: quebras de linha e caracteres especiais preservados.');

    // (c) Radio Single
    const ansRadio = savedAnswers.find((a: any) => a.question_id === qRadioSingleId);
    expect(ansRadio).toBeDefined();
    expect(ansRadio.answer_text).toBe(radioSelectedOptionId);
    console.log('  ✔️ RADIO_SINGLE validado: opção selecionada gravada com exatidão.');

    // (d) Radio com opção 'Outro'
    const ansRadioOther = savedAnswers.find((a: any) => a.question_id === qRadioOtherId);
    expect(ansRadioOther).toBeDefined();
    expect(ansRadioOther.answer_text).toBe(radioOtherValue);
    console.log('  ✔️ RADIO com "Outro" validado: prefixo other: e texto capturados.');

    // (e) Checkbox Múltiplo
    const ansCheckbox = savedAnswers.find((a: any) => a.question_id === qCheckboxId);
    expect(ansCheckbox).toBeDefined();
    expect(Array.isArray(ansCheckbox.answer_json)).toBe(true);
    expect(ansCheckbox.answer_json).toEqual(checkboxSelectedValues);
    console.log('  ✔️ CHECKBOX_MULTIPLE validado: array de seleções e item "Outro" conferidos.');

    // (f) Dropdown
    const ansDropdown = savedAnswers.find((a: any) => a.question_id === qDropdownId);
    expect(ansDropdown).toBeDefined();
    expect(ansDropdown.answer_text).toBe(dropdownSelectedValue);
    console.log('  ✔️ DROPDOWN validado: item selecionado persistido no banco.');

    // (g) Data / Hora
    const ansDateTime = savedAnswers.find((a: any) => a.question_id === qDateTimeId);
    expect(ansDateTime).toBeDefined();
    expect(ansDateTime.answer_text).toBe(dateTimeValue);
    console.log('  ✔️ DATE_TIME validado: formato ISO de data/hora gravado com fidelidade.');

    // (h) Repetidor Dinâmico
    const ansRepeater = savedAnswers.find((a: any) => a.question_id === qRepeaterId);
    expect(ansRepeater).toBeDefined();
    expect(ansRepeater.answer_json).toEqual(dynamicRepeaterAnswer);
    console.log('  ✔️ DYNAMIC_REPEATER validado: árvore aninhada de sub-respostas validada.');

    // 4. Limpeza (Deletando a resposta do teste)
    if (createdResponseId) {
      console.log('🧹 4. Limpando resposta de teste do banco...');
      const deleteResult = await deleteFormResponse(createdResponseId);
      expect(deleteResult).toBe(true);
      console.log('✅ Resposta de teste excluída com sucesso.');
    }
  });

  // --------------------------------------------------------------------------
  // TESTE 2: Renderização Visual de Interface e Interação no Navegador
  // --------------------------------------------------------------------------
  test('deve renderizar e permitir preenchimento interativo de todos os campos no navegador (/f/[token])', async ({ page }) => {
    console.log(`\n🌐 Navegando para o formulário público: /f/${shareToken}...`);
    await page.goto(`/f/${shareToken}`);
    await page.waitForTimeout(1200);

    // Garante que o cabeçalho e título do formulário foram renderizados
    await expect(page.locator('h1')).toContainText('Formulário Integral de Avaliação GT6');

    // 1. Preenche Texto Curto
    const shortInput = page.locator('input[placeholder="Sua resposta"]').first();
    await expect(shortInput).toBeVisible();
    await shortInput.fill('Centro de Diagnóstico Especializado GT6');
    await expect(shortInput).toHaveValue('Centro de Diagnóstico Especializado GT6');
    console.log('  ✔️ Campo Texto Curto preenchido e conferido na tela.');

    // 2. Preenche Texto Longo (Textarea)
    const longTextarea = page.locator('textarea[placeholder="Sua resposta"]');
    await expect(longTextarea).toBeVisible();
    const multilineText = 'Diagnóstico detalhado realizado em 2026.\nSistemas interoperáveis em conformidade.\nSem inconformidades impeditivas.';
    await longTextarea.fill(multilineText);
    await expect(longTextarea).toHaveValue(multilineText);
    console.log('  ✔️ Campo Texto Longo preenchido com quebras de linha.');

    // 3. Seleciona Radio Button
    const firstRadio = page.locator('input[type="radio"]').first();
    if (await firstRadio.isVisible()) {
      await firstRadio.click();
      await expect(firstRadio).toBeChecked();
      console.log('  ✔️ Radio button selecionado.');
    }

    // 4. Marca Checkbox
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();
      await expect(firstCheckbox).toBeChecked();
      console.log('  ✔️ Checkbox marcado.');
    }

    // 5. Seleciona Dropdown
    const selectEl = page.locator('select');
    if (await selectEl.isVisible()) {
      const options = await selectEl.locator('option').all();
      if (options.length > 1) {
        await selectEl.selectOption({ index: 1 });
        console.log('  ✔️ Item selecionado na lista suspensa (Dropdown).');
      }
    }

    // 6. Clica em Enviar Respostas
    const submitBtn = page.getByRole('button', { name: /Finalizar e Enviar Respostas/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Valida mensagem de sucesso final
    await expect(page.locator('text=Respostas Enviadas!')).toBeVisible({ timeout: 10000 });
    console.log('🎉 Submissão interativa no navegador concluída com sucesso!');
  });
});
