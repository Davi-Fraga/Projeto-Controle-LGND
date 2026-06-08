'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { TopPreRegistration } from '@central-da-manada/shared';
import {
  approvePreRegistration,
  getPendingCount,
  getPreRegistrations,
  rejectPreRegistration,
} from '@/features/pre-registrations/api';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ClipboardCheck, Check, X } from 'lucide-react';

export default function TopPreRegistrationsPage() {
  const params = useParams<{ id: string }>();
  const topId = params.id;
  const { loading: authLoading } = useRequireAuth();

  const [items, setItems] = useState<TopPreRegistration[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [list, counts] = await Promise.all([
        getPreRegistrations(topId, { status: 'PENDING', perPage: 100 }),
        getPendingCount(),
      ]);
      setItems(list.data);
      setPendingCount(counts.data.find((c) => c.topEventId === topId)?.count ?? list.meta.total);
      setError(null);
    } catch {
      setError('Não foi possível carregar as pré-inscrições.');
    } finally {
      setLoading(false);
    }
  }, [topId]);

  useEffect(() => {
    if (authLoading) return;
    reload();
  }, [authLoading, reload]);

  async function handleApprove() {
    if (!approvingId) return;
    const id = approvingId;
    setApprovingId(null);
    setBusyId(id);
    try {
      await approvePreRegistration(topId, id);
      await reload();
    } catch {
      setError('Não foi possível aprovar a pré-inscrição.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectPreRegistration(topId, id);
      await reload();
    } catch {
      setError('Não foi possível rejeitar a pré-inscrição.');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href={`/dashboard/tops/${topId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para o TOP
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <ClipboardCheck className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Pré-inscrições</h1>
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-400 border border-amber-500/20">
            {pendingCount} pendentes
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-400">Revise as pré-inscrições recebidas do Google Forms e aprove ou rejeite.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">{error}</div>
      ) : null}

      <DataTable<TopPreRegistration>
        loading={loading}
        items={items}
        emptyMessage="Nenhuma pré-inscrição pendente."
        columns={[
          { header: 'Nome', accessor: (i) => <span className="font-bold text-white">{i.fullName}</span> },
          { header: 'Igreja', accessor: (i) => i.churchName || <span className="text-zinc-600">—</span> },
          { header: 'Cidade', accessor: (i) => i.city || <span className="text-zinc-600">—</span> },
          {
            header: 'Contato',
            accessor: (i) => (
              <div className="flex flex-col">
                {i.phone ? <span>{i.phone}</span> : null}
                {i.email ? <span className="text-xs text-zinc-500">{i.email}</span> : null}
                {!i.phone && !i.email ? <span className="text-zinc-600">—</span> : null}
              </div>
            ),
          },
          { header: 'Status', accessor: (i) => <StatusBadge status={i.status} type="participant" /> },
          {
            header: 'Ações',
            className: 'text-right',
            accessor: (i) => (
              <div className="flex items-center justify-end gap-2">
                <button
                  disabled={busyId === i.id}
                  onClick={() => setApprovingId(i.id)}
                  className="flex h-7 items-center gap-1 rounded bg-emerald-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
                >
                  <Check className="h-3 w-3" />
                  Aprovar
                </button>
                <button
                  disabled={busyId === i.id}
                  onClick={() => handleReject(i.id)}
                  className="flex h-7 items-center gap-1 rounded border border-rose-900/30 bg-rose-950/20 px-3 text-[10px] font-bold uppercase tracking-wider text-rose-400 transition-colors hover:bg-rose-950/50 hover:text-rose-300 disabled:opacity-40"
                >
                  <X className="h-3 w-3" />
                  Rejeitar
                </button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        isOpen={approvingId !== null}
        title="Aprovar pré-inscrição"
        description="Ao aprovar, será criado um Legendário com os dados informados (vinculando a igreja se houver correspondência) e a pessoa será inscrita como participante deste TOP. Deseja continuar?"
        confirmLabel="Aprovar e inscrever"
        cancelLabel="Cancelar"
        onConfirm={handleApprove}
        onCancel={() => setApprovingId(null)}
        variant="warning"
      />
    </div>
  );
}
