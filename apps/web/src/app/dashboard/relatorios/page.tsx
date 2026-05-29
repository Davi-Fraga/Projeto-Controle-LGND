'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { downloadCsv, getByChurchReport, getByCityReport, getByExpertiseReport, getByProfessionReport, getByTeamReport, getLegendariosReport, getPendingReviewReport, getSocialActionParticipantsReport, getSocialInterestedReport, getTopFamiliesReport, getTopParticipantsReport, getTopServantsReport } from '@/features/reports/api';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { FileSpreadsheet, Download, Search } from 'lucide-react';

type ReportKey = 'legendarios' | 'city' | 'church' | 'team' | 'profession' | 'expertise' | 'social' | 'pendingReview' | 'topParticipants' | 'topServants' | 'topFamilies' | 'socialParticipants';

const reports: Array<{ key: ReportKey; label: string }> = [
  { key: 'legendarios', label: 'Todos Legendários' },
  { key: 'city', label: 'Por Cidade' },
  { key: 'church', label: 'Por Igreja' },
  { key: 'team', label: 'Por Equipe' },
  { key: 'profession', label: 'Por Profissão' },
  { key: 'expertise', label: 'Por Expertise' },
  { key: 'social', label: 'Interesse Social' },
  { key: 'pendingReview', label: 'Pendentes de Revisão' },
  { key: 'topParticipants', label: 'Participantes por TOP' },
  { key: 'topServants', label: 'Servos por TOP' },
  { key: 'topFamilies', label: 'Famílias por TOP' },
  { key: 'socialParticipants', label: 'Participantes de Ação' },
];

export default function ReportsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [active, setActive] = useState<ReportKey>('legendarios');
  const [rows, setRows] = useState<any[]>([]);
  const [topId, setTopId] = useState('');
  const [socialActionId, setSocialActionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(key = active) {
    setLoading(true);
    setError(null);
    try {
      let response: any;
      if (key === 'legendarios') response = await getLegendariosReport();
      if (key === 'city') response = await getByCityReport();
      if (key === 'church') response = await getByChurchReport();
      if (key === 'team') response = await getByTeamReport();
      if (key === 'profession') response = await getByProfessionReport();
      if (key === 'expertise') response = await getByExpertiseReport();
      if (key === 'social') response = await getSocialInterestedReport();
      if (key === 'pendingReview') response = await getPendingReviewReport();
      if (key === 'topParticipants') response = await getTopParticipantsReport(topId);
      if (key === 'topServants') response = await getTopServantsReport(topId);
      if (key === 'topFamilies') response = await getTopFamiliesReport(topId);
      if (key === 'socialParticipants') response = await getSocialActionParticipantsReport(socialActionId);
      setRows(response?.data ?? []);
    } catch {
      setError('Não foi possível carregar o relatório solicitado.');
    } finally {
      setLoading(false);
    }
  }



  async function exportActive() {
    if (active === 'legendarios') return downloadCsv('/reports/legendarios/export?format=csv', 'legendarios.csv');
    if (active === 'topParticipants') return downloadCsv(`/reports/tops/${topId}/participants/export?format=csv`, 'top-participantes.csv');
    if (active === 'topServants') return downloadCsv(`/reports/tops/${topId}/servants/export?format=csv`, 'top-servos.csv');
    if (active === 'topFamilies') return downloadCsv(`/reports/tops/${topId}/families/export?format=csv`, 'top-familias.csv');
    if (active === 'socialParticipants') return downloadCsv(`/reports/social-actions/${socialActionId}/participants/export?format=csv`, 'acao-social-participantes.csv');
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

  const columns = rows[0] ? Object.keys(flatten(rows[0])).slice(0, 8) : [];
  const canExport = ['legendarios', 'topParticipants', 'topServants', 'topFamilies', 'socialParticipants'].includes(active);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-wide text-white uppercase">Relatórios</h1>
        <p className="text-sm text-zinc-400">Gere resumos consolidados e exporte listas de dados em formato CSV.</p>
      </div>

      {/* Grid of Available Reports */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {reports.map((report) => (
          <button
            key={report.key}
            type="button"
            className={`rounded-xl border p-4 text-left transition-all flex flex-col justify-between h-[100px] ${
              active === report.key
                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50 hover:text-zinc-200'
            }`}
            onClick={() => {
              setActive(report.key);
              setRows([]);
            }}
          >
            <FileSpreadsheet className={`h-5 w-5 ${active === report.key ? 'text-orange-500' : 'text-zinc-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider leading-snug">{report.label}</span>
          </button>
        ))}
      </div>

      {/* Action / Parameter Section */}
      <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between border-b border-zinc-800 pb-4">
          <div className="flex-1 max-w-md">
            {active.startsWith('top') && (
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">TOP</span>
                <input
                  className="input text-xs"
                  placeholder="Informe o TOP para filtrar..."
                  value={topId}
                  onChange={(event) => setTopId(event.target.value)}
                />
              </label>
            )}
            {active === 'socialParticipants' && (
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ação Social</span>
                <input
                  className="input text-xs"
                  placeholder="Informe a ação social para filtrar..."
                  value={socialActionId}
                  onChange={(event) => setSocialActionId(event.target.value)}
                />
              </label>
            )}
            {!active.startsWith('top') && active !== 'socialParticipants' && (
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Sem parâmetros necessários para este relatório
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => load()}
              className="flex h-11 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-orange-500"
            >
              Carregar Dados
            </button>
            {canExport && (
              <button
                onClick={exportActive}
                className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
            {error}
          </div>
        )}

        {/* Preview Table */}
        <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0B0C]">
          <div className="overflow-x-auto max-h-[400px]">
            {loading ? (
              <div className="px-6 py-12 text-center text-zinc-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Montando relatório...</span>
                </div>
              </div>
            ) : rows.length ? (
              <table className="w-full border-collapse text-left text-sm text-zinc-300">
                <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 z-10">
                  <tr className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                    {columns.map((column) => (
                      <th key={column} className="px-5 py-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {rows.map((row, index) => {
                    const flat = flatten(row);
                    return (
                      <tr key={index} className="hover:bg-zinc-900/20 transition-colors">
                        {columns.map((column) => (
                          <td key={column} className="px-5 py-3 font-semibold">
                            {String(flat[column] ?? '')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="px-6 py-10 text-center text-zinc-500 font-semibold text-xs uppercase tracking-wider">
                Nenhum dado carregado para visualização. Clique em "Carregar Dados" acima.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function flatten(row: any): Record<string, string | number | undefined> {
  return {
    id: row.id,
    nome: row.fullName ?? row.name ?? row.title ?? row.value,
    count: row.count ?? row._count?.legendarios ?? row._count?.memberships ?? row._count?.recipients ?? row._count?._all,
    cidade: row.city ?? row.legendary?.city,
    igreja: row.church?.name,
    profissao: row.profession?.name,
    equipe: row.team?.name,
    legendario: row.legendary?.fullName,
    contexto: row.contexto,
    motivo: row.motivo,
    observacao: row.observacao,
    status: row.status,
    tipo: row.type,
    presente: typeof row.attended === 'boolean' ? (row.attended ? 'sim' : 'não') : undefined,
  };
}
