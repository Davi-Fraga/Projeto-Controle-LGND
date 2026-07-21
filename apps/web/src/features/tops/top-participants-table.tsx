'use client';

import { useEffect, useState } from 'react';
import { cancelTopParticipant, getTopParticipants } from './api';
import { TopParticipantForm } from './top-participant-form';
import type { TopParticipant } from './types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Users, Plus, Edit2, ShieldAlert } from 'lucide-react';

export function TopParticipantsTable({ topId }: { topId: string }) {
  const [items, setItems] = useState<TopParticipant[]>([]);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<TopParticipant | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Custom dialog state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    getTopParticipants(topId, { page: 1, perPage: 50 })
      .then((r) => {
        setItems(r.data);
        setError(null);
      })
      .catch(() => setError('Não foi possível carregar participantes do TOP.'));
  }, [topId, refresh]);

  function done() {
    setForm(false);
    setEditing(undefined);
    setRefresh((v) => v + 1);
  }

  async function handleConfirmCancel() {
    if (!cancellingId) return;
    try {
      await cancelTopParticipant(topId, cancellingId);
      done();
    } catch {
      setError('Não foi possível cancelar o participante.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Participantes do TOP</h3>
        </div>
        <button
          className="flex h-9 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500"
          onClick={() => setForm(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar Participante
        </button>
      </div>

      {(form || editing) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
          <TopParticipantForm
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

      <Rows items={items} onEdit={setEditing} onCancel={setCancellingId} />

      <ConfirmDialog
        isOpen={cancellingId !== null}
        title="Cancelar Inscrição"
        description="Tem certeza que deseja cancelar a inscrição deste participante no TOP? O registro será marcado como cancelado."
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

function Rows({
  items,
  onEdit,
  onCancel,
}: {
  items: TopParticipant[];
  onEdit: (i: TopParticipant) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0B0C]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
              <th className="px-5 py-3">Nome do Participante</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {items.length ? (
              items.map((i) => (
                <tr key={i.id} className="hover:bg-zinc-900/20 transition-colors">
                  <td className="px-5 py-3 font-bold text-white">
                    {i.legendary?.fullName || 'Visitante/Novo'}
                  </td>
                  <td className="px-5 py-3 text-zinc-300 font-medium">
                    {i.type === 'NEW_PARTICIPANT' ? 'Novo Participante' : i.type === 'LEGENDARY' ? 'Legendário' : i.type}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="flex h-7 items-center gap-1 rounded bg-zinc-800 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700"
                        onClick={() => onEdit(i)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </button>
                      <button
                        className="flex h-7 items-center gap-1 rounded border border-rose-900/30 bg-rose-950/20 px-3 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                        onClick={() => onCancel(i.id)}
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
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 font-semibold">
                  Nenhum participante inscrito neste TOP.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
