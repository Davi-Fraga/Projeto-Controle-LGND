'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatPhone } from '@central-da-manada/shared';
import { getLegendario } from '@/features/legendarios/api';
import { LegendarioHistorySection } from '@/features/legendarios/legendario-history-section';
import { LegendarioServiceSection } from '@/features/legendarios/legendario-service-section';
import type { Legendary } from '@/features/legendarios/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { hasPermission } from '@/lib/permissions';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function LegendarioDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useRequireAuth();
  const fromTeamIdParam = searchParams.get('fromTeamId');
  const fromTeamId = fromTeamIdParam && UUID_PATTERN.test(fromTeamIdParam)
    ? fromTeamIdParam
    : null;
  const backHref = fromTeamId ? `/dashboard/equipes/${fromTeamId}` : '/dashboard/legendarios';
  const [legendario, setLegendario] = useState<Legendary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLegendario = () => getLegendario(params.id).then((response) => setLegendario(response.data));

  useEffect(() => {
    if (authLoading) return;
    loadLegendario()
      .catch(() => router.replace(backHref))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, backHref, params.id, router]);

  if (authLoading || loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;
  if (!legendario) return null;

  // Dados vindos do Google Forms da manada (sincronização contínua). email/birthDate
  // podem vir omitidos pela API para papéis escopados (D12) — nesse caso exibem "-".
  const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '-');
  const hasFormsData = Boolean(
    legendario.lastFormsSyncAt || legendario.district || legendario.state || legendario.email ||
    legendario.birthDate || legendario.spiritualLeaderName || legendario.relativeName ||
    legendario.skillsText || legendario.isSpiritualLeader || legendario.leadershipRole,
  );
  const formsRows: Array<[string, React.ReactNode]> = [
    ['Bairro', legendario.district || '-'],
    ['Estado / UF', legendario.state || '-'],
    ['E-mail', legendario.email || '-'],
    ['Data de nascimento', fmtDate(legendario.birthDate)],
    ['Líder espiritual?', legendario.isSpiritualLeader ? 'Sim' : 'Não'],
    ['Liderança', legendario.leadershipRole || '-'],
    ['Líder espiritual (nome)', legendario.spiritualLeaderName || '-'],
    ['Líder espiritual (contato)', formatPhone(legendario.spiritualLeaderPhone) || '-'],
    ['Esposa/Mãe (nome)', legendario.relativeName || '-'],
    ['Esposa/Mãe (contato)', formatPhone(legendario.relativePhone) || '-'],
    ['Esposa/Mãe (e-mail)', legendario.relativeEmail || '-'],
    ['Habilidades', legendario.skillsText || '-'],
    ['Última sincronização', fmtDate(legendario.lastFormsSyncAt)],
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar / Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← {fromTeamId ? 'Voltar para equipe' : 'Voltar para listagem'}
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">{legendario.fullName}</h1>
          <p className="text-sm font-bold uppercase tracking-wider text-orange-500 mt-1">
            {legendario.lgndNumber ? `LGND ${legendario.lgndNumber}` : 'Sem número LGND'}
          </p>
        </div>
        {hasPermission(user, 'legendarios.update') ? (
          <Link
            href={`/dashboard/legendarios/${legendario.id}/editar`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 text-center"
          >
            Editar Cadastro
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Info
          title="Dados Principais"
          rows={[
            ['Telefone', formatPhone(legendario.phone) || '-'],
            ['Cidade', legendario.city || '-'],
            ['Status', <StatusBadge key="status" status={legendario.status} />],
            ['Rota do Cerrado', legendario.isFromRotaDoCerrado ? 'Sim' : 'Não'],
            ['Interesse Social', legendario.socialActionInterest ? 'Sim' : 'Não'],
          ]}
        />
        <Info
          title="Igreja e Profissão"
          rows={[
            ['Igreja', legendario.church?.name || '-'],
            ['Serve na Igreja', legendario.servesInChurch ? 'Sim' : 'Não'],
            ['Função', legendario.churchRole || '-'],
            ['Profissão', legendario.profession?.name || '-'],
          ]}
        />
        <Info
          title="Primeira Montanha"
          rows={
            legendario.firstTopIsExternal
              ? [
                  ['Subiu em Outra Rota', 'Sim'],
                  ['Rota/TOP de Origem', legendario.firstTopExternalText || '-'],
                  ['Observações', legendario.firstTopNotes || '-'],
                ]
              : [
                  ['Subiu em Outra Rota', 'Não'],
                  ['Primeiro TOP que subiu', legendario.firstTopEvent ? `TOP #${legendario.firstTopEvent.number} - ${legendario.firstTopEvent.name}` : <span className="text-amber-500 font-bold">Pendente de revisão</span>],
                  ['Família', legendario.firstTopFamily ? legendario.firstTopFamily.name : <span className="text-amber-500 font-bold">Pendente de revisão</span>],
                  ['Observações', legendario.firstTopNotes || '-'],
                ]
          }
        />
        {hasFormsData ? <Info title="Dados do Google Forms" rows={formsRows} /> : null}
      </div>

      {/* Serviço em TOP: histórico múltiplo gerido pelos endpoints canônicos de servos. */}
      <LegendarioServiceSection
        legendarioId={legendario.id}
        servants={legendario.topServants ?? []}
        permissions={{
          add: hasPermission(user, 'tops.servants.add'),
          update: hasPermission(user, 'tops.servants.update'),
          remove: hasPermission(user, 'tops.servants.remove'),
        }}
        onChanged={loadLegendario}
      />

      {/* Expertises Card */}
      <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Expertises</h2>
        <div className="flex flex-wrap gap-2">
          {legendario.expertises.length ? (
            legendario.expertises.map((expertise) => (
              <span
                key={expertise.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300"
              >
                {expertise.name}
              </span>
            ))
          ) : (
            <span className="text-sm font-semibold text-zinc-500">Nenhuma expertise informada.</span>
          )}
        </div>
      </section>

      {/* Observations Card */}
      <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Observações</h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed font-medium">
          {legendario.notes || 'Nenhuma observação cadastrada.'}
        </p>
      </section>

      {/* History Section */}
      {hasPermission(user, 'legendarios.history.read') ? (
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <LegendarioHistorySection
            legendarioId={legendario.id}
            canCreate={hasPermission(user, 'legendarios.history.create')}
          />
        </div>
      ) : null}
    </div>
  );
}

interface InfoProps {
  title: string;
  rows: Array<[string, React.ReactNode]>;
}

function Info({ title, rows }: InfoProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</h2>
      <dl className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
        {rows.map(([label, value], idx) => (
          <div key={idx} className="border-b border-zinc-850 pb-2 sm:border-none sm:pb-0">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

