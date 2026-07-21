'use client';

import { SocialActionStatus } from '@central-da-manada/shared';
import type { SocialActionPayload } from './api';

type Props = {
  value: SocialActionPayload;
  saving?: boolean;
  onChange: (payload: SocialActionPayload) => void;
  onSubmit: () => void;
};

export function SocialActionForm({ value, saving, onChange, onSubmit }: Props) {
  function patch(partial: Partial<SocialActionPayload>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Título do Projeto</span>
          <input className="input" placeholder="Ex.: Sopão Solidário da Manada" value={value.title} onChange={(event) => patch({ title: event.target.value })} />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Descrição / Objetivo</span>
          <textarea className="input min-h-28 py-2.5" placeholder="Descreva os objetivos e detalhes do projeto social..." value={value.description ?? ''} onChange={(event) => patch({ description: event.target.value })} />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Local da Ação</span>
            <input className="input" placeholder="Ex.: Praça Central ou Asilo" value={value.location ?? ''} onChange={(event) => patch({ location: event.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cidade</span>
            <input className="input" placeholder="Cidade" value={value.city ?? ''} onChange={(event) => patch({ city: event.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Status</span>
            <select className="input" value={value.status} onChange={(event) => patch({ status: event.target.value as SocialActionStatus })}>
              {Object.values(SocialActionStatus).map((status) => (
                <option key={status} value={status}>
                  {status === 'PLANNED' ? 'Planejado' : status === 'ACTIVE' ? 'Ativo' : status === 'COMPLETED' ? 'Concluído' : status === 'CANCELLED' ? 'Cancelado' : status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Data de Início</span>
            <input className="input" type="datetime-local" value={value.startDate} onChange={(event) => patch({ startDate: event.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Data de Fim</span>
            <input className="input" type="datetime-local" value={value.endDate} onChange={(event) => patch({ endDate: event.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">ID do Responsável (UUID)</span>
            <input className="input" placeholder="Ex.: a1b2c3d4..." value={value.responsibleLegendaryId} onChange={(event) => patch({ responsibleLegendaryId: event.target.value })} />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Observações</span>
          <textarea className="input min-h-20 py-2.5" placeholder="Observações adicionais..." value={value.notes ?? ''} onChange={(event) => patch({ notes: event.target.value })} />
        </label>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-semibold max-w-md">
            * Use o ID único (UUID) do Legendário responsável. As sugestões de voluntários por cidade ficam na tela de detalhes após salvar.
          </p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Ação'}
          </button>
        </div>
      </div>
    </div>
  );
}
