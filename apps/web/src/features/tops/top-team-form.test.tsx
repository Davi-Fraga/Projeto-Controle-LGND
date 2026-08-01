import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopTeamForm } from './top-team-form';
import { addTopTeam, getTeamsOptionsList, updateTopTeam } from './api';

vi.mock('./api', () => ({
  getTeamsOptionsList: vi.fn().mockResolvedValue({ data: [] }),
  addTopTeam: vi.fn().mockResolvedValue({}),
  updateTopTeam: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/features/legendarios/legendario-combobox', () => ({
  LegendarioCombobox: ({ noneLabel }: any) => <button type="button" aria-label={noneLabel}>{noneLabel}</button>,
}));

describe('TopTeamForm', () => {
  it('migra coordenador e subcoordenador para LegendarioCombobox', async () => {
    render(<TopTeamForm topId="t1" onSaved={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Não definido' })).toHaveLength(2));
  });

  it('não carrega a lista completa de Equipes na montagem', async () => {
    render(<TopTeamForm topId="t1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Não definido' })).toHaveLength(2));
    // O formulário usava `GET /teams?perPage=100` (lista inteira, gated por `teams.read`).
    // Agora só busca sob demanda, e nada é pedido antes de o usuário digitar.
    expect(getTeamsOptionsList).not.toHaveBeenCalled();
  });

  it('exige a equipe: sem seleção, avisa e não chama a API', async () => {
    render(<TopTeamForm topId="t1" onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    // O `select` antigo tinha `required` e era barrado pelo browser; o combobox não é
    // controle nativo, então sem esta guarda o formulário mandava teamId vazio e tomava 400.
    expect(await screen.findByText('Selecione a equipe.')).toBeInTheDocument();
    expect(addTopTeam).not.toHaveBeenCalled();
  });

  it('envia null (não string vazia) nos dirigentes deixados em branco', async () => {
    render(
      <TopTeamForm topId="t1" item={{ id: 'tt1', teamId: 'team-1' } as any} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    // `@IsOptional()` do class-validator só ignora null/undefined — string vazia chega no
    // `@IsUUID()` e a API responde 400. E `null`, diferente de `undefined`, é o que LIMPA
    // o dirigente na edição: sem a chave no corpo o backend manteria o anterior.
    await waitFor(() => expect(updateTopTeam).toHaveBeenCalledWith('t1', 'tt1', expect.objectContaining({
      coordinatorLegendaryId: null,
      deputyCoordinatorLegendaryId: null,
    })));
  });
});
