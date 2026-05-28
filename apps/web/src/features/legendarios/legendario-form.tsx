'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LegendaryStatus } from '@central-da-manada/shared';
import {
  createLegendario,
  getChurches,
  getExpertises,
  getProfessions,
  updateLegendario,
} from './api';
import type { Church, Expertise, LegendarioPayload, Legendary, Profession } from './types';

const emptyPayload: LegendarioPayload = {
  fullName: '',
  lgndNumber: '',
  phone: '',
  city: '',
  isFromRotaDoCerrado: false,
  churchId: '',
  servesInChurch: false,
  churchRole: '',
  professionId: '',
  status: LegendaryStatus.UNKNOWN,
  socialActionInterest: false,
  notes: '',
  expertiseIds: [],
};

type Props = {
  legendario?: Legendary;
};

export function LegendarioForm({ legendario }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<LegendarioPayload>(() =>
    legendario
      ? {
          fullName: legendario.fullName,
          lgndNumber: legendario.lgndNumber ?? '',
          phone: legendario.phone ?? '',
          city: legendario.city ?? '',
          isFromRotaDoCerrado: legendario.isFromRotaDoCerrado,
          churchId: legendario.churchId ?? '',
          servesInChurch: legendario.servesInChurch,
          churchRole: legendario.churchRole ?? '',
          professionId: legendario.professionId ?? '',
          status: legendario.status,
          socialActionInterest: legendario.socialActionInterest,
          notes: legendario.notes ?? '',
          expertiseIds: legendario.expertises.map((expertise) => expertise.id),
        }
      : emptyPayload,
  );
  const [churches, setChurches] = useState<Church[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [expertises, setExpertises] = useState<Expertise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getChurches(), getProfessions(), getExpertises()])
      .then(([churchResponse, professionResponse, expertiseResponse]) => {
        setChurches(churchResponse.data);
        setProfessions(professionResponse.data);
        setExpertises(expertiseResponse.data);
      })
      .catch(() => setError('Nao foi possivel carregar os cadastros auxiliares.'));
  }, []);

  function updateField<T extends keyof LegendarioPayload>(field: T, value: LegendarioPayload[T]) {
    setPayload((current) => ({ ...current, [field]: value }));
  }

  function toggleExpertise(id: string) {
    setPayload((current) => ({
      ...current,
      expertiseIds: current.expertiseIds.includes(id)
        ? current.expertiseIds.filter((item) => item !== id)
        : [...current.expertiseIds, id],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanedPayload = {
        ...payload,
        lgndNumber: payload.lgndNumber || undefined,
        phone: payload.phone || undefined,
        city: payload.city || undefined,
        churchId: payload.churchId || undefined,
        churchRole: payload.churchRole || undefined,
        professionId: payload.professionId || undefined,
        notes: payload.notes || undefined,
      };

      const response = legendario
        ? await updateLegendario(legendario.id, cleanedPayload)
        : await createLegendario(cleanedPayload);

      router.push(`/dashboard/legendarios/${response.data.id}`);
    } catch {
      setError('Nao foi possivel salvar o Legendario. Verifique os dados informados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-2">
        <Field label="Nome completo">
          <input className="input" value={payload.fullName} onChange={(event) => updateField('fullName', event.target.value)} required />
        </Field>
        <Field label="Número LGND">
          <input className="input" value={payload.lgndNumber} onChange={(event) => updateField('lgndNumber', event.target.value)} />
        </Field>
        <Field label="Telefone / WhatsApp">
          <input className="input" value={payload.phone} onChange={(event) => updateField('phone', event.target.value)} />
        </Field>
        <Field label="Cidade">
          <input className="input" value={payload.city} onChange={(event) => updateField('city', event.target.value)} />
        </Field>
        <Field label="Status">
          <select className="input" value={payload.status} onChange={(event) => updateField('status', event.target.value)}>
            {Object.values(LegendaryStatus).map((status) => (
              <option key={status} value={status}>
                {status === 'ACTIVE' ? 'Ativo' : status === 'INACTIVE' ? 'Inativo' : status === 'AWAY' ? 'Afastado' : status === 'VISITOR' ? 'Visitante' : status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Igreja">
          <select className="input" value={payload.churchId} onChange={(event) => updateField('churchId', event.target.value)}>
            <option value="">Não informada</option>
            {churches.map((church) => (
              <option key={church.id} value={church.id}>{church.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Profissão">
          <select className="input" value={payload.professionId} onChange={(event) => updateField('professionId', event.target.value)}>
            <option value="">Não informada</option>
            {professions.map((profession) => (
              <option key={profession.id} value={profession.id}>{profession.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Função na igreja">
          <input className="input" value={payload.churchRole} onChange={(event) => updateField('churchRole', event.target.value)} />
        </Field>
      </section>

      <section className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-3">
        <Checkbox label="Faz parte da Rota do Cerrado" checked={payload.isFromRotaDoCerrado} onChange={(checked) => updateField('isFromRotaDoCerrado', checked)} />
        <Checkbox label="Serve na igreja" checked={payload.servesInChurch} onChange={(checked) => updateField('servesInChurch', checked)} />
        <Checkbox label="Interesse em ações sociais" checked={payload.socialActionInterest} onChange={(checked) => updateField('socialActionInterest', checked)} />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Expertises</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {expertises.map((expertise) => (
            <Checkbox
              key={expertise.id}
              label={expertise.name}
              checked={payload.expertiseIds.includes(expertise.id)}
              onChange={() => toggleExpertise(expertise.id)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
        <Field label="Observações internas">
          <textarea className="input min-h-32 py-2.5" value={payload.notes} onChange={(event) => updateField('notes', event.target.value)} />
        </Field>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Cadastro'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-6 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/20 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900/60 hover:text-zinc-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-600 focus:ring-orange-500/20 focus:ring-offset-zinc-950"
      />
      <span>{label}</span>
    </label>
  );
}

