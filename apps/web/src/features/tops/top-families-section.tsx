'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addTopFamilyMember, createTopFamily, deactivateTopFamily, deactivateTopFamilyMember, getTopFamilies, getTopFamilyMembers, transferTopFamilyMember, updateTopFamily } from './api';
import type { TopFamily, TopFamilyMember, TopFamilyPayload } from './types';
import { Edit2, ShieldAlert, Heart } from 'lucide-react';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { LegendarioCombobox } from '@/features/legendarios/legendario-combobox';
import { ParticipantCombobox } from './participant-combobox';
import { ApiError } from '@/lib/api';

type FamilyForm = { name: string; representativeLegendaryId: string; representativeLabel: string; representativeRole: string; deputyRepresentativeLegendaryId: string; deputyRepresentativeLabel: string; deputyRepresentativeRole: string; notes: string; needsReview: boolean };

const emptyForm: FamilyForm = { name: '', representativeLegendaryId: '', representativeLabel: '', representativeRole: '', deputyRepresentativeLegendaryId: '', deputyRepresentativeLabel: '', deputyRepresentativeRole: '', notes: '', needsReview: false };

export type FamilyPermissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  addMember: boolean;
  transferMember: boolean;
  removeMember: boolean;
};

export function buildFamilyPayload(form: FamilyForm, editing: boolean): TopFamilyPayload {
  const emptyOptionalValue = editing ? null : undefined;
  return {
    ...form,
    representativeLegendaryId: form.representativeLegendaryId || emptyOptionalValue,
    representativeRole: form.representativeRole || emptyOptionalValue,
    deputyRepresentativeLegendaryId: form.deputyRepresentativeLegendaryId || emptyOptionalValue,
    deputyRepresentativeRole: form.deputyRepresentativeRole || emptyOptionalValue,
    notes: form.notes || emptyOptionalValue,
  };
}

export function TopFamiliesSection({ topId, permissions }: { topId: string; permissions: FamilyPermissions }) {
  const [families, setFamilies] = useState<TopFamily[]>([]);
  const [membersByFamily, setMembersByFamily] = useState<Record<string, TopFamilyMember[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FamilyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [selectedParticipantLabel, setSelectedParticipantLabel] = useState('');
  const [memberNotes, setMemberNotes] = useState('');
  const [memberNeedsReview, setMemberNeedsReview] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, [topId]);

  async function refresh() {
    try {
      setLoadError(null);
      const response = await getTopFamilies(topId);
      setFamilies(response.data);
      const entries = await Promise.all(response.data.map(async (family) => [family.id, (await getTopFamilyMembers(topId, family.id)).data] as const));
      setMembersByFamily(Object.fromEntries(entries));
    } catch {
      setLoadError('Não foi possível carregar famílias do TOP.');
    }
  }

  async function submitFamily(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload = buildFamilyPayload(form, Boolean(editingId));
    try {
      if (editingId) await updateTopFamily(topId, editingId, payload);
      else await createTopFamily(topId, payload);
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setLoadError('Você não tem permissão para editar famílias deste TOP.');
      } else if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        setLoadError('Não foi possível salvar a família. Verifique o nome e os representantes selecionados.');
      } else {
        setLoadError('Não foi possível salvar a família. Tente novamente.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!selectedFamilyId || !selectedParticipantId) return;
    setBusy(true);
    try {
      setLoadError(null);
      await addTopFamilyMember(topId, selectedFamilyId, { topParticipantId: selectedParticipantId, notes: memberNotes.trim() || undefined, needsReview: memberNeedsReview });
      // Limpa a seleção somente após sucesso e recarrega para refletir o novo vínculo.
      setSelectedParticipantId('');
      setSelectedParticipantLabel('');
      setMemberNotes('');
      setMemberNeedsReview(false);
      await refresh();
    } catch (error) {
      // Conflito/validação (participante perdeu elegibilidade ou já está em Família ativa):
      // preserva a seleção e mostra erro acionável em vez de transformar em lista vazia.
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        setLoadError('Não foi possível adicionar: o participante pode já estar em uma família ativa ou não estar mais elegível. Busque novamente.');
      } else if (error instanceof ApiError && error.status === 403) {
        setLoadError('Você não tem permissão para adicionar membros neste TOP.');
      } else {
        setLoadError('Não foi possível adicionar o membro. Tente novamente.');
      }
    } finally {
      setBusy(false);
    }
  }

  function editFamily(family: TopFamily) {
    setEditingId(family.id);
    // Os rótulos vêm do payload da Família (que já inclui os dirigentes): sem eles o combobox
    // iria buscar `GET /legendarios/:id`, rota que exige `legendarios.read`.
    setForm({ name: family.name, representativeLegendaryId: family.representativeLegendaryId ?? '', representativeLabel: family.representative?.fullName ?? '', representativeRole: family.representativeRole ?? '', deputyRepresentativeLegendaryId: family.deputyRepresentativeLegendaryId ?? '', deputyRepresentativeLabel: family.deputyRepresentative?.fullName ?? '', deputyRepresentativeRole: family.deputyRepresentativeRole ?? '', notes: family.notes ?? '', needsReview: family.needsReview });
  }

  async function deactivateFamily(familyId: string) {
    try {
      await deactivateTopFamily(topId, familyId);
      await refresh();
    } catch {
      setLoadError('Não foi possível inativar a família.');
    }
  }

  async function transferMember(familyId: string, memberId: string, targetFamilyId: string) {
    try {
      await transferTopFamilyMember(topId, familyId, memberId, targetFamilyId);
      await refresh();
    } catch {
      setLoadError('Não foi possível transferir o membro.');
    }
  }

  async function removeMember(familyId: string, memberId: string) {
    try {
      await deactivateTopFamilyMember(topId, familyId, memberId);
      await refresh();
    } catch {
      setLoadError('Não foi possível remover o membro da família.');
    }
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

      {loadError ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {loadError}
        </div>
      ) : null}

      {/* Form: Create/Edit Family */}
      {(permissions.create || (Boolean(editingId) && permissions.update)) ? (
      <form onSubmit={submitFamily} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 md:grid-cols-6 items-end">
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nome da Família</span>
          <input className="input text-xs" placeholder="Nome da Família" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Representante</span>
          <LegendarioCombobox value={form.representativeLegendaryId} onChange={(value) => setForm({ ...form, representativeLegendaryId: value })} initialLabel={form.representativeLabel || undefined} noneLabel="Não informado" />
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Função rep.</span>
          <input className="input text-xs" placeholder="DOC, SEG, Logística..." value={form.representativeRole} onChange={(event) => setForm({ ...form, representativeRole: event.target.value })} />
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sub-representante</span>
          <LegendarioCombobox value={form.deputyRepresentativeLegendaryId} onChange={(value) => setForm({ ...form, deputyRepresentativeLegendaryId: value })} initialLabel={form.deputyRepresentativeLabel || undefined} noneLabel="Não informado" />
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Função sub</span>
          <input className="input text-xs" placeholder="Apoio, Eventos..." value={form.deputyRepresentativeRole} onChange={(event) => setForm({ ...form, deputyRepresentativeRole: event.target.value })} />
        </div>
        <div className="md:col-span-1 block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações</span>
          <input className="input text-xs" placeholder="Observações" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </div>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/20 px-3 text-xs font-semibold text-zinc-300">
          <input type="checkbox" checked={form.needsReview} onChange={(event) => setForm({ ...form, needsReview: event.target.checked })} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-600" />
          Revisar
        </label>
        <button disabled={busy} className="flex h-11 items-center justify-center rounded-lg bg-orange-600 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50">
          {editingId ? 'Salvar Família' : 'Criar Família'}
        </button>
      </form>
      ) : null}

      {/* Form: Add Participant to Family */}
      {permissions.addMember ? (
      <form onSubmit={addMember} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 md:grid-cols-4 items-end">
        <div className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Selecionar Família</span>
          <select className="input text-xs" value={selectedFamilyId} onChange={(event) => setSelectedFamilyId(event.target.value)} required>
            <option value="">Família</option>
            {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </div>
        <div className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Selecionar Participante Disponível</span>
          <ParticipantCombobox
            topId={topId}
            value={selectedParticipantId}
            selectedLabel={selectedParticipantLabel}
            onChange={(value, label) => {
              setSelectedParticipantId(value);
              setSelectedParticipantLabel(value ? label : '');
            }}
          />
        </div>
        <div className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações</span>
          <input className="input text-xs" value={memberNotes} onChange={(event) => setMemberNotes(event.target.value)} placeholder="Função, equipe, igreja..." />
        </div>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/20 px-3 text-xs font-semibold text-zinc-300">
          <input type="checkbox" checked={memberNeedsReview} onChange={(event) => setMemberNeedsReview(event.target.checked)} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-600" />
          Revisar
        </label>
        <button disabled={busy} className="flex h-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50">
          Adicionar Membro
        </button>
      </form>
      ) : null}

      {/* Grid of Family Panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {families.map((family) => (
          <article key={family.id} className="rounded-xl border border-zinc-800 bg-[#0B0B0C] p-4 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-850 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wide">{family.name}</h4>
                {family.needsReview ? <span className="mt-1 inline-flex rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">Revisar</span> : null}
                <p className="text-xs text-zinc-500 mt-1 font-semibold">Rep.: <span className="text-zinc-300">{family.representative?.fullName ?? '-'}</span>{family.representativeRole ? <span className="text-orange-400"> - {family.representativeRole}</span> : null}</p>
                <p className="text-xs text-zinc-500 font-semibold">Sub: <span className="text-zinc-300">{family.deputyRepresentative?.fullName ?? '-'}</span>{family.deputyRepresentativeRole ? <span className="text-orange-400"> - {family.deputyRepresentativeRole}</span> : null}</p>
              </div>
              {(permissions.update || permissions.delete) ? (
                <ActionMenu
                  items={[
                    ...(permissions.update ? [{ label: 'Editar', onClick: () => editFamily(family), icon: <Edit2 className="h-3.5 w-3.5" /> }] : []),
                    ...(permissions.delete ? [{ label: 'Inativar', onClick: () => void deactivateFamily(family.id), icon: <ShieldAlert className="h-3.5 w-3.5" />, destructive: true as const }] : []),
                  ]}
                />
              ) : null}
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {(membersByFamily[family.id] ?? []).map((member) => (
                <div key={member.id} className="flex flex-col gap-2 rounded-lg bg-zinc-900/20 border border-zinc-850/50 p-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-zinc-200">
                    {member.topParticipant?.legendary?.fullName} <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">({member.status})</span>
                    {member.needsReview ? <span className="ml-2 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">Revisar</span> : null}
                    {member.notes ? <span className="block text-[11px] text-zinc-500">{member.notes}</span> : null}
                  </span>
                  <div className="flex gap-2 items-center">
                    {permissions.transferMember ? (
                      <select
                        className="rounded bg-zinc-850 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
                        defaultValue=""
                        onChange={(event) => event.target.value && void transferMember(family.id, member.id, event.target.value)}
                      >
                        <option value="">Transferir</option>
                        {families.filter((item) => item.id !== family.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    ) : null}
                    {permissions.removeMember ? (
                      <button
                        type="button"
                        onClick={() => void removeMember(family.id, member.id)}
                        className="rounded border border-rose-900/30 bg-rose-950/10 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-950/30"
                      >
                        Remover
                      </button>
                    ) : null}
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
