import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { buildFamilyPayload, TopFamiliesSection } from './top-families-section';

vi.mock('./api', () => ({
  addTopFamilyMember: vi.fn(),
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

    await waitFor(() => expect(screen.queryByText('Nao foi possivel carregar familias do TOP.')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Criar Familia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adicionar Membro/i })).not.toBeInTheDocument();
  });
});
