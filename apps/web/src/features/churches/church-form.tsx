'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Church } from '@central-da-manada/shared';
import { createChurch, updateChurch, type ChurchPayload } from './api';
import { getUsers, type UserSummary } from '@/features/users/api';

type Props = { church?: Church };

type FormState = {
  name: string;
  city: string;
  spiritualLeaderName: string;
  spiritualLeaderPhone: string;
  spiritualLeaderUserId: string;
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
    spiritualLeaderName: church?.spiritualLeaderName ?? '',
    spiritualLeaderPhone: church?.spiritualLeaderPhone ?? '',
    spiritualLeaderUserId: church?.spiritualLeaderUserId ?? '',
    latitude: church?.latitude != null ? String(church.latitude) : '',
    longitude: church?.longitude != null ? String(church.longitude) : '',
    notes: church?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      spiritualLeaderName: form.spiritualLeaderName.trim() || null,
      spiritualLeaderPhone: form.spiritualLeaderPhone.trim() || null,
      spiritualLeaderUserId: form.spiritualLeaderUserId || null,
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
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nome do Líder (livre)</span>
          <input className="input" value={form.spiritualLeaderName} onChange={(e) => setField('spiritualLeaderName', e.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Telefone do Líder</span>
          <input className="input" value={form.spiritualLeaderPhone} onChange={(e) => setField('spiritualLeaderPhone', e.target.value)} />
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
        <div className="md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500">Localização (Mapa)</span>
        </div>
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
