'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/features/auth/actions';
import { getDashboardSummary, type DashboardSummary } from '@/features/dashboard/api';
import type { CurrentUser } from '@/features/auth/types';
import { hasPermission } from '@/lib/permissions';
import { firstAllowedRoute } from '@central-da-manada/shared';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Users,
  UserCheck,
  Shield,
  MapPin,
  Heart,
  Compass,
  Map,
  Wrench,
  HeartHandshake,
  Calendar,
  Plus,
  MessageSquarePlus,
  FileSpreadsheet,
  UserPlus
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        // Entrada em /dashboard sem dashboard.read (change alinhar-abas): redireciona para a
        // primeira aba permitida; sem nenhuma, cai no estado terminal renderizado abaixo.
        if (!hasPermission(currentUser, 'dashboard.read')) {
          const dest = firstAllowedRoute(currentUser);
          if (dest && dest !== '/dashboard') router.replace(dest);
          return;
        }
        getDashboardSummary()
          .then((dashboard) => setSummary(dashboard.data))
          .catch((err) => {
            console.error('Failed to load dashboard summary:', err);
          });
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Sem dashboard.read: ou está redirecionando para a primeira aba permitida, ou não há
  // nenhuma tela concedida (estado terminal, sem loop de redirect).
  if (!hasPermission(user, 'dashboard.read')) {
    if (firstAllowedRoute(user)) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-black uppercase tracking-wide text-white">Acesso ainda não configurado</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sua conta ainda não tem nenhuma tela liberada. Fale com um administrador para configurar seu acesso.
          </p>
        </div>
      </div>
    );
  }

  // Cada card exige a permissão de tela da entidade e um valor não-nulo (o backend
  // devolve `null` para quem não tem a permissão — não vaza contagem global).
  const cardConfig = summary
    ? [
        { label: 'Legendários', value: summary.totals.legendarios, permission: 'legendarios.read', icon: <Users className="h-5 w-5" /> },
        { label: 'Legendários ativos', value: summary.totals.activeLegendarios, permission: 'legendarios.read', icon: <UserCheck className="h-5 w-5" /> },
        { label: 'Equipes ativas', value: summary.totals.activeTeams, permission: 'teams.read', icon: <Shield className="h-5 w-5" /> },
        { label: 'TOPs', value: summary.totals.tops, permission: 'tops.read', icon: <MapPin className="h-5 w-5" /> },
        { label: 'Famílias', value: summary.totals.families, permission: 'tops.families.read', icon: <Heart className="h-5 w-5" /> },
        { label: 'Igrejas', value: summary.totals.churches, permission: 'churches.read', icon: <Compass className="h-5 w-5" /> },
        { label: 'Cidades', value: summary.totals.cities, permission: 'legendarios.read', icon: <Map className="h-5 w-5" /> },
        { label: 'Expertises', value: summary.totals.expertises, permission: 'expertises.read', icon: <Wrench className="h-5 w-5" /> },
        { label: 'Interesse social', value: summary.totals.socialActionInterest, permission: 'legendarios.read', icon: <HeartHandshake className="h-5 w-5" /> },
        { label: 'Ações planejadas', value: summary.totals.plannedSocialActions, permission: 'social-actions.read', icon: <Calendar className="h-5 w-5" /> },
      ].filter((card) => card.value !== null && hasPermission(user, card.permission))
    : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Area */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-wide uppercase">
          Painel de Controle
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bem-vindo de volta, <span className="font-bold text-zinc-200">{user.name}</span>. Veja o resumo da Rota do Cerrado.
        </p>
      </div>

      {/* Quick Actions Panel */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
          Ações Rápidas
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {/* Cada ação rápida só aparece com a permissão de criar correspondente
              (usabilidade; o backend já barra). Gating alinhado às telas de lista. */}
          {hasPermission(user, 'legendarios.create') && (
            <Link
              href="/dashboard/legendarios/novo"
              className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500"
            >
              <Plus className="h-4 w-4" />
              Legendário
            </Link>
          )}
          {hasPermission(user, 'tops.create') && (
            <Link
              href="/dashboard/tops/novo"
              className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Plus className="h-4 w-4" />
              Novo TOP
            </Link>
          )}
          {hasPermission(user, 'teams.create') && (
            <Link
              href="/dashboard/equipes/nova"
              className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Plus className="h-4 w-4" />
              Nova Equipe
            </Link>
          )}
          {hasPermission(user, 'communications.create') && (
            <Link
              href="/dashboard/comunicacao/novo"
              className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Comunicação
            </Link>
          )}
          {hasPermission(user, 'reports.read') && (
            <Link
              href="/dashboard/relatorios"
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Relatórios
            </Link>
          )}
        </div>
      </section>

      {/* Metrics Grid — only renders when summary is available */}
      {summary && (
        <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cardConfig.map((card) => (
            <DashboardCard
              key={card.label}
              label={card.label}
              value={card.value ?? 0}
              icon={card.icon}
            />
          ))}
        </section>
      )}

      {/* Featured TOP Highlight */}
      {summary && (
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 bg-zinc-950/40 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                Próximo Evento Principal
              </span>
              <h2 className="mt-0.5 text-lg font-black text-white tracking-wide uppercase">
                {summary.highlightedTop ? `TOP #${summary.highlightedTop.number} - ${summary.highlightedTop.name}` : 'Nenhum próximo TOP cadastrado.'}
              </h2>
              {summary.highlightedTop && (
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mt-1">
                  Cidade Sede: <span className="text-zinc-300">{summary.highlightedTop.city}</span>
                </p>
              )}
            </div>
            {summary.highlightedTop && (
              <Link
                href={`/dashboard/tops/${summary.highlightedTop.id}`}
                className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-all text-center"
              >
                Detalhar TOP
              </Link>
            )}
          </div>

          {summary.highlightedTop && summary.highlightedTopMetrics && (
            <>
              <div className="grid gap-px bg-zinc-800 grid-cols-2 sm:grid-cols-4">
                <Mini label="Participantes" value={summary.highlightedTopMetrics.participants} />
                <Mini label="Servos" value={summary.highlightedTopMetrics.servants} />
                <Mini label="Equipes" value={summary.highlightedTopMetrics.teams} />
                <Mini label="Famílias" value={summary.highlightedTopMetrics.families} />
              </div>
              <div className="grid gap-4 border-t border-zinc-800 p-6 sm:grid-cols-2">
                <DashboardCard
                  label="Pré-inscritos pendentes"
                  value={summary.highlightedTopMetrics.preRegistrations}
                  icon={<StatusBadge status="PENDING" type="participant" />}
                  description="Aguardando aprovação (Google Forms)"
                />
                <DashboardCard
                  label="Projeção total"
                  value={summary.highlightedTopMetrics.totalEsperado}
                  icon={<UserPlus className="h-5 w-5" />}
                  description="Participantes + pré-inscritos pendentes"
                />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111113] p-5 text-center group transition-colors hover:bg-zinc-900/40">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white group-hover:text-orange-500 transition-colors duration-300">{value}</p>
    </div>
  );
}
