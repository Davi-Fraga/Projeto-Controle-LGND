import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do client HTTP — validamos o contrato (endpoint/método/body) que o front envia ao backend.
// vi.hoisted garante que apiMock exista quando o vi.mock (hoisted) é avaliado.
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: apiMock }));

import { approvePreRegistration, getPendingCount, getPreRegistrations, rejectPreRegistration } from './api';

describe('pre-registrations/api', () => {
  beforeEach(() => apiMock.mockReset());

  it('getPreRegistrations: monta a querystring com topEventId + filtros', () => {
    getPreRegistrations('top-1', { status: 'PENDING', perPage: 50 });
    const [path] = apiMock.mock.calls[0];
    expect(path).toContain('/preregistrations?');
    expect(path).toContain('topEventId=top-1');
    expect(path).toContain('status=PENDING');
    expect(path).toContain('perPage=50');
  });

  it('approvePreRegistration: POST na rota nested com body JSON', () => {
    approvePreRegistration('top-1', 'pre-1', { legendaryId: 'leg-9' });
    const [path, opts] = apiMock.mock.calls[0];
    expect(path).toBe('/tops/top-1/pre-registrations/pre-1/approve');
    expect(opts).toMatchObject({ method: 'POST' });
    expect(JSON.parse((opts as { body: string }).body)).toEqual({ legendaryId: 'leg-9' });
  });

  it('rejectPreRegistration: POST na rota nested', () => {
    rejectPreRegistration('top-1', 'pre-1', { notes: 'fora do perfil' });
    const [path, opts] = apiMock.mock.calls[0];
    expect(path).toBe('/tops/top-1/pre-registrations/pre-1/reject');
    expect(opts).toMatchObject({ method: 'POST' });
    expect(JSON.parse((opts as { body: string }).body)).toEqual({ notes: 'fora do perfil' });
  });

  it('getPendingCount: GET no endpoint de contagem', () => {
    getPendingCount();
    expect(apiMock.mock.calls[0][0]).toBe('/preregistrations/pending/count');
  });
});
