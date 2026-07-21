'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronRight, GripVertical } from 'lucide-react';
import type { OrgNodeData } from './layout';

type OrgNodeProps = NodeProps & {
  data: OrgNodeData;
};

// Teto de gestão por subdivisão: ocupação exibida como filhos-diretos/10 nos nós
// de liderança. Vira âmbar só quando lotado.
const GROUP_CAP = 10;

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </>
  );
}

export function OrgChartNodeCard({ id, data }: OrgNodeProps) {
  const { node, color, hasChildren, collapsed, focused, canDrag, isDragging, dropState, onDragStartNode, onDragEndNode, onDropOnNode, onToggle, onFocus } = data;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus?.(id);
    if (hasChildren) onToggle?.(id);
  };

  const dropZoneProps = onDropOnNode
    ? {
        onDragOver: (e: React.DragEvent) => { if (dropState === 'valid') e.preventDefault(); },
        onDrop: (e: React.DragEvent) => { if (dropState === 'valid') { e.preventDefault(); onDropOnNode(id); } },
      }
    : {};

  // Estado visual: foco (laranja) > alvo de drop (verde/vermelho durante arraste) > normal.
  const ring = focused
    ? 'ring-2 ring-[#f97316] ring-offset-2 ring-offset-[#0b0b0d]'
    : dropState === 'valid'
      ? 'ring-2 ring-emerald-400/80'
      : dropState === 'invalid'
        ? 'ring-1 ring-rose-500/30'
        : '';
  const dragCls = isDragging ? 'opacity-40' : '';

  // "Carregar mais" — botão discreto tracejado.
  if (data.loadMore) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onFocus?.(id); }}
        className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#33333a] bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6f6f79] transition-colors hover:border-[#f97316]/40 hover:text-[#f97316]"
      >
        <Handles />
        {node.label}
      </button>
    );
  }

  // BLOCO / CLUSTER — subdivisão fechada de ≤10: header do líder + grade de chips.
  if (data.isCluster && data.members) {
    const members = data.members;
    const shown = members.slice(0, GROUP_CAP);
    const hidden = members.length - shown.length;
    const full = members.length >= GROUP_CAP;
    return (
      <div
        {...dropZoneProps}
        className={`w-full overflow-hidden rounded-xl border border-[#26262c] bg-[#141418] shadow-md ${ring} ${dragCls}`}
        style={{ borderLeftWidth: 2, borderLeftColor: focused ? '#f97316' : color }}
      >
        <Handles />
        {/* Header do líder — clique recolhe o bloco / foca o líder. */}
        <button
          onClick={handleClick}
          className="flex w-full items-center gap-2 border-b border-[#222228] bg-[#17171c] px-2.5 py-2 text-left transition-colors hover:bg-[#1c1c22]"
        >
          {focused ? <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#f97316]" /> : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-tight text-[#e8e8ec]" title={node.label}>{node.label}</span>
            {node.subtitle ? <span className="block truncate text-[10px] uppercase tracking-[0.08em] text-[#6f6f79]">{node.subtitle}</span> : null}
          </span>
          <span className={`flex-shrink-0 text-[10px] font-semibold tabular-nums ${full ? 'text-amber-400' : 'text-[#5f5f69]'}`} title={`${members.length} de ${GROUP_CAP}`}>
            {members.length}/{GROUP_CAP}
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 rotate-90 text-[#6a6a73]" />
        </button>
        {/* Grade de chips — cada membro é clicável (painel) e arrastável (mover). */}
        <div className="grid grid-cols-2 gap-1 p-1.5">
          {shown.map((m) => {
            const active = data.focusedMemberId === m.id;
            return (
              <div
                key={m.id}
                onClick={(e) => { e.stopPropagation(); onFocus?.(m.id); }}
                draggable={canDrag}
                onDragStart={canDrag ? (e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStartNode?.(m.id); } : undefined}
                onDragEnd={canDrag ? () => onDragEndNode?.() : undefined}
                className={`flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1.5 text-[12px] leading-tight transition-colors ${
                  active ? 'border-[#f97316]/60 bg-[#f97316]/10 text-[#f7b489]' : 'border-transparent bg-[#1b1b21] text-[#c9c9cf] hover:bg-[#222229] hover:text-[#e8e8ec]'
                } ${canDrag ? 'active:cursor-grabbing' : ''}`}
                title={m.label}
              >
                {canDrag ? <GripVertical className="h-3 w-3 flex-shrink-0 text-[#4a4a53]" /> : null}
                <span className="truncate">{m.label}</span>
              </div>
            );
          })}
        </div>
        {hidden > 0 ? <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#5a5a63]">+{hidden}</p> : null}
      </div>
    );
  }

  // ROOT — origem do escopo: chip escuro, rótulo em versalete, marcador de acento.
  if (node.kind === 'root') {
    return (
      <div
        onClick={handleClick}
        className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-[#2a2a30] bg-[#121216] px-4 py-2 transition-colors hover:border-[#3a3a42] ${ring} ${dragCls}`}
      >
        <Handles />
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: focused ? '#f97316' : color }} />
        <span className="truncate text-[13px] font-bold uppercase tracking-[0.14em] text-[#efeff2]" title={node.label}>{node.label}</span>
        {node.count > 0 ? <span className="ml-auto text-[11px] font-semibold tabular-nums text-[#5a5a63]">{node.count}</span> : null}
      </div>
    );
  }

  // PERSON — folha: espinha inerte fina, nome + papel; alça de arraste quando permitido.
  if (node.kind === 'person') {
    return (
      <div
        onClick={handleClick}
        className={`group flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-[#26262c] bg-[#151518] py-2 pl-2 pr-3 transition-colors hover:border-[#33333a] hover:bg-[#191920] ${ring} ${dragCls}`}
        style={{ borderLeftWidth: 2, borderLeftColor: focused ? '#f97316' : color }}
      >
        <Handles />
        {canDrag ? (
          <span
            className="nodrag nopan flex-shrink-0 cursor-grab text-[#4a4a53] opacity-0 transition-opacity hover:text-[#9a9aa4] group-hover:opacity-100 active:cursor-grabbing"
            draggable
            onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStartNode?.(id); }}
            onDragEnd={() => onDragEndNode?.()}
            title="Arraste para mover para outro gestor"
            aria-label="Mover pessoa"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        ) : <span className="w-1 flex-shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-[#dcdce0]" title={node.label}>{node.label}</p>
          {node.subtitle ? <p className="truncate text-[10px] uppercase tracking-wide text-[#6a6a73]" title={node.subtitle}>{node.subtitle}</p> : null}
        </div>
        {focused ? <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#f97316]" /> : null}
      </div>
    );
  }

  // LEADER / GROUP / CITY — nó de ramo: espinha da cor da subdivisão, papel discreto,
  // ocupação (líder) e contagem em texto tabular sem badge colorido.
  const direct = node.children.length;
  const showOccupancy = node.kind === 'leader' && direct > 0;
  const full = direct >= GROUP_CAP;
  return (
    <div
      onClick={handleClick}
      {...dropZoneProps}
      className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#26262c] bg-[#17171b] py-2.5 pl-2.5 pr-2.5 transition-colors hover:border-[#35353c] hover:bg-[#1c1c22] ${ring} ${dragCls}`}
      style={{ borderLeftWidth: 2, borderLeftColor: focused ? '#f97316' : color }}
    >
      <Handles />
      {focused ? <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#f97316]" /> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold leading-tight text-[#e8e8ec]" title={node.label}>{node.label}</p>
        {node.subtitle ? <p className="truncate text-[10px] uppercase tracking-[0.08em] text-[#6f6f79]" title={node.subtitle}>{node.subtitle}</p> : null}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {showOccupancy ? (
          <span className={`text-[10px] font-semibold tabular-nums ${full ? 'text-amber-400' : 'text-[#5f5f69]'}`} title={`${direct} de ${GROUP_CAP} na subdivisão`}>
            {direct}/{GROUP_CAP}
          </span>
        ) : node.count > 0 ? (
          <span className="text-[11px] font-semibold tabular-nums text-[#55555f]">{node.count}</span>
        ) : null}
        {hasChildren ? (
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md text-[#6a6a73] transition-transform group-hover:text-[#9a9aa4] ${collapsed ? '' : 'rotate-90'}`}
            aria-label={collapsed ? 'Expandir' : 'Recolher'}
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
