'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Church,
  FileSpreadsheet,
  Heart,
  HeartHandshake,
  Map,
  MapPin,
  MessageSquarePlus,
  Plus,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { firstAllowedRoute } from '@central-da-manada/shared';
import { getCurrentUser } from '@/features/auth/actions';
import { getDashboardSummary, type DashboardSummary } from '@/features/dashboard/api';
import type { CurrentUser } from '@/features/auth/types';
import { hasPermission } from '@/lib/permissions';
import { useCanOpenRoute } from '@/hooks/use-can';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { buttonStyles } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Surface } from '@/components/ui/Surface';

type MetricGroup = 'people' | 'structure' | 'engagement';

type Metric = {
  label: string;
  value: number;
  permission: string;
  group: MetricGroup;
  icon: ReactNode;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const canOpen = useCanOpenRoute(user);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    getCurrentUser()
      .then(async (currentUser) => {
        if (cancelled) return;
        setUser(currentUser);

        if (!currentUser.screenAccess?.find((entry) => entry.screenId === 'dashboard')?.usable) {
          const destination = firstAllowedRoute(currentUser);
          if (destination && destination !== '/dashboard') router.replace(destination);
          return;
        }

        try {
          const dashboard = await getDashboardSummary();
          if (!cancelled) setSummary(dashboard.data);
        } catch {
          if (!cancelled) setLoadError(true);
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/login');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestVersion, router]);

  if (loading) {
    return (
      <div className="space-y-section">
        <PageHeader title="Painel de Controle" description="Preparando o resumo operacional da Rota do Cerrado." />
        <LoadingState title="Carregando painel" description="Mantendo a estrutura enquanto os dados são atualizados." />
      </div>
    );
  }

  if (!user) return null;

  if (!user.screenAccess?.find((entry) => entry.screenId === 'dashboard')?.usable) {
    if (firstAllowedRoute(user)) {
      return <LoadingState title="Abrindo tela disponível" description="Redirecionando conforme seu acesso efetivo." />;
    }

    return (
      <EmptyState
        title="Acesso ainda não configurado"
        description="Sua conta ainda não tem nenhuma tela liberada. Fale com um administrador para configurar seu acesso."
      />
    );
  }

  if (loadError) {
    return (
      <div className="space-y-section">
        <PageHeader
          title="Painel de Controle"
          description={<>Bem-vindo de volta, <strong className="text-content-strong">{user.name}</strong>.</>}
        />
        <ErrorState
          title="O resumo do painel não carregou"
          description="A navegação continua disponível. Tente novamente para buscar os dados atualizados."
          action={{ label: 'Tentar novamente', onClick: () => setRequestVersion((current) => current + 1) }}
        />
      </div>
    );
  }

  const rawMetrics: Array<Omit<Metric, 'value'> & { value: number | null }> = summary
    ? [
        { label: 'Legendários', value: summary.totals.legendarios, permission: 'legendarios.read', group: 'people', icon: <Users className="h-5 w-5" /> },
        { label: 'Legendários ativos', value: summary.totals.activeLegendarios, permission: 'legendarios.read', group: 'people', icon: <UserCheck className="h-5 w-5" /> },
        { label: 'Equipes ativas', value: summary.totals.activeTeams, permission: 'teams.read', group: 'people', icon: <Shield className="h-5 w-5" /> },
        { label: 'TOPs', value: summary.totals.tops, permission: 'tops.read', group: 'structure', icon: <MapPin className="h-5 w-5" /> },
        { label: 'Cidades', value: summary.totals.cities, permission: 'legendarios.read', group: 'structure', icon: <Map className="h-5 w-5" /> },
        { label: 'Igrejas', value: summary.totals.churches, permission: 'churches.read', group: 'structure', icon: <Church className="h-5 w-5" /> },
        { label: 'Expertises', value: summary.totals.expertises, permission: 'expertises.read', group: 'structure', icon: <Wrench className="h-5 w-5" /> },
        { label: 'Interesse social', value: summary.totals.socialActionInterest, permission: 'legendarios.read', group: 'engagement', icon: <HeartHandshake className="h-5 w-5" /> },
        { label: 'Famílias', value: summary.totals.families, permission: 'tops.families.read', group: 'engagement', icon: <Heart className="h-5 w-5" /> },
        { label: 'Ações planejadas', value: summary.totals.plannedSocialActions, permission: 'social-actions.read', group: 'engagement', icon: <Calendar className="h-5 w-5" /> },
      ]
    : [];

  const metrics: Metric[] = rawMetrics
    .filter((metric) => metric.value !== null && user.permissions.includes(metric.permission))
    .map((metric) => ({ ...metric, value: metric.value as number }));

  const metricGroups = [
    { id: 'people' as const, label: 'Pessoas' },
    { id: 'structure' as const, label: 'Estrutura' },
    { id: 'engagement' as const, label: 'Engajamento' },
  ].map((group) => ({ ...group, metrics: metrics.filter((metric) => metric.group === group.id) }))
    .filter((group) => group.metrics.length > 0);

  return (
    <div className="space-y-section">
      <PageHeader
        title="Painel de Controle"
        description={<>Bem-vindo de volta, <strong className="text-content-strong">{user.name}</strong>. Veja o resumo da Rota do Cerrado.</>}
      />

      <Surface as="section" aria-labelledby="quick-actions-title" tone="subtle" padding="md">
        <h2 id="quick-actions-title" className="type-label mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {canOpen('/dashboard/legendarios/novo') && hasPermission(user, 'legendarios.create') ? (
            <Link href="/dashboard/legendarios/novo" className={buttonStyles({ variant: 'primary', className: 'w-full text-xs uppercase' })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Legendário
            </Link>
          ) : null}
          {canOpen('/dashboard/tops/novo') && hasPermission(user, 'tops.create') ? (
            <Link href="/dashboard/tops/novo" className={buttonStyles({ className: 'w-full text-xs uppercase' })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo TOP
            </Link>
          ) : null}
          {canOpen('/dashboard/equipes/nova') && hasPermission(user, 'teams.create') ? (
            <Link href="/dashboard/equipes/nova" className={buttonStyles({ className: 'w-full text-xs uppercase' })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova equipe
            </Link>
          ) : null}
          {canOpen('/dashboard/comunicacao/novo') && hasPermission(user, 'communications.create') ? (
            <Link href="/dashboard/comunicacao/novo" className={buttonStyles({ className: 'w-full text-xs uppercase' })}>
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              Comunicação
            </Link>
          ) : null}
          {canOpen('/dashboard/usuarios') ? (
            <Link href="/dashboard/usuarios" className={buttonStyles({ className: 'col-span-2 w-full text-xs uppercase sm:col-span-1' })}>
              <UserCog className="h-4 w-4" aria-hidden="true" />
              Controle de acessos
            </Link>
          ) : canOpen('/dashboard/relatorios') ? (
            <Link href="/dashboard/relatorios" className={buttonStyles({ className: 'col-span-2 w-full text-xs uppercase sm:col-span-1' })}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Relatórios
            </Link>
          ) : null}
        </div>
      </Surface>

      {metricGroups.length > 0 ? (
        <Surface as="section" aria-label="Resumo operacional" padding="none" className="grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {metricGroups.map((group) => (
            <div key={group.id} className="p-5 sm:p-6">
              <h2 className="type-label">{group.label}</h2>
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6">
                {group.metrics.map((metric) => (
                  <div key={metric.label} className="min-w-0">
                    <div className="flex items-center justify-between gap-2 text-content-muted">
                      <p className="truncate text-xs">{metric.label}</p>
                      <span aria-hidden="true">{metric.icon}</span>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-content-strong">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Surface>
      ) : null}

      <Surface as="section" aria-labelledby="highlighted-top-title" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="type-label text-accent">Próximo evento principal</p>
            <h2 id="highlighted-top-title" className="type-section-title mt-1 uppercase">
              {summary?.highlightedTop
                ? `TOP #${summary.highlightedTop.number} — ${summary.highlightedTop.name}`
                : 'Nenhum próximo TOP cadastrado'}
            </h2>
            {summary?.highlightedTop ? (
              <p className="type-helper mt-1 uppercase">Cidade sede: <strong className="text-content">{summary.highlightedTop.city}</strong></p>
            ) : null}
          </div>
          {summary?.highlightedTop && canOpen(`/dashboard/tops/${summary.highlightedTop.id}`) ? (
            <Link href={`/dashboard/tops/${summary.highlightedTop.id}`} className={buttonStyles({ size: 'sm', className: 'text-xs uppercase' })}>
              Detalhar TOP
            </Link>
          ) : null}
        </div>

        {summary?.highlightedTop && summary.highlightedTopMetrics ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
                <TopMetric label="Participantes" value={summary.highlightedTopMetrics.participants} />
                <TopMetric label="Servos" value={summary.highlightedTopMetrics.servants} />
                <TopMetric label="Equipes" value={summary.highlightedTopMetrics.teams} />
                <TopMetric label="Famílias" value={summary.highlightedTopMetrics.families} />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
                <StatusBadge status={summary.highlightedTop.status} type="top" />
                <p className="type-helper">
                  <strong className="text-content-strong">{summary.highlightedTopMetrics.preRegistrations}</strong> pré-inscritos pendentes
                </p>
                <p className="type-helper">
                  <strong className="text-content-strong">{summary.highlightedTopMetrics.totalEsperado}</strong> participantes projetados
                </p>
              </div>
            </div>
            <div className="border-t border-line bg-surface-subtle p-5 sm:p-6 lg:border-l lg:border-t-0">
              <p className="type-label">Liderança do TOP</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface-raised">
                  <UserPlus className="h-5 w-5 text-content-muted" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-content-strong">
                    {summary.highlightedTop.representative?.fullName ?? 'Não definido'}
                  </p>
                  <p className="type-helper">Representante</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState compact title="Nenhum evento em destaque" description="Cadastre ou planeje um TOP para exibir o resumo operacional aqui." />
        )}
      </Surface>
    </div>
  );
}

function TopMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 text-center first:pl-0 last:pr-0 sm:px-5">
      <p className="type-label truncate">{label}</p>
      <p className="mt-2 text-2xl font-black text-content-strong">{value}</p>
    </div>
  );
}
