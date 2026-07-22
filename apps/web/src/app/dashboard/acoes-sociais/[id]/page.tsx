'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SocialActionParticipantStatus } from '@central-da-manada/shared';
import { addSocialActionParticipant, cancelSocialAction, completeSocialAction, getSocialAction, getSocialActionParticipants, getVolunteerSuggestions, removeSocialActionParticipant, updateSocialActionParticipant } from '@/features/social-actions/api';
import type { Legendary, SocialAction, SocialActionParticipant } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LegendarioCombobox } from '@/features/legendarios/legendario-combobox';

export default function SocialActionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [action, setAction] = useState<SocialAction | null>(null);
  const [participants, setParticipants] = useState<SocialActionParticipant[]>([]);
  const [suggestions, setSuggestions] = useState<Legendary[]>([]);
  const [newParticipant, setNewParticipant] = useState({ legendaryId: '', role: '', notes: '' });
  const [resultSummary, setResultSummary] = useState('');
  const [suggestionCity, setSuggestionCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [actionResponse, participantsResponse] = await Promise.all([getSocialAction(params.id), getSocialActionParticipants(params.id)]);
    setAction(actionResponse.data);
    setParticipants(participantsResponse.data);
    setResultSummary(actionResponse.data.resultSummary ?? '');
  }

  useEffect(() => {
    if (authLoading) return;
    load().catch(() => router.replace('/dashboard/acoes-sociais'));
  }, [authLoading, params.id, router]);

  async function addParticipant() {
    try {
      await addSocialActionParticipant(params.id, { legendaryId: newParticipant.legendaryId, role: newParticipant.role, notes: newParticipant.notes, status: SocialActionParticipantStatus.REGISTERED, attended: false });
      setNewParticipant({ legendaryId: '', role: '', notes: '' });
      await load();
      setError(null);
    } catch {
      setError('Não foi possível adicionar participante.');
    }
  }

  async function updateParticipant(participant: SocialActionParticipant, attended: boolean, status = participant.status) {
    await updateSocialActionParticipant(params.id, participant.id, { role: participant.role, notes: participant.notes, attended, status });
    setParticipants((current) => current.map((item) => item.id === participant.id ? { ...item, attended, status } : item));
  }

  async function removeParticipant(id: string) {
    await removeSocialActionParticipant(params.id, id);
    setParticipants((current) => current.filter((item) => item.id !== id));
  }

  async function finish() {
    await completeSocialAction(params.id, resultSummary || 'Ação social concluída.');
    await load();
  }

  async function cancel() {
    await cancelSocialAction(params.id);
    await load();
  }

  async function loadSuggestions() {
    const response = await getVolunteerSuggestions({ city: suggestionCity, perPage: 10 });
    setSuggestions(response.data);
  }

  if (authLoading || !action) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando ação social...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar / Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/acoes-sociais"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Voltar para listagem
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">{action.title}</h1>
          <p className="text-sm font-semibold text-zinc-400 mt-1">
            Cidade: {action.city ?? '-'} | Período: {new Date(action.startDate).toLocaleDateString('pt-BR')} a {new Date(action.endDate).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/acoes-sociais/${action.id}/editar`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
          >
            Editar
          </Link>
          <button
            onClick={cancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-900/30 bg-rose-950/20 px-5 text-xs font-bold uppercase tracking-wider text-rose-400 transition-all hover:bg-rose-950/50 hover:text-rose-300"
          >
            Cancelar Ação
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status da Ação</p>
          <div className="mt-2"><StatusBadge status={action.status} /></div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Voluntários Inscritos</p>
          <div className="mt-2 text-2xl font-black text-white">{participants.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Descrição/Objetivo</p>
          <p className="mt-2 text-xs font-medium text-zinc-300 leading-relaxed truncate-2-lines">{action.description || 'Sem descrição cadastrada'}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Left: Participants Section */}
        <section className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Participantes / Voluntários</h2>
            <p className="text-xs text-zinc-500 mt-1">Gerencie a presença e participação dos homens da manada.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-4 bg-zinc-900/20 border border-zinc-800/40 rounded-xl p-4">
            <LegendarioCombobox
              value={newParticipant.legendaryId}
              onChange={(id) => setNewParticipant((current) => ({ ...current, legendaryId: id }))}
              clearable={false}
              noneLabel="Selecione o Legendário"
            />
            <input
              className="input text-xs"
              placeholder="Função (ex.: Líder, Apoio)"
              value={newParticipant.role}
              onChange={(event) => setNewParticipant((current) => ({ ...current, role: event.target.value }))}
            />
            <input
              className="input text-xs col-span-2 md:col-span-1"
              placeholder="Notas/Observações"
              value={newParticipant.notes}
              onChange={(event) => setNewParticipant((current) => ({ ...current, notes: event.target.value }))}
            />
            <button
              className="flex h-11 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 col-span-2 md:col-span-1"
              onClick={addParticipant}
            >
              Adicionar
            </button>
          </div>

          <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0B0C]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                    <th className="px-5 py-3">Legendário</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Presença</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {participants.length ? (
                    participants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-white">
                          {participant.legendary?.fullName ?? participant.legendaryId}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={participant.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-300">
                            <input
                              type="checkbox"
                              checked={participant.attended}
                              onChange={(event) => updateParticipant(participant, event.target.checked)}
                              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-600 focus:ring-orange-500/20 focus:ring-offset-zinc-950"
                            />
                            Presente
                          </label>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="flex h-7 items-center rounded bg-zinc-800 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700"
                              onClick={() => updateParticipant(participant, participant.attended, SocialActionParticipantStatus.COMPLETED)}
                            >
                              Concluir
                            </button>
                            <button
                              className="flex h-7 items-center rounded border border-rose-900/30 bg-rose-950/20 px-3 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                              onClick={() => removeParticipant(participant.id)}
                            >
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 font-semibold">
                        Nenhum participante adicionado a esta ação.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right: Results / Volunteer Suggestions */}
        <section className="space-y-6">
          {/* Conclusão Card */}
          <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Conclusão do Projeto</h2>
            <textarea
              className="input min-h-28 py-2.5"
              placeholder="Descreva o resumo dos resultados da ação social..."
              value={resultSummary}
              onChange={(event) => setResultSummary(event.target.value)}
            />
            <button
              className="w-full flex h-10 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500"
              onClick={finish}
            >
              Concluir Ação
            </button>
          </div>

          {/* Sugestões Card */}
          <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Sugestões de Voluntários</h2>
            <div className="flex gap-2">
              <input
                className="input text-xs"
                placeholder="Filtrar por Cidade"
                value={suggestionCity}
                onChange={(event) => setSuggestionCity(event.target.value)}
              />
              <button
                className="flex h-11 items-center justify-center rounded-lg border border-zinc-850 bg-zinc-900/60 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={loadSuggestions}
              >
                Buscar
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {suggestions.length ? (
                suggestions.map((item) => (
                  <div key={item.id} className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-3 text-xs">
                    <p className="font-bold text-white">{item.fullName}</p>
                    <p className="text-zinc-500 font-semibold mt-1">
                      {item.city ?? '-'} | Profissão: {item.profession?.name ?? '-'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 font-medium text-center py-4">Digite uma cidade e busque sugestões.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
