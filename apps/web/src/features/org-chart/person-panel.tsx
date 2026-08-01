'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Pencil, ExternalLink, Lock, MapPin, Phone, Building2, Briefcase, ArrowRightLeft, Undo2 } from 'lucide-react';
import { formatPhone, type Legendary } from '@central-da-manada/shared';
import { getLegendario } from '@/features/legendarios/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiError } from '@/lib/api';

// Alvo de move genérico: `id` é o identificador que o `moveFn` espera (refId do
// líder na cidade, ou membershipId do sub-coordenador na equipe).
export type MoveTarget = { id: string; label: string };

// Painel lateral de detalhe da pessoa (Fase 2). Abre a partir de um nó com refId
// (Legendário). Modo leitura por padrão; a ação de editar aparece só com permissão
// (edição parcial). Reusa o endpoint escopado GET /legendarios/:id — não duplica regra.
export function PersonPanel({
  refId,
  personLabel,
  managerLabel,
  canEdit,
  canOpenLegendaryScreen,
  canReorder,
  canStructureChange,
  isCriticalMove,
  canMove,
  moveTargets,
  currentManagerId,
  detachLabel,
  moveFn,
  onMoved,
  onClose,
}: {
  refId: string;
  personLabel: string;
  managerLabel?: string;
  canEdit: boolean;
  /** Link cruzado: o destino fica sob a aba Legendários, que tem regra própria de entrada. */
  canOpenLegendaryScreen: boolean;
  canReorder: boolean;
  canStructureChange: boolean;
  isCriticalMove: boolean;
  canMove: boolean;
  moveTargets: MoveTarget[];
  currentManagerId?: string | null;
  detachLabel: string;
  moveFn: (targetId: string | null) => Promise<unknown>;
  onMoved: () => void;
  onClose: () => void;
}) {
  const [legendary, setLegendary] = useState<Legendary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado do move (Fase 3): destino escolhido, salvando, erro e último undo.
  const [target, setTarget] = useState<string>('');
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ prevManagerId: string | null } | null>(null);
  // Move crítico (mover uma liderança) aguardando confirmação (Fase 4).
  const [pendingMove, setPendingMove] = useState<{ targetId: string | null } | null>(null);

  useEffect(() => {
    // Ao trocar de pessoa, zera o estado de move.
    setTarget('');
    setMoveError(null);
    setUndo(null);
  }, [refId]);

  async function move(targetId: string | null) {
    setMoving(true);
    setMoveError(null);
    try {
      await moveFn(targetId);
      setUndo({ prevManagerId: currentManagerId ?? null });
      onMoved();
    } catch (err) {
      setMoveError(
        err instanceof ApiError && (err.status === 409 || err.status === 400)
          ? 'Não foi possível mover: o gestor de destino está no teto (10) ou o destino é inválido.'
          : err instanceof ApiError && err.status === 403
            ? 'Você não tem permissão para mover esta pessoa (ou ela está fora do seu escopo).'
            : 'Erro ao mover a pessoa.',
      );
    } finally {
      setMoving(false);
    }
  }

  async function runUndo() {
    if (!undo) return;
    setMoving(true);
    setMoveError(null);
    try {
      await moveFn(undo.prevManagerId);
      setUndo(null);
      onMoved();
    } catch {
      setMoveError('Não foi possível desfazer (o estado do destino pode ter mudado).');
    } finally {
      setMoving(false);
    }
  }

  // Mover requer group.reorder; se for uma liderança (crítico), exige também
  // structure.change. Sem a permissão crítica, a ação fica bloqueada com aviso.
  const showMove = canReorder && canMove;
  const blockedCritical = isCriticalMove && !canStructureChange;

  function requestMove() {
    const targetId = target === '__none__' ? null : target;
    if (isCriticalMove) setPendingMove({ targetId }); // pede confirmação
    else void move(targetId);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setLegendary(null);
    getLegendario(refId)
      .then((res) => { if (active) setLegendary(res.data); })
      .catch(() => { if (active) setError('Não foi possível carregar os dados desta pessoa.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refId]);

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-zinc-800 bg-[#0f0f11] shadow-2xl">
      <header className="flex items-start justify-between gap-2 border-b border-zinc-800 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pessoa</p>
          <h3 className="truncate text-base font-bold text-white" title={legendary?.fullName ?? personLabel}>
            {legendary?.fullName ?? personLabel}
          </h3>
        </div>
        <button onClick={onClose} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Contexto hierárquico derivado da árvore (não precisa de fetch). */}
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Vínculo</p>
          <p className="mt-1 text-sm text-zinc-300">
            {managerLabel ? <>Gerido por <span className="font-semibold text-zinc-100">{managerLabel}</span></> : 'Sem gestor definido'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /> Carregando…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-400">{error}</div>
        ) : legendary ? (
          <dl className="space-y-3">
            <Row label="LGND" value={legendary.lgndNumber ? `LGND ${legendary.lgndNumber}` : 'Sem LGND'} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</span>
              <StatusBadge status={legendary.status} />
            </div>
            <Row icon={<Phone className="h-3.5 w-3.5" />} label="Telefone" value={formatPhone(legendary.phone) || '—'} />
            <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Cidade" value={legendary.city || '—'} />
            <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Igreja" value={legendary.church?.name || '—'} />
            <Row icon={<Briefcase className="h-3.5 w-3.5" />} label="Profissão" value={legendary.profession?.name || '—'} />
          </dl>
        ) : null}

        {/* Mover para outro gestor (Fase 3) — alternativa por menu ao drag-and-drop,
            acessível por teclado. Só aparece com permissão e na visão de cidade. */}
        {showMove ? (
          <div className="mt-5 border-t border-zinc-850 pt-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <ArrowRightLeft className="h-3 w-3" /> Mover para outro gestor
            </p>

            {isCriticalMove ? (
              <p className="mt-1 text-[11px] text-amber-400/80">Esta pessoa lidera outros — movê-la reestrutura o grupo (mudança crítica).</p>
            ) : null}

            {undo ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <span className="text-xs font-semibold text-emerald-300">Pessoa movida.</span>
                <button onClick={runUndo} disabled={moving} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-200 hover:text-white disabled:opacity-50">
                  <Undo2 className="h-3.5 w-3.5" /> Desfazer
                </button>
              </div>
            ) : blockedCritical ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] font-semibold text-zinc-500">
                <Lock className="h-3 w-3" /> Mover uma liderança exige permissão de mudança estrutural.
              </p>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={moving}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Escolher gestor…</option>
                  {moveTargets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  {currentManagerId ? <option value="__none__">{detachLabel}</option> : null}
                </select>
                <button
                  onClick={requestMove}
                  disabled={moving || !target}
                  className="h-9 rounded-lg bg-orange-600 px-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-orange-500 disabled:opacity-40"
                >
                  Mover
                </button>
              </div>
            )}

            {moveTargets.length === 0 && !undo && !blockedCritical ? (
              <p className="mt-2 text-[11px] text-zinc-600">Nenhum gestor com vaga nesta cidade (todos no teto de 10).</p>
            ) : null}
            {moveError ? <p className="mt-2 text-[11px] font-semibold text-rose-400">{moveError}</p> : null}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col gap-2 border-t border-zinc-800 p-4">
        {canOpenLegendaryScreen ? (
        <Link
          href={`/dashboard/legendarios/${refId}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver ficha completa
        </Link>
        ) : null}
        {canEdit && canOpenLegendaryScreen ? (
          <Link
            href={`/dashboard/legendarios/${refId}/editar`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-orange-500"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar dados
          </Link>
        ) : (
          <p className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-zinc-500">
            <Lock className="h-3 w-3" /> Acesso somente leitura
          </p>
        )}
      </footer>

      {/* Confirmação de mudança estrutural crítica (Fase 4). */}
      <ConfirmDialog
        isOpen={pendingMove !== null}
        title="Confirmar mudança estrutural"
        description={`Você está movendo ${legendary?.fullName ?? personLabel}, que lidera outras pessoas. Isso reestrutura o grupo sob esta liderança. Deseja continuar?`}
        confirmLabel="Mover"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => { const p = pendingMove; setPendingMove(null); if (p) void move(p.targetId); }}
        onCancel={() => setPendingMove(null)}
      />
    </aside>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {icon}{label}
      </dt>
      <dd className="mt-0.5 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}
