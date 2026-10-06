import { test, expect } from '@playwright/test';
import { exportFormToXML, parseFormFromXML } from '../src/lib/xmlHandler';
import { Form } from '../src/types/form';

test.describe('XML Handler - Exportação e Importação de Schemas', () => {
  const sampleForm: Form = {
    id: 'test-form-123',
    title: 'Questionário de Maturidade GT6',
    description: 'Avaliação de prontidão operacional',
    user_id: 'user-abc',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    share_token: 'TOKEN-123',
    settings: {
      visibility: 'public',
      allow_anonymous: true,
      require_auth: false,
    },
    sections: [
      {
        id: 'sec-1',
        form_id: 'test-form-123',
        title: 'Seção 1: Diagnóstico',
        description: 'Perguntas iniciais',
        unlock_at_seconds: 30,
        video_url: 'https://youtube.com/watch?v=123456',
        order_index: 0,
        created_at: '2026-01-01T00:00:00Z',
        questions: [
          {
            id: 'q-1',
            section_id: 'sec-1',
            type: 'TEXT_SHORT',
            label: 'Qual é o nome da sua instituição?',
            required: true,
            allow_add_item: false,
            order_index: 0,
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'q-2',
            section_id: 'sec-1',
            type: 'RADIO_SINGLE',
            label: 'Qual o nível de maturidade atual?',
            required: true,
            allow_add_item: true,
            order_index: 1,
            created_at: '2026-01-01T00:00:00Z',
            options: [
              { id: 'opt-1', question_id: 'q-2', label: 'Básico', order_index: 0, created_at: '' },
              { id: 'opt-2', question_id: 'q-2', label: 'Intermediário', order_index: 1, created_at: '' },
              { id: 'opt-3', question_id: 'q-2', label: 'Avançado', order_index: 2, created_at: '' },
            ],
          },
          {
            id: 'q-3',
            section_id: 'sec-1',
            type: 'CHECKBOX_MULTIPLE',
            label: 'Quais áreas estão envolvidas?',
            required: false,
            allow_add_item: false,
            order_index: 2,
            created_at: '2026-01-01T00:00:00Z',
            options: [
              { id: 'opt-a', question_id: 'q-3', label: 'TI', order_index: 0, created_at: '' },
              { id: 'opt-b', question_id: 'q-3', label: 'Operações', order_index: 1, created_at: '' },
              { id: 'opt-c', question_id: 'q-3', label: 'Diretoria', order_index: 2, created_at: '' },
            ],
          },
        ],
      },
    ],
    status: 'published',
  };

  test('deve exportar formulário completo para XML válido e com cabeçalho correto', () => {
    const { content, filename } = exportFormToXML(sampleForm);
    expect(filename).toContain('schema_Questionário_de_Maturidade_GT6.xml');
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(content).toContain('<FormSchema>');
    expect(content).toContain('Questionário de Maturidade GT6');
    expect(content).toContain('Qual é o nome da sua instituição?');
  });

  test('deve importar XML e restaurar fielmente o schema original', () => {
    const { content } = exportFormToXML(sampleForm);
    const parsed = parseFormFromXML(content);

    expect(parsed.title).toBe(sampleForm.title);
    expect(parsed.description).toBe(sampleForm.description);
    expect(parsed.sections?.length).toBe(1);
    expect(parsed.sections?.[0].title).toBe('Seção 1: Diagnóstico');
    expect(parsed.sections?.[0].questions?.length).toBe(3);
    expect(parsed.sections?.[0].questions?.[0].label).toBe('Qual é o nome da sua instituição?');
  });

  test('deve lançar erro descritivo ao tentar importar XML sem FormSchema', () => {
    const invalidXml = '<?xml version="1.0"?><InvalidRoot><Item>Test</Item></InvalidRoot>';
    expect(() => parseFormFromXML(invalidXml)).toThrow(/Formato XML inválido/i);
  });
});
