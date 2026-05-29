'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getLegendario } from '@/features/legendarios/api';
import { LegendarioHistorySection } from '@/features/legendarios/legendario-history-section';
import type { Legendary } from '@/features/legendarios/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function LegendarioDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [legendario, setLegendario] = useState<Legendary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    getLegendario(params.id)
      .then((response) => setLegendario(response.data))
      .catch(() => router.replace('/dashboard/legendarios'))
      .finally(() => setLoading(false));
  }, [authLoading, params.id, router]);

  if (authLoading || loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;
  if (!legendario) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar / Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/legendarios"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Voltar para listagem
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">{legendario.fullName}</h1>
          <p className="text-sm font-bold uppercase tracking-wider text-orange-500 mt-1">
            {legendario.lgndNumber ? `LGND ${legendario.lgndNumber}` : 'Sem número LGND'}
          </p>
        </div>
        <Link
          href={`/dashboard/legendarios/${legendario.id}/editar`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 text-center"
        >
          Editar Cadastro
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Info
          title="Dados Principais"
          rows={[
            ['Telefone', legendario.phone || '-'],
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
                  ['Família no primeiro TOP', legendario.firstTopFamily ? legendario.firstTopFamily.name : <span className="text-amber-500 font-bold">Pendente de revisão</span>],
                  ['Observações', legendario.firstTopNotes || '-'],
                ]
          }
        />
        <Info
          title="Serviço / Service"
          rows={[
            ['Já serviu como service?', legendario.topServants && legendario.topServants.length > 0 ? 'Sim' : 'Não'],
            ...(legendario.topServants && legendario.topServants.length > 0
              ? legendario.topServants.map((s, idx) => [
                  `Serviço #${idx + 1}`,
                  <div key={s.id} className="space-y-1">
                    <p className="font-bold text-zinc-200">
                      {s.topEvent ? `TOP #${s.topEvent.number} - ${s.topEvent.name}` : 'TOP não especificado'}
                    </p>
                    <p className="text-xs text-zinc-400 font-medium">
                      Equipe: <span className="text-zinc-300 font-semibold">{s.team?.name || '-'}</span>
                    </p>
                    {s.role && (
                      <p className="text-xs text-zinc-400 font-medium">
                        Função: <span className="text-zinc-300 font-semibold">{s.role}</span>
                      </p>
                    )}
                    {s.notes && (
                      <p className="text-xs text-zinc-400 font-medium">
                        Obs: <span className="text-zinc-300 font-semibold">{s.notes}</span>
                      </p>
                    )}
                  </div>,
                ] as [string, React.ReactNode])
              : []),
          ]}
        />
      </div>

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
      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
        <LegendarioHistorySection legendarioId={legendario.id} />
      </div>
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

