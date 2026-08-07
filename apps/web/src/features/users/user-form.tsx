'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SystemRole } from '@central-da-manada/shared';
import { updateUser, type UserSummary } from './api';
import { LegendarioCombobox } from '@/features/legendarios/legendario-combobox';

type Props = { user?: UserSummary };

const ROLE_LABELS: Record<string, string> = {
  [SystemRole.COORDINATION_ADMIN]: 'Administrador',
  [SystemRole.COORDINATION_USER]: 'Coordenação (usuário)',
  [SystemRole.TOP_REPRESENTATIVE]: 'Representante de TOP',
  [SystemRole.TOP_DEPUTY_REPRESENTATIVE]: 'Sub-representante de TOP',
  [SystemRole.FAMILY_REPRESENTATIVE]: 'Representante de Família',
  [SystemRole.FAMILY_DEPUTY_REPRESENTATIVE]: 'Sub-representante de Família',
  [SystemRole.TEAM_COORDINATOR]: 'Coordenador / Subcoordenador de Equipe',
  [SystemRole.SPIRITUAL_LEADER]: 'Líder Espiritual',
  [SystemRole.MEMBER]: 'Membro',
};

const ROLE_ORDER = Object.values(SystemRole);

export function UserForm({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [legendaryId, setLegendaryId] = useState(user?.legendaryId ?? '');
  const [roles, setRoles] = useState<string[]>(user?.roles ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleRole(role: string) {
    setRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (roles.length === 0) {
      setError('Selecione ao menos uma função na manada.');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await updateUser(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        legendaryId: legendaryId || null,
        roles,
      });
      router.push('/dashboard/usuarios');
      router.refresh();
    } catch {
      setError('Não foi possível salvar o usuário. Verifique os dados (e-mail único, legendário disponível).');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">E-mail</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Legendário vinculado</span>
          <LegendarioCombobox label="Legendário vinculado"
            value={legendaryId}
            onChange={(value) => setLegendaryId(value)}
          />
          <span className="text-[11px] text-zinc-500">
            Necessário para coordenadores/subcoordenadores: o escopo de equipe usa o legendário vinculado.
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
        <span className="text-xs font-bold uppercase tracking-widest text-orange-500">Função na Manada</span>
        <p className="mt-1 text-[11px] text-zinc-500">
          Papel organizacional do usuário — <strong className="text-zinc-400">não define o acesso</strong>.
          O acesso a telas e dados é configurado em <strong className="text-zinc-400">Controle de Acessos</strong>.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ROLE_ORDER.map((role) => (
            <label key={role} className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5 cursor-pointer hover:border-zinc-700">
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => toggleRole(role)}
                className="h-4 w-4 accent-orange-500"
              />
              <span className="text-sm font-medium text-zinc-200">{ROLE_LABELS[role] ?? role}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Usuário'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-6 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
