'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cleanPhone, LegendaryStatus, maskPhoneInput } from '@central-da-manada/shared';
import { getTopOptions, getTopFamilyOptions } from '@/features/tops/api';
import type { OptionItem } from '@/features/tops/types';
import {
  createChurch,
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
  needsReview: false,
  expertiseIds: [],
  firstTopIsExternal: false,
  firstTopEventId: '',
  firstTopFamilyId: '',
  firstTopExternalText: '',
  firstTopNotes: '',
};

const ADD_CHURCH_VALUE = '__add_church__';

type Props = {
  legendario?: Legendary;
  returnTo?: string;
};

export function LegendarioForm({ legendario, returnTo }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<LegendarioPayload>(() =>
    legendario
      ? {
          fullName: legendario.fullName,
          lgndNumber: legendario.lgndNumber ?? '',
          phone: maskPhoneInput(legendario.phone ?? ''),
          city: legendario.city ?? '',
          isFromRotaDoCerrado: legendario.isFromRotaDoCerrado,
          churchId: legendario.churchId ?? '',
          servesInChurch: legendario.servesInChurch,
          churchRole: legendario.churchRole ?? '',
          professionId: legendario.professionId ?? '',
          status: legendario.status,
          socialActionInterest: legendario.socialActionInterest,
          notes: legendario.notes ?? '',
          needsReview: legendario.needsReview,
          expertiseIds: legendario.expertises.map((expertise) => expertise.id),
          firstTopIsExternal: legendario.firstTopIsExternal ?? false,
          firstTopEventId: legendario.firstTopEventId ?? '',
          firstTopFamilyId: legendario.firstTopFamilyId ?? '',
          firstTopExternalText: legendario.firstTopExternalText ?? '',
          firstTopNotes: legendario.firstTopNotes ?? '',
        }
      : emptyPayload,
  );
  const [churches, setChurches] = useState<Church[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [expertises, setExpertises] = useState<Expertise[]>([]);
  const [topOptions, setTopOptions] = useState<OptionItem[]>([]);
  const [firstTopFamilyOptions, setFirstTopFamilyOptions] = useState<OptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChurchForm, setShowChurchForm] = useState(false);
  const [churchForm, setChurchForm] = useState({ name: '', city: '', notes: '' });

  useEffect(() => {
    Promise.all([getChurches(), getProfessions(), getExpertises(), getTopOptions()])
      .then(([churchResponse, professionResponse, expertiseResponse, topResponse]) => {
        setChurches(churchResponse.data);
        setProfessions(professionResponse.data);
        setExpertises(expertiseResponse.data);
        setTopOptions(topResponse.data);
      })
      .catch(() => setError('Não foi possível carregar os cadastros auxiliares.'));
  }, []);

  useEffect(() => {
    if (payload.firstTopEventId) {
      getTopFamilyOptions(payload.firstTopEventId)
        .then((response) => setFirstTopFamilyOptions(response.data))
        .catch(console.error);
    } else {
      setFirstTopFamilyOptions([]);
    }
  }, [payload.firstTopEventId]);

  function updateField<T extends keyof LegendarioPayload>(field: T, value: LegendarioPayload[T]) {
    setPayload((current) => ({ ...current, [field]: value }));
  }

  async function saveChurch() {
    if (!churchForm.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await createChurch({
        name: churchForm.name,
        city: churchForm.city || undefined,
        notes: churchForm.notes || undefined,
      });
      setChurches((current) => {
        const exists = current.some((church) => church.id === response.data.id);
        return exists ? current : [...current, response.data].sort((a, b) => a.name.localeCompare(b.name));
      });
      updateField('churchId', response.data.id);
      setChurchForm({ name: '', city: '', notes: '' });
      setShowChurchForm(false);
    } catch {
      setError('Não foi possível cadastrar a igreja.');
    } finally {
      setLoading(false);
    }
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

    if (payload.firstTopIsExternal) {
      if (!payload.firstTopExternalText?.trim()) {
        setError('Informe a rota/TOP de origem para o TOP externo.');
        setLoading(false);
        return;
      }
    } else {
      if (!legendario) {
        if (!payload.firstTopEventId) {
          setError('Primeiro TOP que subiu é obrigatório.');
          setLoading(false);
          return;
        }
        if (!payload.firstTopFamilyId) {
          setError('Família é obrigatória.');
          setLoading(false);
          return;
        }
      }
    }

    try {
      const cleanedPayload = {
        ...payload,
        lgndNumber: payload.lgndNumber || undefined,
        phone: cleanPhone(payload.phone ?? null) ?? undefined,
        city: payload.city || undefined,
        churchId: payload.churchId || undefined,
        churchRole: payload.churchRole || undefined,
        professionId: payload.professionId || undefined,
        notes: payload.notes || undefined,
        needsReview: payload.needsReview,
        firstTopIsExternal: payload.firstTopIsExternal,
        firstTopEventId: !payload.firstTopIsExternal && payload.firstTopEventId ? payload.firstTopEventId : undefined,
        firstTopFamilyId: !payload.firstTopIsExternal && payload.firstTopFamilyId ? payload.firstTopFamilyId : undefined,
        firstTopExternalText: payload.firstTopIsExternal && payload.firstTopExternalText ? payload.firstTopExternalText : undefined,
        firstTopNotes: payload.firstTopNotes || undefined,
      };

      const response = legendario
        ? await updateLegendario(legendario.id, cleanedPayload)
        : await createLegendario(cleanedPayload);

      router.push(returnTo ?? `/dashboard/legendarios/${response.data.id}`);
    } catch {
      setError('Não foi possível salvar o Legendário. Verifique os dados informados.');
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
          <input
            className="input"
            inputMode="tel"
            autoComplete="tel"
            value={payload.phone}
            onChange={(event) => updateField('phone', maskPhoneInput(event.target.value))}
          />
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
          <select
            className="input"
            value={payload.churchId}
            onChange={(event) => {
              if (event.target.value === ADD_CHURCH_VALUE) {
                setShowChurchForm(true);
                return;
              }
              updateField('churchId', event.target.value);
            }}
          >
            <option value="">Não informada</option>
            <option value={ADD_CHURCH_VALUE}>+ Adicionar nova igreja</option>
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

      <section className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-4">
        <Checkbox label="Faz parte da Rota do Cerrado" checked={payload.isFromRotaDoCerrado} onChange={(checked) => updateField('isFromRotaDoCerrado', checked)} />
        <Checkbox label="Serve na igreja" checked={payload.servesInChurch} onChange={(checked) => updateField('servesInChurch', checked)} />
        <Checkbox label="Interesse em ações sociais" checked={payload.socialActionInterest} onChange={(checked) => updateField('socialActionInterest', checked)} />
        <Checkbox label="Precisa de revisão" checked={Boolean(payload.needsReview)} onChange={(checked) => updateField('needsReview', checked)} />
      </section>

      {showChurchForm ? (
        <section className="grid gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 md:grid-cols-3">
          <Field label="Nova igreja">
            <input className="input" value={churchForm.name} onChange={(event) => setChurchForm((current) => ({ ...current, name: event.target.value }))} placeholder="Sem igreja, A confirmar..." />
          </Field>
          <Field label="Cidade opcional">
            <input className="input" value={churchForm.city} onChange={(event) => setChurchForm((current) => ({ ...current, city: event.target.value }))} />
          </Field>
          <Field label="Observação opcional">
            <input className="input" value={churchForm.notes} onChange={(event) => setChurchForm((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          <div className="flex gap-2 md:col-span-3">
            <button type="button" disabled={loading || !churchForm.name.trim()} onClick={saveChurch} className="h-9 rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-orange-500 disabled:opacity-50">
              Salvar igreja
            </button>
            <button type="button" onClick={() => setShowChurchForm(false)} className="h-9 rounded-lg border border-zinc-800 px-4 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-zinc-900">
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      {/* Primeira Montanha Section */}
      <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5 space-y-4 shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Primeira Montanha</h2>

        <Checkbox
          label="Subiu o primeiro TOP em outra rota?"
          checked={payload.firstTopIsExternal}
          onChange={(checked) => {
            updateField('firstTopIsExternal', checked);
            if (checked) {
              updateField('firstTopEventId', '');
              updateField('firstTopFamilyId', '');
            } else {
              updateField('firstTopExternalText', '');
            }
          }}
        />

        {payload.firstTopIsExternal ? (
          <div className="grid gap-4 md:grid-cols-2 animate-in fade-in duration-200">
            <Field label="Informe a rota/TOP de origem">
              <input
                className="input"
                placeholder="Ex.: Rota do Sol - TOP #3"
                value={payload.firstTopExternalText}
                onChange={(event) => updateField('firstTopExternalText', event.target.value)}
                required
              />
            </Field>
            <Field label="Observações do TOP Externo (Opcional)">
              <input
                className="input"
                placeholder="Ex.: Detalhes da subida..."
                value={payload.firstTopNotes}
                onChange={(event) => updateField('firstTopNotes', event.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 animate-in fade-in duration-200">
            <Field label="Primeiro TOP que subiu">
              <select
                className="input"
                value={payload.firstTopEventId}
                onChange={(event) => {
                  updateField('firstTopEventId', event.target.value);
                  updateField('firstTopFamilyId', '');
                }}
                required={!legendario}
              >
                <option value="">{legendario && !payload.firstTopEventId ? 'Pendente de revisão' : 'Selecione o TOP'}</option>
                {topOptions.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Família">
              <select
                className="input"
                value={payload.firstTopFamilyId}
                onChange={(event) => updateField('firstTopFamilyId', event.target.value)}
                required={!legendario}
                disabled={!payload.firstTopEventId}
              >
                <option value="">
                  {!payload.firstTopEventId
                    ? 'Selecione primeiro o TOP'
                    : legendario && !payload.firstTopFamilyId
                    ? 'Pendente de revisão'
                    : 'Selecione a Família'}
                </option>
                {firstTopFamilyOptions.map((fam) => (
                  <option key={fam.id} value={fam.id}>
                    {fam.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Observações da subida (Opcional)">
              <input
                className="input"
                placeholder="Observações..."
                value={payload.firstTopNotes}
                onChange={(event) => updateField('firstTopNotes', event.target.value)}
              />
            </Field>
          </div>
        )}
      </section>

      {/*
        Serviço em TOP não é mais editado no cadastro: o histórico é 1:N (TopServant) e
        passou a ser gerido no perfil do Legendário via endpoints canônicos de servos
        (POST/PATCH/cancel /tops/:topId/servants). Ver LegendarioServiceSection.
      */}

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
          className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50 shadow-lg shadow-orange-950/20"
        >
          {loading ? 'Salvando...' : 'Salvar Cadastro'}
        </button>
        <button
          type="button"
          onClick={() => returnTo ? router.push(returnTo) : router.back()}
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
