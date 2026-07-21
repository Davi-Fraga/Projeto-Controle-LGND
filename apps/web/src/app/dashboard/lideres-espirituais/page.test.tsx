import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LideresEspirituaisPage from './page';

const mocks = vi.hoisted(() => ({
  getChurches: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-require-auth', () => ({
  useRequireAuth: () => ({ loading: false }),
}));

vi.mock('@/features/spiritual-leaders/api', () => ({
  getSpiritualLeaderChurches: mocks.getChurches,
}));

describe('LideresEspirituaisPage', () => {
  beforeEach(() => {
    mocks.getChurches.mockReset().mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Igreja ADEG',
        city: 'Goiania',
        spiritualLeaderUserId: null,
        spiritualLeaderName: null,
        spiritualLeaderPhone: null,
        spiritualLeader: null,
        _count: { legendarios: 2 },
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Igreja do Aprisco',
        city: 'Goiania',
        spiritualLeaderUserId: null,
        spiritualLeaderName: null,
        spiritualLeaderPhone: null,
        spiritualLeader: null,
        _count: { legendarios: 1 },
      },
    ]);
  });

  it('links each church to its own filtered legendary list', async () => {
    render(<LideresEspirituaisPage />);

    const links = await screen.findAllByRole('link', { name: /Ver legendários/i });
    expect(links[0]).toHaveAttribute(
      'href',
      '/dashboard/legendarios?churchId=11111111-1111-4111-8111-111111111111&churchName=Igreja%20ADEG',
    );
    expect(links[1]).toHaveAttribute(
      'href',
      '/dashboard/legendarios?churchId=22222222-2222-4222-8222-222222222222&churchName=Igreja%20do%20Aprisco',
    );
  });
});
