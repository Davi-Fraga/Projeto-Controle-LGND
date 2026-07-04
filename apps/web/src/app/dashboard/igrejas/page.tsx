'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, Edit2, Eye, MapPin, Phone, Trash2, User } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { hasPermission } from '@/lib/permissions';
import { deleteChurch, getChurches } from '@/features/churches/api';
import type { Church } from '@/features/churches/api';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChurchDetailModal } from '@/features/churches/church-detail-modal';
import { ApiError } from '@/lib/api';

export default function IgrejasPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingChurch, setDeletingChurch] = useState<Church | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    getChurches()
      .then((response) => setChurches(response.data))
      .catch(() => setError('Não foi possível carregar as igrejas.'))
      .finally(() => setLoading(false));
  }, [authLoading]);

  async function handleConfirmDelete() {
    if (!deletingChurch) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteChurch(deletingChurch.id);
      setChurches((current) => current.filter((c) => c.id !== deletingChurch.id));
      setDeletingChurch(null);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? `A igreja "${deletingChurch.name}" não pode ser excluída porque possui Legendários vinculados.`
          : 'Não foi possível excluir a igreja.',
      );
      setDeletingChurch(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Igrejas</h1>
          <p className="text-sm text-zinc-400">Cadastro de igrejas, líderes espirituais e localização.</p>
        </div>
        {hasPermission(user, 'churches.create') && (
          <Link href="/dashboard/igrejas/nova" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Nova Igreja
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#111113] shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                <th className="px-6 py-4">Igreja</th>
                <th className="px-6 py-4">Cidade</th>
                <th className="px-6 py-4">Líder Espiritual</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Coordenadas</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Carregando...</span>
                    </div>
                  </td>
                </tr>
              ) : churches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center font-medium text-zinc-500">
                    Nenhuma igreja cadastrada.
                  </td>
                </tr>
              ) : (
                churches.map((church) => (
                  <tr key={church.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-orange-500" />
                        <span>{church.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{church.city || '—'}</td>
                    <td className="px-6 py-4 text-zinc-300">
                      {church.spiritualLeaderName ? (
                        <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-zinc-500" />{church.spiritualLeaderName}</span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      {church.spiritualLeaderPhone ? (
                        <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-500" />{church.spiritualLeaderPhone}</span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {church.latitude != null && church.longitude != null ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400"><MapPin className="h-3.5 w-3.5" /> Sim</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <ActionMenu
                          items={[
                            { label: 'Ver', onClick: () => setViewingId(church.id), icon: <Eye className="h-3.5 w-3.5" /> },
                            { label: 'Editar', href: `/dashboard/igrejas/${church.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> },
                            { label: 'Excluir', onClick: () => setDeletingChurch(church), icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ChurchDetailModal churchId={viewingId} onClose={() => setViewingId(null)} />

      <ConfirmDialog
        isOpen={deletingChurch !== null}
        title="Excluir Igreja"
        description={`Tem certeza que deseja excluir "${deletingChurch?.name ?? ''}"? Só é possível excluir igrejas sem Legendários vinculados.`}
        confirmLabel={deleteBusy ? 'Excluindo...' : 'Excluir'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingChurch(null)}
        variant="danger"
      />
    </div>
  );
}
