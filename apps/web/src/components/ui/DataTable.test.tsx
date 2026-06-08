import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';

type Row = { id: string; name: string };
const columns = [{ header: 'Nome', accessor: (i: Row) => i.name }];

describe('DataTable', () => {
  it('shows the empty message when there are no items', () => {
    render(<DataTable<Row> columns={columns} items={[]} emptyMessage="Nada aqui" />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  });

  it('renders one cell per item', () => {
    render(<DataTable<Row> columns={columns} items={[{ id: '1', name: 'Joao' }, { id: '2', name: 'Maria' }]} />);
    expect(screen.getByText('Joao')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('shows the loading state', () => {
    render(<DataTable<Row> columns={columns} items={[]} loading />);
    expect(screen.getByText(/Carregando dados/i)).toBeInTheDocument();
  });
});
