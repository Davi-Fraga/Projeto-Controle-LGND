import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildFamilyPayload, TopFamiliesSection } from './top-families-section';
import * as api from './api';

vi.mock('@/features/legendarios/api', () => ({
  getLegendario: vi.fn().mockResolvedValue({ data: { fullName: 'Rep' } }),
  getLegendarioOptions: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('./api', () => ({
  addTopFamilyMember: vi.fn().mockResolvedValue({ data: {} }),
  createTopFamily: vi.fn(),
  deactivateTopFamily: vi.fn(),
  deactivateTopFamilyMember: vi.fn(),
  getLegendarioOptions: vi.fn().mockResolvedValue({ data: [] }),
  getTopFamilies: vi.fn().mockResolvedValue({ data: [] }),
  getTopFamilyMembers: vi.fn().mockResolvedValue({ data: [] }),
  getTopParticipantOptions: vi.fn().mockResolvedValue({ data: [] }),
  transferTopFamilyMember: vi.fn(),
  updateTopFamily: vi.fn(),
}));

const allPermissions = { create: true, update: true, delete: true, addMember: true, transferMember: true, removeMember: true };

const form = {
  name: 'Familia Leoes',
  representativeLegendaryId: '',
  representativeRole: '',
  deputyRepresentativeLegendaryId: '',
  deputyRepresentativeRole: '',
  notes: '',
  needsReview: false,
};

describe('TopFamiliesSection', () => {
  it('sends null for cleared optional fields while editing', () => {
    expect(buildFamilyPayload(form, true)).toMatchObject({
      representativeLegendaryId: null,
      representativeRole: null,
      deputyRepresentativeLegendaryId: null,
      deputyRepresentativeRole: null,
      notes: null,
    });
  });

  it('omits empty optional fields while creating', () => {
    expect(buildFamilyPayload(form, false)).toMatchObject({
      representativeLegendaryId: undefined,
      representativeRole: undefined,
      deputyRepresentativeLegendaryId: undefined,
      deputyRepresentativeRole: undefined,
      notes: undefined,
    });
  });

  it('hides mutation controls without family permissions', async () => {
    render(
      <TopFamiliesSection
        topId="top-1"
        permissions={{
          create: false,
          update: false,
          delete: false,
          addMember: false,
          transferMember: false,
          removeMember: false,
        }}
      />,
    );

    await waitFor(() => expect(screen.queryByText('Não foi possível carregar famílias do TOP.')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Criar Familia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adicionar Membro/i })).not.toBeInTheDocument();
  });

  it('não mostra campo de observação original (uma única observação geral)', async () => {
    render(<TopFamiliesSection topId="top-1" permissions={allPermissions} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Adicionar Membro/i })).toBeInTheDocument());
    expect(screen.queryByText('Observação original')).not.toBeInTheDocument();
  });

  it('exibe somente notes no card do membro, sem a linha "Origem"', async () => {
    vi.mocked(api.getTopFamilies).mockResolvedValueOnce({
      data: [{ id: 'fam1', name: 'Família 1', needsReview: false, representative: null, deputyRepresentative: null }],
    } as any);
    // `sourceNotes` deixou de existir na Fase 2: a API não devolve mais o campo. O card
    // exibe só `notes`, e a linha "Origem" não pode voltar por regressão de UI.
    vi.mocked(api.getTopFamilyMembers).mockResolvedValueOnce({
      data: [{ id: 'm1', topParticipantId: 'pp1', status: 'ACTIVE', needsReview: false, notes: 'nota geral', topParticipant: { legendary: { fullName: 'João' } } }],
    } as any);

    render(<TopFamiliesSection topId="top-1" permissions={allPermissions} />);

    await waitFor(() => expect(screen.getByText('nota geral')).toBeInTheDocument());
    expect(screen.queryByText(/Origem:/)).not.toBeInTheDocument();
  });

  it('adiciona membro sem enviar sourceNotes e limpa a seleção após sucesso', async () => {
    vi.mocked(api.getTopFamilies).mockResolvedValue({
      data: [{ id: 'fam1', name: 'Família 1', needsReview: false, representative: null, deputyRepresentative: null }],
    } as any);
    vi.mocked(api.getTopFamilyMembers).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.getTopParticipantOptions).mockResolvedValue({
      data: [{ id: 'pp1', value: 'pp1', label: 'João', metadata: { legendaryId: 'l1', fullName: 'João', city: 'GO', lgndNumber: 'A1' } }],
    } as any);

    render(<TopFamiliesSection topId="top-1" permissions={allPermissions} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Adicionar Membro/i })).toBeInTheDocument());

    // Seleciona a Família no único select nativo presente.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fam1' } });

    // Abre o combobox de participante e escolhe a opção retornada pela busca no backend.
    fireEvent.click(screen.getByRole('button', { name: 'Buscar participante' }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar participante/i), { target: { value: 'joao' } });
    await waitFor(() => expect(api.getTopParticipantOptions).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('João'));

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Membro/i }));

    await waitFor(() => expect(api.addTopFamilyMember).toHaveBeenCalled());
    const payload = vi.mocked(api.addTopFamilyMember).mock.calls[0][2] as Record<string, unknown>;
    expect(payload).toMatchObject({ topParticipantId: 'pp1' });
    expect(payload).not.toHaveProperty('sourceNotes');

    // availableForFamily=true acompanha a busca de participantes elegíveis.
    expect(vi.mocked(api.getTopParticipantOptions).mock.calls.some(([, filters]) => (filters as any)?.availableForFamily === true)).toBe(true);
  });
});
