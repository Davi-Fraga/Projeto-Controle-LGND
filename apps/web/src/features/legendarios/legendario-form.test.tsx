import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegendarioForm } from './legendario-form';
import {
  getChurches,
  getExpertises,
  getProfessions,
  updateLegendario,
} from './api';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('./api', () => ({
  createChurch: vi.fn(),
  createLegendario: vi.fn(),
  getChurches: vi.fn(),
  getExpertises: vi.fn(),
  getProfessions: vi.fn(),
  updateLegendario: vi.fn(),
}));

vi.mock('@/features/tops/api', () => ({
  getTopOptions: vi.fn().mockResolvedValue({ data: [] }),
  getTopFamilyOptions: vi.fn().mockResolvedValue({ data: [] }),
}));

describe('LegendarioForm navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChurches).mockResolvedValue({ data: [] });
    vi.mocked(getProfessions).mockResolvedValue({ data: [] });
    vi.mocked(getExpertises).mockResolvedValue({ data: [] });
    vi.mocked(updateLegendario).mockResolvedValue({
      data: { id: 'legendary-1' },
    } as any);
  });

  it('retorna ao destino contextual depois de salvar uma edição', async () => {
    render(
      <LegendarioForm
        legendario={{
          id: 'legendary-1',
          fullName: 'Joao Silva',
          isFromRotaDoCerrado: true,
          servesInChurch: false,
          status: 'ACTIVE',
          socialActionInterest: false,
          needsReview: false,
          expertises: [],
          firstTopIsExternal: false,
        } as any}
        returnTo="/dashboard/legendarios/legendary-1?fromTeamId=team-1"
      />,
    );

    await waitFor(() => expect(getChurches).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Cadastro' }));

    await waitFor(() => expect(updateLegendario).toHaveBeenCalled());
    expect(router.push).toHaveBeenCalledWith(
      '/dashboard/legendarios/legendary-1?fromTeamId=team-1',
    );
  });
});
