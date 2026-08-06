import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DataTable } from './DataTable';

type Row = { id: string; name: string };
const columns = [{ header: 'Nome', accessor: (i: Row) => i.name }];

/**
 * A partir da task 5.3 o componente renderiza DUAS composições do mesmo dado: a tabela
 * (visível de `md` para cima) e a lista de cartões (visível no mobile). No navegador só
 * uma aparece — a outra é `display:none`, portanto também fora da árvore de acessibilidade.
 * O JSDOM não aplica CSS, então as consultas destes testes precisam ser escopadas a uma
 * das composições; `getByText` solto encontraria as duas e falharia.
 */
const desktop = () => within(screen.getByTestId('datatable-desktop'));

describe('DataTable', () => {
  it('shows the empty message when there are no items', () => {
    render(<DataTable<Row> columns={columns} items={[]} emptyMessage="Nada aqui" />);
    expect(desktop().getByText('Nada aqui')).toBeInTheDocument();
  });

  it('renders one cell per item', () => {
    render(<DataTable<Row> columns={columns} items={[{ id: '1', name: 'Joao' }, { id: '2', name: 'Maria' }]} />);
    expect(desktop().getByText('Joao')).toBeInTheDocument();
    expect(desktop().getByText('Maria')).toBeInTheDocument();
  });

  it('shows the loading state', () => {
    render(<DataTable<Row> columns={columns} items={[]} loading />);
    expect(desktop().getByText(/Carregando dados/i)).toBeInTheDocument();
  });
});

/**
 * Padrão responsivo de tabela (change refinar-design-system, task 5.3).
 *
 * O risco de uma tabela larga no mobile é perder uma de duas coisas: quem é o registro
 * (rolagem horizontal empurra o nome para fora) ou o que dá para fazer com ele (a coluna
 * de ações fica no fim). O cartão existe para preservar as duas.
 */
describe('DataTable — cartões no mobile', () => {
  type Registro = { id: string; nome: string; cidade: string; telefone: string };
  const items: Registro[] = [
    { id: '1', nome: 'João Silva', cidade: 'Caldas Novas', telefone: '(64) 99248-5187' },
    { id: '2', nome: 'Marcos Lima', cidade: 'Morrinhos', telefone: '(64) 99111-2222' },
  ];
  const columns = [
    { header: 'Nome', accessor: (r: Registro) => <strong>{r.nome}</strong>, role: 'title' as const },
    { header: 'Cidade', accessor: (r: Registro) => r.cidade },
    { header: 'Telefone', accessor: (r: Registro) => r.telefone },
    { header: 'Ações', accessor: () => <button type="button">Ver</button>, role: 'actions' as const },
  ];

  it('renderiza as duas composições: tabela e lista de cartões', () => {
    render(<DataTable columns={columns} items={items} />);

    expect(screen.getByTestId('datatable-desktop')).toBeInTheDocument();
    expect(screen.getByTestId('datatable-mobile')).toBeInTheDocument();
  });

  it('o cartão preserva identificação e ações do registro', () => {
    render(<DataTable columns={columns} items={items} />);

    const cartoes = within(screen.getByTestId('datatable-mobile')).getAllByRole('listitem');
    expect(cartoes).toHaveLength(2);

    expect(within(cartoes[0]).getByText('João Silva')).toBeInTheDocument();
    expect(within(cartoes[0]).getByRole('button', { name: 'Ver' })).toBeInTheDocument();
  });

  it('detalhes secundários viram pares rótulo/valor, não colunas espremidas', () => {
    render(<DataTable columns={columns} items={items} />);

    const primeiro = within(screen.getByTestId('datatable-mobile')).getAllByRole('listitem')[0];
    expect(within(primeiro).getByText('Cidade')).toBeInTheDocument();
    expect(within(primeiro).getByText('Caldas Novas')).toBeInTheDocument();
    expect(within(primeiro).getByText('(64) 99248-5187')).toBeInTheDocument();
  });

  it('sem coluna marcada como título, usa a primeira — nunca fica um cartão anônimo', () => {
    const semPapeis = [
      { header: 'Nome', accessor: (r: Registro) => <strong>{r.nome}</strong> },
      { header: 'Cidade', accessor: (r: Registro) => r.cidade },
    ];
    render(<DataTable columns={semPapeis} items={items} />);

    const primeiro = within(screen.getByTestId('datatable-mobile')).getAllByRole('listitem')[0];
    expect(within(primeiro).getByText('João Silva')).toBeInTheDocument();
  });

  it('o vazio aparece nas duas composições', () => {
    render(<DataTable columns={columns} items={[]} emptyMessage="Nada por aqui" />);

    expect(within(screen.getByTestId('datatable-mobile')).getByText('Nada por aqui')).toBeInTheDocument();
    expect(within(screen.getByTestId('datatable-desktop')).getByText('Nada por aqui')).toBeInTheDocument();
  });
});
