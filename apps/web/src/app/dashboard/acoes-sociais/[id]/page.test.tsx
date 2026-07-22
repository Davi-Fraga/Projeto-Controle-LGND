import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SocialActionDetailPage from './page';
import { addSocialActionParticipant } from '@/features/social-actions/api';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'sa1' }), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children }: any) => <a>{children}</a> }));
vi.mock('@/hooks/use-require-auth', () => ({ useRequireAuth: () => ({ user: { permissions: [] }, loading: false }) }));
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

describe('SocialActionDetailPage', () => {
  it('adiciona participante via LegendarioCombobox (sem UUID manual)', async () => {
    render(<SocialActionDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Selecione o Legendário' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(addSocialActionParticipant).toHaveBeenCalledWith('sa1', expect.objectContaining({ legendaryId: 'lgnd-1' })));
    expect(screen.queryByPlaceholderText('ID do Legendário')).toBeNull();
  });
});
