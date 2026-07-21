'use client';

import { useEffect, useState } from 'react';
import { cancelTopServant, getTopServants } from './api';
import { TopServantForm } from './top-servant-form';
import type { TopServant } from './types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Users, Plus, Edit2, ShieldAlert } from 'lucide-react';

export function TopServantsTable({ topId }: { topId: string }) {
  const [items, setItems] = useState<TopServant[]>([]);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<TopServant | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Custom dialog state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    getTopServants(topId, { page: 1, perPage: 50 })
      .then((r) => {
        setItems(r.data);
        setError(null);
      })
      .catch(() => setError('Não foi possível carregar servos do TOP.'));
  }, [topId, refresh]);

  function done() {
    setForm(false);
    setEditing(undefined);
    setRefresh((v) => v + 1);
  }

  async function handleConfirmCancel() {
    if (!cancellingId) return;
    try {
      await cancelTopServant(topId, cancellingId);
      done();
    } catch {
      setError('Não foi possível cancelar a alocação do servo.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Servos do TOP</h3>
        </div>
        <button
          className="flex h-9 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500"
          onClick={() => setForm(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar Servo
        </button>
      </div>

      {(form || editing) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
          <TopServantForm
            topId={topId}
            item={editing}
            onSaved={done}
            onCancel={() => {
              setForm(false);
              setEditing(undefined);
            }}
          />
        </div>
      )}

      {error ? <ErrorMessage message={error} /> : null}

      <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0B0C]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                <th className="px-5 py-3">Nome do Servo</th>
                <th className="px-5 py-3">Equipe de Serviço</th>
                <th className="px-5 py-3">Função</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {items.length ? (
                items.map((i) => (
                  <tr key={i.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-5 py-3 font-bold text-white">
                      {i.legendary?.fullName ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-zinc-300 font-semibold">
                      {i.team?.name ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-zinc-400 font-medium">
                      {i.role ?? '-'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={i.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="flex h-7 items-center gap-1 rounded bg-zinc-800 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700"
                          onClick={() => setEditing(i)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          className="flex h-7 items-center gap-1 rounded border border-rose-900/30 bg-rose-950/20 px-3 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                          onClick={() => setCancellingId(i.id)}
                        >
                          <ShieldAlert className="h-3 w-3" />
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-500 font-semibold">
                    Nenhum servo alocado neste TOP.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={cancellingId !== null}
        title="Cancelar Alocação de Servo"
        description="Tem certeza que deseja cancelar a alocação deste servo no TOP? O registro será marcado como cancelado."
        confirmLabel="Confirmar Cancelamento"
        cancelLabel="Voltar"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancellingId(null)}
        variant="danger"
      />
    </section>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">{message}</div>;
}
