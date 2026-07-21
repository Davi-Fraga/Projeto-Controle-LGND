import { render, screen, waitFor } from '@testing-library/react';
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
  TeamMemberForm: () => null,
}));

vi.mock('@/components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

describe('TeamMembersTable', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the member name as a keyboard-accessible profile link with team context', async () => {
    vi.mocked(getTeamMembers).mockResolvedValue({
      data: [{
        id: 'membership-1',
        teamId: 'team-1',
        legendaryId: 'legendary-1',
        legendary: { id: 'legendary-1', fullName: 'Joao Silva' },
        role: 'MEMBER',
        status: 'ACTIVE',
      }],
      meta: { page: 1, perPage: 50, total: 1, totalPages: 1 },
    } as any);

    render(<TeamMembersTable teamId="team-1" />);

    const link = await screen.findByRole('link', { name: 'Joao Silva' });
    await waitFor(() => expect(getTeamMembers).toHaveBeenCalled());
    expect(link).toHaveAttribute(
      'href',
      '/dashboard/legendarios/legendary-1?fromTeamId=team-1',
    );
  });
});
