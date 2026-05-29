'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopEventStatus, type Legendary } from '@central-da-manada/shared';
import { createTop, searchLegendarios, updateTop } from './api';
import type { TopEvent, TopPayload } from './types';

export function TopForm({ top }: { top?: TopEvent }) {
  const router = useRouter();
  const [legendarios, setLegendarios] = useState<Legendary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<TopPayload>({
    name: top?.name ?? '',
    number: top?.number ?? 1,
    city: top?.city ?? '',
    location: top?.location ?? '',
    startDate: top?.startDate?.slice(0, 10) ?? '',
    endDate: top?.endDate?.slice(0, 10) ?? '',
    status: top?.status ?? TopEventStatus.PLANNED,
    representativeLegendaryId: top?.representativeLegendaryId ?? '',
    deputyRepresentativeLegendaryId: top?.deputyRepresentativeLegendaryId ?? '',
    generalCoordinatorLegendaryId: top?.generalCoordinatorLegendaryId ?? '',
    familyCoordinatorLegendaryId: top?.familyCoordinatorLegendaryId ?? '',
    familyDeputyCoordinatorLegendaryId: top?.familyDeputyCoordinatorLegendaryId ?? '',
    familyGeneralCoordinatorLegendaryId: top?.familyGeneralCoordinatorLegendaryId ?? '',
    notes: top?.notes ?? '',
    needsReview: top?.needsReview ?? false,
  });

  useEffect(() => {
    searchLegendarios({ page: 1, perPage: 100, orderBy: 'fullName' }).then((r) => setLegendarios(r.data)).catch(() => setError('Nao foi possivel carregar Legendarios.'));
  }, []);

  function setField<T extends keyof TopPayload>(field: T, value: TopPayload[T]) { setPayload((current) => ({ ...current, [field]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const cleaned = {
        ...payload,
        number: Number(payload.number),
        location: payload.location || undefined,
        representativeLegendaryId: payload.representativeLegendaryId || undefined,
        deputyRepresentativeLegendaryId: payload.deputyRepresentativeLegendaryId || undefined,
        generalCoordinatorLegendaryId: payload.generalCoordinatorLegendaryId || undefined,
        familyCoordinatorLegendaryId: payload.familyCoordinatorLegendaryId || undefined,
        familyDeputyCoordinatorLegendaryId: payload.familyDeputyCoordinatorLegendaryId || undefined,
        familyGeneralCoordinatorLegendaryId: payload.familyGeneralCoordinatorLegendaryId || undefined,
        notes: payload.notes || undefined,
        needsReview: payload.needsReview,
      };
      const result = top ? await updateTop(top.id, cleaned) : await createTop(cleaned);
      router.push(`/dashboard/tops/${result.data.id}`);
    } catch { setError('Nao foi possivel salvar o TOP. Verifique os dados.'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-2">
        <Field label="Nome do TOP">
          <input className="input" value={payload.name} onChange={(e) => setField('name', e.target.value)} required />
        </Field>
        <Field label="Número do TOP">
          <input className="input" type="number" value={payload.number} onChange={(e) => setField('number', Number(e.target.value))} required />
        </Field>
        <Field label="Cidade Sede">
          <input className="input" value={payload.city} onChange={(e) => setField('city', e.target.value)} required />
        </Field>
        <Field label="Local / Chácara">
          <input className="input" value={payload.location} onChange={(e) => setField('location', e.target.value)} />
        </Field>
        <Field label="Data de Início">
          <input className="input" type="date" value={payload.startDate} onChange={(e) => setField('startDate', e.target.value)} required />
        </Field>
        <Field label="Data de Fim">
          <input className="input" type="date" value={payload.endDate} onChange={(e) => setField('endDate', e.target.value)} required />
        </Field>
        <Field label="Status">
          <select className="input" value={payload.status} onChange={(e) => setField('status', e.target.value)}>
            {Object.values(TopEventStatus).map((s) => (
              <option key={s} value={s}>
                {s === 'PLANNED' ? 'Planejado' : s === 'REGISTRATION_OPEN' ? 'Inscrições Abertas' : s === 'ACTIVE' ? 'Em Andamento' : s === 'COMPLETED' ? 'Concluído' : s === 'CANCELLED' ? 'Cancelado' : s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Representante da Manada">
          <PersonSelect value={payload.representativeLegendaryId} items={legendarios} onChange={(v) => setField('representativeLegendaryId', v)} />
        </Field>
        <Field label="Sub-representante da Manada">
          <PersonSelect value={payload.deputyRepresentativeLegendaryId} items={legendarios} onChange={(v) => setField('deputyRepresentativeLegendaryId', v)} />
        </Field>
        <Field label="Coordenador Geral">
          <PersonSelect value={payload.generalCoordinatorLegendaryId} items={legendarios} onChange={(v) => setField('generalCoordinatorLegendaryId', v)} />
        </Field>
        <div className="md:col-span-2 mt-2 border-t border-zinc-800 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Coordenação das Famílias</h2>
        </div>
        <Field label="Coordenador das Famílias">
          <PersonSelect value={payload.familyCoordinatorLegendaryId} items={legendarios} onChange={(v) => setField('familyCoordinatorLegendaryId', v)} />
        </Field>
        <Field label="Subcoordenador das Famílias">
          <PersonSelect value={payload.familyDeputyCoordinatorLegendaryId} items={legendarios} onChange={(v) => setField('familyDeputyCoordinatorLegendaryId', v)} />
        </Field>
        <Field label="Coordenador Geral das Famílias">
          <PersonSelect value={payload.familyGeneralCoordinatorLegendaryId} items={legendarios} onChange={(v) => setField('familyGeneralCoordinatorLegendaryId', v)} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-zinc-800 bg-zinc-900/20 px-4 py-2.5 text-xs font-semibold text-zinc-300">
          <input type="checkbox" checked={Boolean(payload.needsReview)} onChange={(e) => setField('needsReview', e.target.checked)} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-600 focus:ring-orange-500/20 focus:ring-offset-zinc-950" />
          Precisa de revisão
        </label>
        <Field label="Observações do Evento" className="md:col-span-2">
          <textarea className="input min-h-28 py-2.5" value={payload.notes} onChange={(e) => setField('notes', e.target.value)} />
        </Field>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar TOP'}
        </button>
        <button
          type="button"
          className="flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-6 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-200"
          onClick={() => router.back()}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, children, className }: FieldProps) {
  return (
    <label className={`block space-y-2 ${className || ''}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function PersonSelect({ value, items, onChange }: { value?: string; items: Legendary[]; onChange: (value: string) => void }) {
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Não definido</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {i.fullName}
        </option>
      ))}
    </select>
  );
}
