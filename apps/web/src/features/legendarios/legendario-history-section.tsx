'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LegendaryHistoryType } from '@central-da-manada/shared';
import { addLegendarioHistoryNote, getLegendarioHistory } from './api';
import type { LegendaryHistory } from './types';

export function LegendarioHistorySection({ legendarioId, canCreate = false }: { legendarioId: string; canCreate?: boolean }) {
  const [items, setItems] = useState<LegendaryHistory[]>([]);
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    refresh();
  }, [legendarioId, type]);

  async function refresh() {
    const response = await getLegendarioHistory(legendarioId, type || undefined);
    setItems(response.data);
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    await addLegendarioHistoryNote(legendarioId, { title, description });
    setTitle('');
    setDescription('');
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Histórico de Atividades</h2>
        <select
          className="input max-w-xs text-xs"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">Todos os tipos de histórico</option>
          {Object.values(LegendaryHistoryType).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {canCreate ? (
        <form onSubmit={addNote} className="grid gap-3 md:grid-cols-[1.2fr_2fr_auto] bg-zinc-900/10 border border-zinc-800/40 rounded-xl p-4">
          <input
            className="input text-xs"
            placeholder="Título da anotação"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <input
            className="input text-xs"
            placeholder="Descrição detalhada..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button className="flex h-11 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500">
            Adicionar Nota
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 hover:border-zinc-700/80 transition-all duration-200"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">
                  {item.type}
                </p>
              </div>
              <time className="text-xs font-bold text-zinc-500">
                {new Date(item.occurredAt).toLocaleDateString('pt-BR')} às {new Date(item.occurredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
            {item.description && <p className="mt-3 text-sm text-zinc-300 leading-relaxed font-medium">{item.description}</p>}
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-orange-500/85">
              {[item.topEvent?.name, item.team?.name, item.topFamily?.name, item.actor?.name].filter(Boolean).join('  |  ') || 'Registro do Sistema'}
            </p>
          </article>
        ))}
        {!items.length && (
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center py-6">
            Nenhum histórico encontrado para este Legendário.
          </p>
        )}
      </div>
    </div>
  );
}
