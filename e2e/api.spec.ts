import { test, expect } from '@playwright/test';

test.describe('API Forms & Endpoints', () => {
  test('GET /api/forms deve retornar 405 (Method Not Allowed) já que só aceita POST', async ({ request }) => {
    const response = await request.get('/api/forms');
    expect(response.status()).toBe(405);
  });

  test('POST /api/forms sem body obrigatório deve retornar 400', async ({ request }) => {
    const response = await request.post('/api/forms', {
      data: { invalidField: true },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('Rota inexistente deve retornar 404', async ({ request }) => {
    const response = await request.get('/api/rota-inexistente-12345');
    expect(response.status()).toBe(404);
  });
});
