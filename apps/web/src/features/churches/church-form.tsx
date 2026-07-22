'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cleanPhone, maskPhoneInput, type Church } from '@central-da-manada/shared';
import { createChurch, geocodeChurch, updateChurch, type ChurchPayload } from './api';
import { getUsers, type UserSummary } from '@/features/users/api';
import { LegendarioCombobox } from '@/features/legendarios/legendario-combobox';

type Props = { church?: Church };

type FormState = {
  name: string;
  city: string;
  address: string;
  spiritualLeaderName: string;
  spiritualLeaderPhone: string;
  spiritualLeaderUserId: string;
  spiritualLeaderLegendaryId: string;
  latitude: string;
  longitude: string;
  notes: string;
};

export function ChurchForm({ church }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [form, setForm] = useState<FormState>({
    name: church?.name ?? '',
    city: church?.city ?? '',
    address: church?.address ?? '',
    spiritualLeaderName: church?.spiritualLeaderName ?? '',
    spiritualLeaderPhone: maskPhoneInput(church?.spiritualLeaderPhone ?? ''),
    spiritualLeaderUserId: church?.spiritualLeaderUserId ?? '',
    spiritualLeaderLegendaryId: church?.spiritualLeaderLegendaryId ?? '',
    latitude: church?.latitude != null ? String(church.latitude) : '',
    longitude: church?.longitude != null ? String(church.longitude) : '',
    notes: church?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoFeedback, setGeoFeedback] = useState<
    | { kind: 'found'; displayName: string }
    | { kind: 'approximate'; displayName: string }
    | { kind: 'not-found' }
    | { kind: 'error' }
    | null
  >(null);

  async function handleGeocode() {
    if (!form.city.trim()) return;
    setGeoLoading(true);
    setGeoFeedback(null);
    try {
      const response = await geocodeChurch({ city: form.city, name: form.name, address: form.address });
      const result = response.data;
      if (result) {
        setForm((current) => ({ ...current, latitude: String(result.lat), longitude: String(result.lng) }));
        // Honestidade: só é "encontrado" quando casou pelo endereço. Nome/cidade = aproximado.
        setGeoFeedback({ kind: result.precision === 'address' ? 'found' : 'approximate', displayName: result.displayName });
      } else {
        setGeoFeedback({ kind: 'not-found' });
      }
    } catch {
      setGeoFeedback({ kind: 'error' });
    } finally {
      setGeoLoading(false);
    }
  }

  useEffect(() => {
    getUsers({ perPage: 200 })
      .then((response) => setUsers(response.data.filter((u) => u.isActive)))
      .catch(() => setError('Não foi possível carregar os usuários para vínculo.'));
  }, []);

  function setField<T extends keyof FormState>(field: T, value: FormState[T]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload: ChurchPayload = {
      name: form.name.trim(),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      spiritualLeaderName: form.spiritualLeaderName.trim() || null,
      spiritualLeaderPhone: cleanPhone(form.spiritualLeaderPhone),
      spiritualLeaderUserId: form.spiritualLeaderUserId || null,
      spiritualLeaderLegendaryId: form.spiritualLeaderLegendaryId || null,
      latitude: form.latitude.trim() === '' ? null : Number(form.latitude),
      longitude: form.longitude.trim() === '' ? null : Number(form.longitude),
      notes: form.notes.trim() || null,
    };

    if (payload.latitude != null && Number.isNaN(payload.latitude)) {
      setError('Latitude inválida.');
      setLoading(false);
      return;
    }
    if (payload.longitude != null && Number.isNaN(payload.longitude)) {
      setError('Longitude inválida.');
      setLoading(false);
      return;
    }

    try {
      const response = church ? await updateChurch(church.id, payload) : await createChurch(payload);
      router.push('/dashboard/igrejas');
      router.refresh();
      return response;
    } catch {
      setError('Não foi possível salvar a igreja. Verifique os dados informados.');
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
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nome da Igreja</span>
          <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} required minLength={2} />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cidade</span>
          <input className="input" value={form.city} onChange={(e) => setField('city', e.target.value)} />
        </label>
      </section>

      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500">Líder Espiritual</span>
        </div>
        <label className="md:col-span-2 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Legendário vinculado</span>
          <LegendarioCombobox
            value={form.spiritualLeaderLegendaryId}
            initialLabel={church?.spiritualLeaderLegendary?.fullName}
            onChange={(value) => setField('spiritualLeaderLegendaryId', value)}
            placeholder="Buscar líder por nome, cidade ou LGND..."
            noneLabel="Nenhum Legendário vinculado"
          />
          <span className="text-[11px] text-zinc-500">
            Quando vinculado, o nome do Legendário prevalece na exibição. O nome livre abaixo permanece salvo como alternativa.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nome do Líder (livre)</span>
          <input className="input" value={form.spiritualLeaderName} onChange={(e) => setField('spiritualLeaderName', e.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Telefone do Líder</span>
          <input
            className="input"
            inputMode="tel"
            autoComplete="tel"
            value={form.spiritualLeaderPhone}
            onChange={(e) => setField('spiritualLeaderPhone', maskPhoneInput(e.target.value))}
          />
        </label>
        <label className="md:col-span-2 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Usuário vinculado (acesso de líder espiritual)</span>
          <select className="input" value={form.spiritualLeaderUserId} onChange={(e) => setField('spiritualLeaderUserId', e.target.value)}>
            <option value="">Nenhum</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          <span className="text-[11px] text-zinc-500">
            O usuário vinculado verá apenas os membros desta igreja. Deixe em branco se ainda não houver acesso de sistema.
          </span>
        </label>
      </section>

      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500">Localização (Mapa)</span>
          <button
            type="button"
            onClick={handleGeocode}
            disabled={geoLoading || !form.city.trim()}
            className="flex h-9 items-center justify-center rounded-lg border border-orange-600/40 bg-orange-600/10 px-4 text-[11px] font-bold uppercase tracking-wider text-orange-400 transition-all hover:bg-orange-600/20 disabled:opacity-40"
          >
            {geoLoading ? 'Buscando...' : 'Buscar localização automaticamente'}
          </button>
        </div>
        <p className="md:col-span-2 text-[11px] text-zinc-500">
          A localização pode ser preenchida automaticamente usando o nome e a cidade. Informar o <strong>endereço</strong>{' '}
          (rua, número, bairro) torna a busca mais precisa e evita cair no centro da cidade. Ajuste latitude e longitude
          manualmente apenas se o resultado estiver incorreto.
        </p>
        <label className="md:col-span-2 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Endereço</span>
          <input className="input" value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Ex.: Av. Orcalino Santos, 123 - Setor Central" />
        </label>
        {geoFeedback ? (
          <div className="md:col-span-2 text-[11px] font-semibold">
            {geoFeedback.kind === 'found' ? (
              <span className="text-emerald-400">Endereço encontrado: {geoFeedback.displayName}</span>
            ) : geoFeedback.kind === 'approximate' ? (
              <span className="text-amber-400">
                Não encontrei o endereço exato — usei um ponto aproximado ({geoFeedback.displayName}). Confira e ajuste
                latitude/longitude se necessário.
              </span>
            ) : geoFeedback.kind === 'not-found' ? (
              <span className="text-amber-400">Nenhuma localização encontrada. Informe latitude e longitude manualmente.</span>
            ) : (
              <span className="text-rose-400">Não foi possível buscar a localização agora. Tente novamente ou preencha manualmente.</span>
            )}
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Latitude</span>
          <input className="input" type="number" step="any" value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} placeholder="-15.7942" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Longitude</span>
          <input className="input" type="number" step="any" value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} placeholder="-47.8822" />
        </label>
        <label className="md:col-span-2 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Observações</span>
          <textarea className="input min-h-24 py-2.5" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-orange-600 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Igreja'}
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
