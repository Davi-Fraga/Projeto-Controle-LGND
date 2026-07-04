'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UserCog, Edit2, ShieldAlert, Link2, ShieldCheck } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { deactivateUser, getUsers } from '@/features/users/api';
import type { UserSummary } from '@/features/users/api';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function UsuariosPage() {
  const { loading: authLoading } = useRequireAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    getUsers({ page, perPage: 20 })
      .then((response) => {
        setUsers(response.data);
        setTotalPages(response.meta.totalPages || 1);
      })
      .catch(() => setError('Não foi possível carregar os usuários.'))
      .finally(() => setLoading(false));
  }, [authLoading, page]);

  async function handleConfirmDeactivate() {
    if (!deactivatingId) return;
    try {
      await deactivateUser(deactivatingId);
      setUsers((current) => current.map((u) => (u.id === deactivatingId ? { ...u, isActive: false } : u)));
    } catch {
      setError('Erro ao inativar o usuário.');
    } finally {
      setDeactivatingId(null);
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
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Usuários</h1>
          <p className="text-sm text-zinc-400">Acessos do sistema, perfis e vínculo com legendário.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/usuarios/convidar" className="inline-flex h-10 items-center justify-center rounded-lg border border-orange-600/50 bg-orange-600/10 px-5 text-xs font-bold uppercase tracking-wider text-orange-400 transition-all hover:bg-orange-600/20">
            Convidar
          </Link>
          <Link href="/dashboard/usuarios/novo" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Novo Usuário
          </Link>
        </div>
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
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Perfis</th>
                <th className="px-6 py-4">Legendário</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Carregando...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center font-medium text-zinc-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="font-bold text-white">{user.name}</p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-zinc-600">—</span>
                        ) : (
                          user.roles.map((role) => (
                            <span key={role} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                              {role}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.legendaryId ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400"><Link2 className="h-3.5 w-3.5" /> Vinculado</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">Ativo</span>
                      ) : (
                        <span className="rounded-full bg-zinc-700/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Inativo</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <ActionMenu
                          items={[
                            { label: 'Editar', href: `/dashboard/usuarios/${user.id}/editar`, icon: <Edit2 className="h-3.5 w-3.5" /> },
                            { label: 'Controle de Acessos', href: `/dashboard/usuarios/${user.id}/acessos`, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
                            ...(user.isActive
                              ? [{ label: 'Inativar', onClick: () => setDeactivatingId(user.id), icon: <ShieldAlert className="h-3.5 w-3.5" />, destructive: true }]
                              : []),
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

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-850 pt-4">
          <button
            className="flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900/50 disabled:hover:text-zinc-300"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Anterior
          </button>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            Página <span className="text-zinc-300">{page}</span> de <span className="text-zinc-300">{totalPages}</span>
          </span>
          <button
            className="flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900/50 disabled:hover:text-zinc-300"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Próxima
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={deactivatingId !== null}
        title="Inativar Usuário"
        description="Tem certeza que deseja inativar este usuário? Ele perderá o acesso ao sistema e as sessões ativas serão revogadas."
        confirmLabel="Inativar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivatingId(null)}
        variant="danger"
      />
    </div>
  );
}
