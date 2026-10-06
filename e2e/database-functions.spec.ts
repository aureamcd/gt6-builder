import { test, expect } from '@playwright/test';
import { 
  generateUUID, 
  generateAccessToken, 
  getFormByShareToken, 
  submitFormResponse, 
  getFormResponses, 
  getComments, 
  addComment, 
  deleteFormResponse 
} from '../src/lib/api';

test.describe('Funções de Banco de Dados, APIs & Submissões (api.ts)', () => {
  test('generateUUID deve gerar identificadores únicos válidos v4', () => {
    const id1 = generateUUID();
    const id2 = generateUUID();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test('generateAccessToken deve gerar tokens com prefixo GT- e 4 caracteres alfanuméricos', () => {
    const token = generateAccessToken();
    expect(token).toMatch(/^GT-[A-Z0-9]{4}$/);
  });

  test('getFormByShareToken deve retornar null para tokens inexistentes sem quebrar o banco', async () => {
    const nonExistentToken = 'TOKEN_INEXISTENTE_XYZ_9999';
    const result = await getFormByShareToken(nonExistentToken);
    expect(result).toBeNull();
  });

  test('submitFormResponse deve tratar respostas para formulários inválidos graciosamente', async () => {
    const fakeFormId = generateUUID();
    const mockAnswers = [
      { question_id: 'q1', answer_text: 'Minha resposta teste' },
      { question_id: 'q2', answer_json: ['Opcao A', 'Opcao B'] }
    ];

    const result = await submitFormResponse(fakeFormId, mockAnswers);
    // Deve retornar objeto estruturado com success ou error, sem travar com exceção não tratada
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  test('getFormResponses deve retornar array para qualquer id consultado', async () => {
    const fakeFormId = generateUUID();
    const responses = await getFormResponses(fakeFormId);
    expect(Array.isArray(responses)).toBe(true);
  });

  test('getComments deve retornar lista vazia ou de comentários sem falha', async () => {
    const fakeFormId = generateUUID();
    const comments = await getComments(fakeFormId);
    expect(Array.isArray(comments)).toBe(true);
  });
});
