import { test, expect } from '@playwright/test';
import { calculateSectionTime, calculateSectionTimeRaw } from '../src/lib/formCalculations';
import { Section } from '../src/types/form';

test.describe('Form Calculations - Estimativa de Tempo de Resposta', () => {
  test('deve retornar 0s para seção vazia sem vídeos', () => {
    const emptySection: Section = {
      id: 'sec-empty',
      form_id: 'form-1',
      title: 'Seção Vazia',
      order_index: 0,
      created_at: new Date().toISOString(),
      questions: [],
    };
    expect(calculateSectionTimeRaw(emptySection)).toBe(0);
    expect(calculateSectionTime(emptySection)).toBe('0s');
  });

  test('deve somar tempos de diferentes tipos de perguntas corretamente', () => {
    const section: Section = {
      id: 'sec-1',
      form_id: 'form-1',
      title: 'Diagnóstico',
      order_index: 0,
      created_at: new Date().toISOString(),
      questions: [
        { id: 'q1', section_id: 'sec-1', type: 'TEXT_SHORT', label: 'Q1', required: false, allow_add_item: false, order_index: 0, created_at: '' }, // 15s
        { id: 'q2', section_id: 'sec-1', type: 'TEXT_LONG', label: 'Q2', required: false, allow_add_item: false, order_index: 1, created_at: '' },  // 45s
        { id: 'q3', section_id: 'sec-1', type: 'RADIO_SINGLE', label: 'Q3', required: false, allow_add_item: false, order_index: 2, created_at: '' }, // 10s
        { id: 'q4', section_id: 'sec-1', type: 'CHECKBOX_MULTIPLE', label: 'Q4', required: false, allow_add_item: false, order_index: 3, created_at: '' }, // 15s
        { id: 'q5', section_id: 'sec-1', type: 'GRID_LIKERT', label: 'Q5', required: false, allow_add_item: false, order_index: 4, created_at: '' }, // 30s
      ],
    };
    // Total: 15 + 45 + 10 + 15 + 30 = 115s = 1m 55s
    expect(calculateSectionTimeRaw(section)).toBe(115);
    expect(calculateSectionTime(section)).toBe('1m 55s');
  });

  test('deve considerar o tempo de desbloqueio do vídeo da seção', () => {
    const sectionWithVideo: Section = {
      id: 'sec-video',
      form_id: 'form-1',
      title: 'Vídeo Obrigatório',
      order_index: 0,
      created_at: new Date().toISOString(),
      video_url: 'https://youtube.com/watch?v=demo',
      unlock_at_seconds: 120, // 2 minutos de vídeo
      questions: [
        { id: 'q1', section_id: 'sec-video', type: 'TEXT_SHORT', label: 'Q1', required: false, allow_add_item: false, order_index: 0, created_at: '' }, // 15s
      ],
    };
    // Total: 120 + 15 = 135s = 2m 15s
    expect(calculateSectionTimeRaw(sectionWithVideo)).toBe(135);
    expect(calculateSectionTime(sectionWithVideo)).toBe('2m 15s');
  });
});
