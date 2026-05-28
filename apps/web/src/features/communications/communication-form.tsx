'use client';

import { InternalMessageTargetType } from '@central-da-manada/shared';
import type { CommunicationPayload } from './api';

type Props = {
  value: CommunicationPayload;
  saving?: boolean;
  onChange: (payload: CommunicationPayload) => void;
  onSubmit: () => void;
};

const targetTypes = Object.values(InternalMessageTargetType);

export function CommunicationForm({ value, saving, onChange, onSubmit }: Props) {
  const needsTop = ['TOP_ALL', 'TOP_REPRESENTATIVES', 'TOP_FAMILY_REPRESENTATIVES'].includes(value.targetType);
  const needsTarget = ['TOP_FAMILY', 'TEAM', 'LEGENDARY'].includes(value.targetType);

  function patch(partial: Partial<CommunicationPayload>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Título / Assunto</span>
          <input className="input" placeholder="Ex: Aviso Importante sobre o próximo TOP" value={value.title} onChange={(event) => patch({ title: event.target.value })} />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Mensagem / Conteúdo</span>
          <textarea className="input min-h-40 py-2.5" placeholder="Escreva a mensagem aqui..." value={value.body} onChange={(event) => patch({ body: event.target.value })} />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Público-Alvo</span>
            <select className="input" value={value.targetType} onChange={(event) => patch({ targetType: event.target.value as InternalMessageTargetType, targetId: '', topEventId: '' })}>
              {targetTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL_ACTIVE_LEGENDARIES' ? 'Toda a Manada Ativa' : type === 'TOP_ALL' ? 'Todos de um TOP' : type === 'TOP_REPRESENTATIVES' ? 'Representantes do TOP' : type === 'TEAM' ? 'Equipe' : type === 'TEAM_COORDINATORS' ? 'Coordenadores de Equipe' : type === 'LEGENDARY' ? 'Legendário Individual' : type}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {needsTop || value.targetType === 'TOP_FAMILY' ? 'ID do TOP (Obrigatório)' : 'ID do TOP (Opcional)'}
            </span>
            <input className="input" placeholder="UUID do Evento TOP" value={value.topEventId ?? ''} onChange={(event) => patch({ topEventId: event.target.value })} />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {needsTarget ? 'ID do Alvo (Obrigatório)' : 'ID do Alvo (Opcional)'}
            </span>
            <input className="input" placeholder="UUID da equipe/legendário" value={value.targetId ?? ''} onChange={(event) => patch({ targetId: event.target.value })} />
          </label>
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
            * Para alvos específicos, informe o UUID do Legendário, equipe ou família. Comunicados direcionados a TOP_ALL e representantes necessitam do ID do TOP.
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

