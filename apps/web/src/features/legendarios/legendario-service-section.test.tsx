import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LegendarioServiceSection } from './legendario-service-section';
import * as topsApi from '@/features/tops/api';

vi.mock('@/features/tops/api', () => ({
  addTopServant: vi.fn().mockResolvedValue({ data: {} }),
  updateTopServant: vi.fn().mockResolvedValue({ data: {} }),
  cancelTopServant: vi.fn().mockResolvedValue({ data: {} }),
  getTopOptions: vi.fn().mockResolvedValue({ data: [] }),
  getTopTeams: vi.fn().mockResolvedValue({ data: [] }),
}));

const servants = [
  { id: 's1', topEventId: 'top-1', legendaryId: 'leg-1', status: 'CONFIRMED', role: 'Logística', notes: 'obs 1', team: { name: 'Águias' }, topEvent: { number: 7, name: 'Rota do Cerrado' }, createdAt: '', updatedAt: '' },
  { id: 's2', topEventId: 'top-2', legendaryId: 'leg-1', status: 'CONFIRMED', role: null, notes: null, team: null, topEvent: { number: 8, name: 'Segunda Rota' }, createdAt: '', updatedAt: '' },
] as any;

const allPerms = { add: true, update: true, remove: true };
const noPerms = { add: false, update: false, remove: false };

describe('LegendarioServiceSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exibe a frase e todos os TOPs servidos de forma independente', () => {
    render(<LegendarioServiceSection legendarioId="leg-1" servants={servants} permissions={noPerms} onChanged={vi.fn()} />);
    expect(screen.getByText(/Já serviu em algum TOP/i)).toBeInTheDocument();
    expect(screen.getByText(/Rota do Cerrado/)).toBeInTheDocument();
    expect(screen.getByText(/Segunda Rota/)).toBeInTheDocument();
  });

  it('estado zero indica que ainda não serviu', () => {
    render(<LegendarioServiceSection legendarioId="leg-1" servants={[]} permissions={noPerms} onChanged={vi.fn()} />);
    expect(screen.getByText(/ainda não serviu/i)).toBeInTheDocument();
  });

  it('sem permissões de mutação, não mostra controles de adicionar/cancelar', () => {
    render(<LegendarioServiceSection legendarioId="leg-1" servants={servants} permissions={noPerms} onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Adicionar serviço/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar serviço/i })).not.toBeInTheDocument();
  });

  it('cancelar chama cancelTopServant no TOP/servant corretos e atualiza', async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<LegendarioServiceSection legendarioId="leg-1" servants={servants} permissions={{ add: false, update: false, remove: true }} onChanged={onChanged} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Cancelar serviço/i })[0]);
    await waitFor(() => expect(topsApi.cancelTopServant).toHaveBeenCalledWith('top-1', 's1'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('editar altera somente o item escolhido via updateTopServant', async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<LegendarioServiceSection legendarioId="leg-1" servants={servants} permissions={{ add: false, update: true, remove: false }} onChanged={onChanged} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Editar serviço/i })[0]);
    fireEvent.change(screen.getByDisplayValue('Logística'), { target: { value: 'Segurança' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar serviço/i }));
    await waitFor(() => expect(topsApi.updateTopServant).toHaveBeenCalledWith('top-1', 's1', expect.objectContaining({ role: 'Segurança' })));
    expect(onChanged).toHaveBeenCalled();
  });

  it('adicionar envia legendaryId no TOP escolhido e atualiza a coleção', async () => {
    vi.mocked(topsApi.getTopOptions).mockResolvedValue({ data: [{ id: 'top-9', value: 'top-9', label: 'TOP #9 - Nova Rota' }] } as any);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<LegendarioServiceSection legendarioId="leg-1" servants={[]} permissions={allPerms} onChanged={onChanged} />);

    // Abre o combobox de TOP e escolhe a opção retornada pela busca.
    // O gatilho passou a ser nomeado pela FUNÇÃO do campo ("TOP") e não mais pelo valor
    // exibido ("Buscar TOP"), que descrevia o estado e não dizia de que campo se tratava.
    fireEvent.click(screen.getByRole('button', { name: 'TOP' }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar TOP/i), { target: { value: 'nova' } });
    await waitFor(() => expect(topsApi.getTopOptions).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('TOP #9 - Nova Rota'));

    fireEvent.click(screen.getByRole('button', { name: /Adicionar serviço/i }));

    await waitFor(() => expect(topsApi.addTopServant).toHaveBeenCalled());
    const [topId, payload] = vi.mocked(topsApi.addTopServant).mock.calls[0];
    expect(topId).toBe('top-9');
    expect(payload).toMatchObject({ legendaryId: 'leg-1' });
    expect(onChanged).toHaveBeenCalled();
  });
});
