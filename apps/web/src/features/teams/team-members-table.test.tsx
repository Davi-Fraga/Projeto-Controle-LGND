import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeamMembersTable } from './team-members-table';
import { getTeamMembers } from './api';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock('./api', () => ({
  getTeamMembers: vi.fn(),
  deactivateTeamMember: vi.fn(),
}));

vi.mock('./team-member-form', () => ({
  TeamMemberForm: ({ member }: { member?: unknown }) => (
    <div>{member ? 'Formulário de vínculo' : 'Formulário de novo membro'}</div>
  ),
}));

vi.mock('@/components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

describe('TeamMembersTable', () => {
  const memberResponse = {
    data: [{
      id: 'membership-1',
      teamId: 'team-1',
      legendaryId: 'legendary-1',
      legendary: { id: 'legendary-1', fullName: 'Joao Silva' },
      role: 'MEMBER',
      status: 'ACTIVE',
    }],
    meta: { page: 1, perPage: 50, total: 1, totalPages: 1 },
  };

  const readOnlyCapabilities = {
    addMembership: false,
    updateMembership: false,
    removeMembership: false,
    updateLegendary: false,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the member name as a keyboard-accessible profile link with team context', async () => {
    vi.mocked(getTeamMembers).mockResolvedValue(memberResponse as any);

    render(<TeamMembersTable teamId="team-1" capabilities={readOnlyCapabilities} />);

    const link = await screen.findByRole('link', { name: 'Joao Silva' });
    await waitFor(() => expect(getTeamMembers).toHaveBeenCalled());
    expect(link).toHaveAttribute(
      'href',
      '/dashboard/legendarios/legendary-1?fromTeamId=team-1',
    );
  });

  it('abre a edição canônica do cadastro e mantém a edição do vínculo separada', async () => {
    vi.mocked(getTeamMembers).mockResolvedValue(memberResponse as any);

    render(
      <TeamMembersTable
        teamId="team-1"
        capabilities={{
          ...readOnlyCapabilities,
          updateMembership: true,
          updateLegendary: true,
        }}
      />,
    );

    expect(await screen.findByRole('link', { name: 'Editar cadastro' })).toHaveAttribute(
      'href',
      '/dashboard/legendarios/legendary-1/editar?fromTeamId=team-1',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar vínculo' }));
    expect(screen.getByText('Formulário de vínculo')).toBeInTheDocument();
  });

  it('oculta ações de mutação sem as permissões correspondentes', async () => {
    vi.mocked(getTeamMembers).mockResolvedValue(memberResponse as any);

    render(<TeamMembersTable teamId="team-1" capabilities={readOnlyCapabilities} />);

    expect(await screen.findByRole('link', { name: 'Joao Silva' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar cadastro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar vínculo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inativar' })).not.toBeInTheDocument();
  });
});
