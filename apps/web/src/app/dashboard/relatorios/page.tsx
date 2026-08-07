'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { downloadCsv, getByChurchReport, getByCityReport, getByExpertiseReport, getByProfessionReport, getByTeamReport, getLegendariosReport, getPendingReviewReport, getSocialActionParticipantsReport, getSocialInterestedReport, getTopFamiliesReport, getTopParticipantsReport, getTopServantsReport } from '@/features/reports/api';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useCan } from '@/hooks/use-can';
import { FileSpreadsheet, Download, Search } from 'lucide-react';

type ReportKey = 'legendarios' | 'city' | 'church' | 'team' | 'profession' | 'expertise' | 'social' | 'pendingReview' | 'topParticipants' | 'topServants' | 'topFamilies' | 'socialParticipants';

const reports: Array<{ key: ReportKey; label: string }> = [
  { key: 'legendarios', label: 'Todos os Legendários' },
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
  const { user, loading: authLoading } = useRequireAuth();
  const canDo = useCan(user);
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
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">Carregando...</span>
        </div>
      </div>
    );
  }

  const columns = rows[0] ? Object.keys(flatten(rows[0])).slice(0, 8) : [];
  // `reportHasCsv` é sobre o RELATÓRIO ter exportação; `canDo('reports.export')` é sobre o
  // USUÁRIO poder exportar. Os dois precisam valer — antes só o primeiro era checado, e o
  // botão aparecia para quem só tinha `reports.read`.
  const reportHasCsv = ['legendarios', 'topParticipants', 'topServants', 'topFamilies', 'socialParticipants'].includes(active);
  const canExport = reportHasCsv && canDo('reports.export');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-wide text-content-strong uppercase">Relatórios</h1>
        <p className="text-sm text-content-muted">Gere resumos consolidados e exporte listas de dados em formato CSV.</p>
      </div>

      {/* Grid of Available Reports */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {reports.map((report) => (
          <button
            key={report.key}
            type="button"
            className={`rounded-xl border p-4 text-left transition-all flex flex-col justify-between h-[100px] ${
              active === report.key
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-surface text-content-muted hover:border-line-strong hover:bg-surface-raised hover:text-content-strong'
            }`}
            onClick={() => {
              setActive(report.key);
              setRows([]);
            }}
          >
            <FileSpreadsheet className={`h-5 w-5 ${active === report.key ? 'text-accent' : 'text-content-muted'}`} />
            <span className="text-xs font-bold uppercase tracking-wider leading-snug">{report.label}</span>
          </button>
        ))}
      </div>

      {/* Action / Parameter Section */}
      <section className="rounded-xl border border-line bg-surface p-5 shadow-lg space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between border-b border-line pb-4">
          <div className="flex-1 max-w-md">
            {active.startsWith('top') && (
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-content-muted">TOP</span>
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
                <span className="text-xs font-bold uppercase tracking-wider text-content-muted">Ação Social</span>
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
                <span className="text-xs font-bold uppercase tracking-widest text-content-muted">
                  Sem parâmetros necessários para este relatório
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => load()}
              className="flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-xs font-bold uppercase tracking-wider text-content-strong hover:bg-accent"
            >
              Carregar Dados
            </button>
            {canExport && (
              <button
                onClick={exportActive}
                className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-raised px-5 text-xs font-bold uppercase tracking-wider text-content hover:bg-surface-raised hover:text-content-strong"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-feedback-danger/20 bg-feedback-danger/10 p-4 text-sm font-semibold text-feedback-danger">
            {error}
          </div>
        )}

        {/* Preview Table */}
        <div className="w-full overflow-hidden rounded-xl border border-line bg-surface-subtle">
          <div className="overflow-x-auto max-h-[400px]">
            {loading ? (
              <div className="px-6 py-12 text-center text-content-muted">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted">Montando relatório...</span>
                </div>
              </div>
            ) : rows.length ? (
              <table className="w-full border-collapse text-left text-sm text-content">
                <thead className="sticky top-0 bg-surface-subtle border-b border-line z-10">
                  <tr className="text-xs font-bold tracking-wider text-content-muted uppercase">
                    {columns.map((column) => (
                      <th key={column} className="px-5 py-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, index) => {
                    const flat = flatten(row);
                    return (
                      <tr key={index} className="hover:bg-surface transition-colors">
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
              <p className="px-6 py-10 text-center text-content-muted font-semibold text-xs uppercase tracking-wider">
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
    // Nome catalogado quando vinculado; texto livre preservado como fallback.
    profissao: row.profession?.name ?? row.professionText,
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
