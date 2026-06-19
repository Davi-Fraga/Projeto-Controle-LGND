'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { OrgNodeData } from './layout';

type OrgNodeProps = NodeProps & {
  data: OrgNodeData & { onToggle?: (id: string) => void };
};

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-zinc-600" />
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-zinc-600" />
    </>
  );
}

function CountBadge({ count, color }: { count: number; color: string }) {
  return (
    <span
      className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow"
      style={{ backgroundColor: color }}
      title={`${count} pessoa(s)`}
    >
      {count}
    </span>
  );
}

export function OrgChartNodeCard({ id, data }: OrgNodeProps) {
  const { node, color, hasChildren, collapsed, onToggle } = data;
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) onToggle?.(id);
  };

  // ROOT — colored pill
  if (node.kind === 'root') {
    return (
      <div
        onClick={toggle}
        className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center shadow-lg ${hasChildren ? 'cursor-pointer' : ''}`}
        style={{ backgroundColor: color }}
      >
        <Handles />
        <span className="truncate text-sm font-black uppercase tracking-wide text-white" title={node.label}>{node.label}</span>
        {node.count > 0 ? <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-bold text-white">{node.count}</span> : null}
      </div>
    );
  }

  // PERSON / MEMBER — dark rounded card
  if (node.kind === 'person') {
    return (
      <div className="flex w-full items-center rounded-xl border border-zinc-800 bg-[#161616] px-3 py-2 shadow-md">
        <Handles />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100" title={node.label}>{node.label}</p>
          {node.subtitle ? <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500" title={node.subtitle}>{node.subtitle}</p> : null}
        </div>
      </div>
    );
  }

  // LEADER / GROUP / CITY — branch card (colored) with count badge
  return (
    <div
      onClick={toggle}
      className={`relative flex w-full items-center gap-2 rounded-xl border bg-[#17171b] px-3 py-2 shadow-md ${hasChildren ? 'cursor-pointer hover:bg-[#1d1d22]' : ''}`}
      style={{ borderColor: color, borderLeftWidth: 4 }}
    >
      <Handles />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" style={{ color }} title={node.label}>{node.label}</p>
        {node.subtitle ? <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500" title={node.subtitle}>{node.subtitle}</p> : null}
      </div>
      {node.count > 0 ? <CountBadge count={node.count} color={color} /> : null}
      {hasChildren ? (
        <span className="flex h-5 w-5 items-center justify-center rounded text-zinc-400" aria-label={collapsed ? 'Expandir' : 'Recolher'}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </span>
      ) : null}
    </div>
  );
}
