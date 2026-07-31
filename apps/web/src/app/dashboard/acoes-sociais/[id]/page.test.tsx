import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SocialActionDetailPage from './page';
import { addSocialActionParticipant } from '@/features/social-actions/api';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'sa1' }), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children }: any) => <a>{children}</a> }));
// Permissions do usuário sob teste — mutável para exercitar a autorização visual.
const permissions: string[] = [];
vi.mock('@/hooks/use-require-auth', () => ({ useRequireAuth: () => ({ user: { permissions }, loading: false }) }));
vi.mock('@/features/social-actions/api', () => ({
  getSocialAction: vi.fn().mockResolvedValue({ data: { id: 'sa1', title: 'Sopão', status: 'PLANNED', city: 'X', startDate: '', endDate: '' } }),
  getSocialActionParticipants: vi.fn().mockResolvedValue({ data: [] }),
  getVolunteerSuggestions: vi.fn().mockResolvedValue({ data: [] }),
  addSocialActionParticipant: vi.fn().mockResolvedValue({}),
  updateSocialActionParticipant: vi.fn(),
  removeSocialActionParticipant: vi.fn(),
  cancelSocialAction: vi.fn(),
  completeSocialAction: vi.fn(),
}));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ onChange, noneLabel }: any) => (
    <button type="button" aria-label={noneLabel} onClick={() => onChange('lgnd-1', 'Fulano')}>{noneLabel}</button>
  ),
}));

/** Substitui as permissions efetivas do usuário mockado para o teste seguinte. */
function withPermissions(...keys: string[]) {
  permissions.length = 0;
  permissions.push(...keys);
}

describe('SocialActionDetailPage', () => {
  it('adiciona participante via LegendarioCombobox (sem UUID manual)', async () => {
    withPermissions('social-actions.participants.add');
    render(<SocialActionDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Selecione o Legendário' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(addSocialActionParticipant).toHaveBeenCalledWith('sa1', expect.objectContaining({ legendaryId: 'lgnd-1' })));
    expect(screen.queryByPlaceholderText('ID do Legendário')).toBeNull();
  });

  /**
   * Esta tela não tinha NENHUMA checagem de permission antes da change
   * `acoes-web-e-seletores-contextuais`: concluir, cancelar e vincular participante ficavam
   * visíveis para qualquer um que conseguisse abrir a ação.
   */
  describe('autorização visual', () => {
    it('sem permission nenhuma, não oferece vincular participante nem concluir/cancelar', async () => {
      withPermissions();
      render(<SocialActionDetailPage />);

      await screen.findByText('Sopão');
      expect(screen.queryByRole('button', { name: 'Adicionar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Concluir Ação' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Cancelar Ação' })).toBeNull();
    });

    it('com social-actions.update oferece concluir e cancelar, mas não vincular participante', async () => {
      withPermissions('social-actions.update');
      render(<SocialActionDetailPage />);

      await screen.findByText('Sopão');
      expect(screen.getByRole('button', { name: 'Concluir Ação' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar Ação' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Adicionar' })).toBeNull();
    });

    it('permission de participante não destrava concluir/cancelar', async () => {
      withPermissions('social-actions.participants.add');
      render(<SocialActionDetailPage />);

      await screen.findByText('Sopão');
      expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Concluir Ação' })).toBeNull();
    });
  });
});
