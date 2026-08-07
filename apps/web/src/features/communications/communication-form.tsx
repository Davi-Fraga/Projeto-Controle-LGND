'use client';

import { useEffect, useState } from 'react';
import { InternalMessageTargetType } from '@central-da-manada/shared';
import { getTopOptions, getTopFamilyOptions, getTeamsOptionsList } from '@/features/tops/api';
import type { OptionItem } from '@/features/tops/types';
import { LegendarioCombobox } from '@/features/legendarios/legendario-combobox';
import type { CommunicationPayload } from './api';

type Props = {
  value: CommunicationPayload;
  saving?: boolean;
  onChange: (payload: CommunicationPayload) => void;
  onSubmit: () => void;
};

export function CommunicationForm({ value, saving, onChange, onSubmit }: Props) {
  const [topOptions, setTopOptions] = useState<OptionItem[]>([]);
  const [teamOptions, setTeamOptions] = useState<OptionItem[]>([]);
  const [familyOptions, setFamilyOptions] = useState<OptionItem[]>([]);

  useEffect(() => {
    getTopOptions().then((r) => setTopOptions(r.data)).catch(console.error);
    getTeamsOptionsList().then((r) => setTeamOptions(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (value.topEventId) {
      getTopFamilyOptions(value.topEventId)
        .then((r) => setFamilyOptions(r.data))
        .catch(console.error);
    } else {
      setFamilyOptions([]);
    }
  }, [value.topEventId]);

  const needsTop = ['TOP_ALL', 'TOP_REPRESENTATIVES', 'TOP_FAMILY_REPRESENTATIVES', 'TOP_FAMILY'].includes(value.targetType);
  const needsFamily = value.targetType === 'TOP_FAMILY';
  const needsTeam = value.targetType === 'TEAM';
  const needsLegendary = value.targetType === 'LEGENDARY';

  function patch(partial: Partial<CommunicationPayload>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-5">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Título / Assunto</span>
          <input className="input" placeholder="Ex.: Aviso Importante sobre o próximo TOP" value={value.title} onChange={(event) => patch({ title: event.target.value })} />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Mensagem / Conteúdo</span>
          <textarea className="input min-h-40 py-2.5" placeholder="Escreva a mensagem aqui..." value={value.body} onChange={(event) => patch({ body: event.target.value })} />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Público-Alvo</span>
            <select
              className="input"
              value={value.targetType}
              onChange={(event) =>
                patch({
                  targetType: event.target.value as InternalMessageTargetType,
                  targetId: '',
                  topEventId: '',
                })
              }
            >
              <option value="ALL_ACTIVE_LEGENDARIES">Toda a Manada</option>
              <option value="TOP_ALL">Todos de um TOP</option>
              <option value="TOP_REPRESENTATIVES">Representantes do TOP</option>
              <option value="TOP_FAMILY_REPRESENTATIVES">Representantes das Famílias do TOP</option>
              <option value="TOP_FAMILY">Família específica de um TOP</option>
              <option value="TEAM">Equipe específica</option>
              <option value="TEAM_COORDINATORS">Coordenadores de Equipe</option>
              <option value="LEGENDARY">Legendário individual</option>
            </select>
          </label>

          {/* Conditional Select for TOP */}
          {needsTop && (
            <label className="block space-y-2 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Selecione o TOP</span>
              <select
                className="input"
                value={value.topEventId ?? ''}
                onChange={(event) => patch({ topEventId: event.target.value, targetId: '' })}
                required
              >
                <option value="">Selecione o TOP</option>
                {topOptions.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Conditional Select for Family of a TOP */}
          {needsFamily && (
            <label className="block space-y-2 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Selecione a Família</span>
              <select
                className="input"
                value={value.targetId ?? ''}
                disabled={!value.topEventId}
                onChange={(event) => patch({ targetId: event.target.value })}
                required
              >
                <option value="">Selecione a Família</option>
                {familyOptions.map((fam) => (
                  <option key={fam.id} value={fam.id}>
                    {fam.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Conditional Select for Team */}
          {needsTeam && (
            <label className="block space-y-2 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Selecione a Equipe</span>
              <select
                className="input"
                value={value.targetId ?? ''}
                onChange={(event) => patch({ targetId: event.target.value })}
                required
              >
                <option value="">Selecione a equipe</option>
                {teamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Conditional Select for Legendary */}
          {needsLegendary && (
            <label className="block space-y-2 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Selecione o Legendário</span>
              <LegendarioCombobox label="Selecione o Legendário" value={value.targetId ?? ''} onChange={(id) => patch({ targetId: id })} clearable={false} noneLabel="Selecione o legendário" />
            </label>
          )}
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/20 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900/60 hover:text-zinc-100 w-fit">
          <input
            type="checkbox"
            checked={value.requiresConfirmation}
            onChange={(event) => patch({ requiresConfirmation: event.target.checked })}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-600 focus:ring-orange-500/20"
          />
          <span>Exigir confirmação de leitura dos destinatários</span>
        </label>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-semibold max-w-lg">
            * Escolha o público-alvo e selecione os filtros acima para enviar mensagens direcionadas para a manada de forma correta e sem erros.
          </p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50 shadow-lg shadow-orange-950/20"
          >
            {saving ? 'Salvando...' : 'Salvar Rascunho'}
          </button>
        </div>
      </div>
    </div>
  );
}
