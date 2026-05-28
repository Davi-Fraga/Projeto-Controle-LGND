'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addTopFamilyMember, createTopFamily, deactivateTopFamily, deactivateTopFamilyMember, getTopFamilies, getTopFamilyMembers, getTopParticipants, searchLegendarios, transferTopFamilyMember, updateTopFamily } from './api';
import type { TopFamily, TopFamilyMember, TopParticipant } from './types';
import type { Legendary } from '@central-da-manada/shared';
import { Users, Plus, Edit2, ShieldAlert, Heart, Calendar } from 'lucide-react';

type FamilyForm = { name: string; representativeLegendaryId: string; deputyRepresentativeLegendaryId: string; notes: string };

const emptyForm: FamilyForm = { name: '', representativeLegendaryId: '', deputyRepresentativeLegendaryId: '', notes: '' };

export function TopFamiliesSection({ topId }: { topId: string }) {
  const [families, setFamilies] = useState<TopFamily[]>([]);
  const [membersByFamily, setMembersByFamily] = useState<Record<string, TopFamilyMember[]>>({});
  const [participants, setParticipants] = useState<TopParticipant[]>([]);
  const [legendarios, setLegendarios] = useState<Legendary[]>([]);
  const [form, setForm] = useState<FamilyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [busy, setBusy] = useState(false);

  const activeMembers = useMemo(() => new Set(Object.values(membersByFamily).flat().map((member) => member.topParticipantId)), [membersByFamily]);
  const availableParticipants = participants.filter((participant) => !activeMembers.has(participant.id));

  useEffect(() => {
    refresh();
    getTopParticipants(topId, { perPage: 200 }).then((response) => setParticipants(response.data));
    searchLegendarios({ perPage: 200, orderBy: 'fullName', orderDirection: 'asc' }).then((response) => setLegendarios(response.data));
  }, [topId]);

  async function refresh() {
    const response = await getTopFamilies(topId);
    setFamilies(response.data);
    const entries = await Promise.all(response.data.map(async (family) => [family.id, (await getTopFamilyMembers(topId, family.id)).data] as const));
    setMembersByFamily(Object.fromEntries(entries));
  }

  async function submitFamily(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload = { ...form, deputyRepresentativeLegendaryId: form.deputyRepresentativeLegendaryId || undefined };
    try {
      if (editingId) await updateTopFamily(topId, editingId, payload);
      else await createTopFamily(topId, payload);
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!selectedFamilyId || !selectedParticipantId) return;
    setBusy(true);
    try {
      await addTopFamilyMember(topId, selectedFamilyId, { topParticipantId: selectedParticipantId });
      setSelectedParticipantId('');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function editFamily(family: TopFamily) {
    setEditingId(family.id);
    setForm({ name: family.name, representativeLegendaryId: family.representativeLegendaryId, deputyRepresentativeLegendaryId: family.deputyRepresentativeLegendaryId ?? '', notes: family.notes ?? '' });
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Famílias do TOP</h3>
        </div>
      </div>

      {/* Form: Create/Edit Family */}
      <form onSubmit={submitFamily} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 md:grid-cols-5 items-end">
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nome da Família</span>
          <input className="input text-xs" placeholder="Nome da Família" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Representante</span>
          <select className="input text-xs" value={form.representativeLegendaryId} onChange={(event) => setForm({ ...form, representativeLegendaryId: event.target.value })} required>
            <option value="">Representante</option>
            {legendarios.map((legendario) => <option key={legendario.id} value={legendario.id}>{legendario.fullName}</option>)}
          </select>
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sub-representante</span>
          <select className="input text-xs" value={form.deputyRepresentativeLegendaryId} onChange={(event) => setForm({ ...form, deputyRepresentativeLegendaryId: event.target.value })}>
            <option value="">Sub-representante</option>
            {legendarios.map((legendario) => <option key={legendario.id} value={legendario.id}>{legendario.fullName}</option>)}
          </select>
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações</span>
          <input className="input text-xs" placeholder="Observações" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </div>
        <button disabled={busy} className="flex h-11 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50">
          {editingId ? 'Salvar Família' : 'Criar Família'}
        </button>
      </form>

      {/* Form: Add Participant to Family */}
      <form onSubmit={addMember} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 md:grid-cols-3 items-end">
        <div className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Selecionar Família</span>
          <select className="input text-xs" value={selectedFamilyId} onChange={(event) => setSelectedFamilyId(event.target.value)} required>
            <option value="">Família</option>
            {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </div>
        <div className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Selecionar Participante Disponível</span>
          <select className="input text-xs" value={selectedParticipantId} onChange={(event) => setSelectedParticipantId(event.target.value)} required>
            <option value="">Participante</option>
            {availableParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.legendary?.fullName}</option>)}
          </select>
        </div>
        <button disabled={busy} className="flex h-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50">
          Adicionar Membro
        </button>
      </form>

      {/* Grid of Family Panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {families.map((family) => (
          <article key={family.id} className="rounded-xl border border-zinc-800 bg-[#0B0B0C] p-4 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-850 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wide">{family.name}</h4>
                <p className="text-xs text-zinc-500 mt-1 font-semibold">Rep: <span className="text-zinc-300">{family.representative?.fullName ?? '-'}</span></p>
                <p className="text-xs text-zinc-500 font-semibold">Sub: <span className="text-zinc-300">{family.deputyRepresentative?.fullName ?? '-'}</span></p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editFamily(family)} className="flex h-7 items-center rounded bg-zinc-800 px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700">Editar</button>
                <button type="button" onClick={() => deactivateTopFamily(topId, family.id).then(refresh)} className="flex h-7 items-center rounded border border-rose-900/30 bg-rose-950/20 px-2.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/50 hover:text-rose-300">Inativar</button>
              </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {(membersByFamily[family.id] ?? []).map((member) => (
                <div key={member.id} className="flex flex-col gap-2 rounded-lg bg-zinc-900/20 border border-zinc-850/50 p-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-zinc-200">
                    {member.topParticipant?.legendary?.fullName} <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">({member.status})</span>
                  </span>
                  <div className="flex gap-2 items-center">
                    <select
                      className="rounded bg-zinc-850 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
                      defaultValue=""
                      onChange={(event) => event.target.value && transferTopFamilyMember(topId, family.id, member.id, event.target.value).then(refresh)}
                    >
                      <option value="">Transferir</option>
                      {families.filter((item) => item.id !== family.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => deactivateTopFamilyMember(topId, family.id, member.id).then(refresh)}
                      className="rounded border border-rose-900/30 bg-rose-950/10 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-950/30"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {!membersByFamily[family.id]?.length && (
                <p className="text-xs text-zinc-500 font-semibold py-2">Nenhum membro ativo nesta família.</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
