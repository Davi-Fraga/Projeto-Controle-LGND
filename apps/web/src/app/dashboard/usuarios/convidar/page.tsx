'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { SystemRole } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { AsyncCombobox, type ComboboxOption } from '@/components/ui/AsyncCombobox';
import { getLegendarioOptions } from '@/features/legendarios/api';
import { createInvite } from '@/features/invites/api';
import { Copy, Check } from 'lucide-react';

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

export default function ConvidarUsuarioPage() {
  const { loading: authLoading } = useRequireAuth();
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>([SystemRole.MEMBER]);
  const [legendaryId, setLegendaryId] = useState('');
  const [legendaryLabel, setLegendaryLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchLegendarioOptions(search: string): Promise<ComboboxOption[]> {
    const response = await getLegendarioOptions(search, 20);
    return response.data.map((option) => {
      const fullName = option.metadata?.fullName ?? option.label;
      const parts = [option.metadata?.city ?? undefined, option.metadata?.lgndNumber ? `LGND ${option.metadata.lgndNumber}` : undefined].filter(Boolean) as string[];
      return { value: option.value, label: fullName, sublabel: parts.join(' · ') || undefined };
    });
  }

  function toggleRole(role: string) {
    setRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (roles.length === 0) return setError('Selecione ao menos uma função na manada.');
    setLoading(true);
    try {
      const res = await createInvite({ email: email.trim().toLowerCase(), roles, legendaryId: legendaryId || null });
      setLink(res.data.link);
    } catch {
      setError('Não foi possível gerar o convite. Verifique o email (não pode já ter conta) e o legendário.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link href="/dashboard/usuarios" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors">
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Convidar Usuário</h1>
        <p className="text-sm text-zinc-400">Gere um link de convite. A pessoa define a própria senha ao aceitar. O acesso a telas é configurado depois em Controle de Acessos.</p>
      </div>

      {link ? (
        <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-sm font-semibold text-emerald-400">Convite gerado! Copie o link e envie para a pessoa (ex.: WhatsApp). Vale por 7 dias e só pode ser usado uma vez.</p>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="input flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
            <button onClick={copyLink} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-orange-500">
              {copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
            </button>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setLink(null); setEmail(''); setRoles([SystemRole.MEMBER]); setLegendaryId(''); setLegendaryLabel(''); }} className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200">
              Gerar outro convite
            </button>
            <Link href="/dashboard/usuarios" className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200">Voltar</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">{error}</div>}

          <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">E-mail</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="pessoa@email.com" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Legendário vinculado (opcional)</span>
              <AsyncCombobox
                value={legendaryId}
                selectedLabel={legendaryLabel}
                onChange={(value, label) => { setLegendaryId(value); setLegendaryLabel(value ? label : ''); }}
                fetchOptions={fetchLegendarioOptions}
                placeholder="Buscar por nome, cidade ou LGND..."
                noneLabel="Nenhum"
              />
            </label>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-500">Função na Manada</span>
            <p className="mt-1 text-[11px] text-zinc-500">Papel organizacional — não define o acesso. O acesso a telas é configurado em Controle de Acessos.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ROLE_ORDER.map((role) => (
                <label key={role} className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5 cursor-pointer hover:border-zinc-700">
                  <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} className="h-4 w-4 accent-orange-500" />
                  <span className="text-sm font-medium text-zinc-200">{ROLE_LABELS[role] ?? role}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50">
              {loading ? 'Gerando...' : 'Gerar Link de Convite'}
            </button>
            <Link href="/dashboard/usuarios" className="flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-6 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-200">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
