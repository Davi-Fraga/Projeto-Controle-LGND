'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { OrgChartNode } from '@central-da-manada/shared';
import { ChevronRight, Search, Undo2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { assignCityLeader, assignTeamManager } from './management-api';
import {
  activeSet,
  buildFlowLayout,
  capChildrenPerLevel,
  chunkLargeGroups,
  collapsedByDefault,
  eligibleCityLeaders,
  eligibleTeamManagers,
  findNodesByLabel,
  isLoadMoreId,
  loadMoreParentId,
  pathToNode,
  MAX_CHILDREN_PER_LEVEL,
  type OrgNodeData,
} from './layout';
import { NEUTRAL_COLOR } from './color';
import { OrgChartNodeCard } from './org-chart-node';
import { PersonPanel, type MoveTarget } from './person-panel';

const nodeTypes = { orgNode: OrgChartNodeCard };

// Overview+detail: abre a raiz e o 1º nível; níveis mais profundos vêm recolhidos
// e o usuário expande sob demanda (não renderiza a árvore inteira de uma vez).
const DEFAULT_OPEN_DEPTH = 1;

function OrgChartCanvas({ root, canEditPerson, canReorder, canStructureChange, canOpenLegendaryScreen, onDataChanged }: { root: OrgChartNode; canEditPerson: boolean; canReorder: boolean; canStructureChange: boolean; canOpenLegendaryScreen: boolean; onDataChanged: () => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => collapsedByDefault(root, DEFAULT_OPEN_DEPTH));
  // Nós cujo limite de filhos foi expandido via "carregar mais" (Fase 5).
  const [expandedCaps, setExpandedCaps] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);
  // Drag-and-drop (Fase 3): pessoa em arraste, toast de undo e erro.
  const [dragging, setDragging] = useState<{ refId: string; currentLeaderRefId: string | null } | null>(null);
  const [dndToast, setDndToast] = useState<{ refId: string; prevLeaderId: string | null } | null>(null);
  const [dndError, setDndError] = useState<string | null>(null);
  // Nó a recentralizar após uma busca (só a busca recentraliza; clique não).
  const fitToId = useRef<string | null>(null);
  const { fitView } = useReactFlow();

  // Reset para o overview sempre que a árvore (view) muda.
  useEffect(() => {
    setCollapsed(collapsedByDefault(root, DEFAULT_OPEN_DEPTH));
    setExpandedCaps(new Set());
    setFocusedId(null);
    setQuery('');
    setNotFound(false);
  }, [root]);

  function expandCap(moreNodeId: string) {
    setExpandedCaps((prev) => new Set(prev).add(loadMoreParentId(moreNodeId)));
  }

  const active = useMemo(() => activeSet(root, focusedId), [root, focusedId]);
  const trail = useMemo(() => (focusedId ? pathToNode(root, focusedId) : []), [root, focusedId]);

  // Detalhe: painel abre quando o nó focado representa uma pessoa (refId presente).
  const selectedNode = trail.length > 0 ? trail[trail.length - 1] : null;
  const managerNode = trail.length > 1 ? trail[trail.length - 2] : null;
  const panelRefId = selectedNode?.refId ?? null;

  // Move: na visão de CIDADE (Líder→legendários, cityLeaderId) e na de EQUIPE
  // (Sub-coordenador→integrantes, managerMembershipId). Cada uma usa o seu endpoint.
  const isCityView = root.kind === 'city';
  const isTeamView = root.id.startsWith('team:');
  const currentLeaderRefId = managerNode?.kind === 'leader' ? managerNode.refId ?? null : null;
  const memberId = (nodeId: string) => (nodeId.startsWith('member:') ? nodeId.slice('member:'.length) : null);

  const moveCtx = useMemo(() => {
    const empty = { canMove: false, moveTargets: [] as MoveTarget[], currentManagerId: null as string | null, detachLabel: 'Sem gestor', moveFn: (async () => {}) as (t: string | null) => Promise<unknown>, isCriticalMove: false };
    if (!selectedNode) return empty;
    if (isCityView && selectedNode.refId) {
      const subject = selectedNode.refId;
      return {
        canMove: true,
        moveTargets: eligibleCityLeaders(root, subject, currentLeaderRefId ?? undefined).map((n) => ({ id: n.refId as string, label: n.label })),
        currentManagerId: currentLeaderRefId,
        detachLabel: 'Sem gestor',
        moveFn: (t: string | null) => assignCityLeader(subject, t),
        isCriticalMove: selectedNode.kind === 'leader',
      };
    }
    if (isTeamView && memberId(selectedNode.id)) {
      const subject = memberId(selectedNode.id) as string;
      const currentManagerId = managerNode && memberId(managerNode.id) ? memberId(managerNode.id) : null;
      return {
        canMove: true,
        moveTargets: eligibleTeamManagers(root, selectedNode.id).map((n) => ({ id: memberId(n.id) as string, label: n.label })),
        currentManagerId,
        detachLabel: 'Coordenador (direto)',
        moveFn: (t: string | null) => assignTeamManager(subject, t),
        isCriticalMove: selectedNode.kind === 'leader',
      };
    }
    return empty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, isCityView, isTeamView, selectedNode, managerNode, currentLeaderRefId]);

  // Remove os ancestrais de `id` do conjunto recolhido, revelando o caminho até ele.
  function expandPathTo(id: string) {
    const ancestors = pathToNode(root, id).map((n) => n.id);
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const ancestorId of ancestors) next.delete(ancestorId);
      return next;
    });
  }

  function focus(id: string) {
    setFocusedId(id);
  }

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runSearch(term: string) {
    const matches = findNodesByLabel(root, term);
    if (matches.length === 0) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    const target = matches[0];
    const path = pathToNode(root, target.id);
    expandPathTo(target.id);
    // Revela o alvo mesmo se estiver além do limite por nível (expande os caps da trilha).
    setExpandedCaps((prev) => new Set([...prev, ...path.map((n) => n.id)]));
    setFocusedId(target.id);
    fitToId.current = target.id;
  }

  // Líderes válidos como destino durante um arraste (mesma regra do menu).
  const validTargetRefIds = useMemo(() => {
    if (!dragging || !isCityView) return new Set<string>();
    return new Set(eligibleCityLeaders(root, dragging.refId, dragging.currentLeaderRefId ?? undefined).map((n) => n.refId as string));
  }, [dragging, isCityView, root]);

  function onDragStartNode(nodeId: string) {
    const p = pathToNode(root, nodeId);
    const self = p[p.length - 1];
    const parent = p[p.length - 2];
    if (!self?.refId) return;
    setDndError(null);
    setDragging({ refId: self.refId, currentLeaderRefId: parent?.kind === 'leader' ? parent.refId ?? null : null });
  }

  function onDragEndNode() {
    setDragging(null);
  }

  async function onDropOnNode(leaderNodeId: string) {
    const current = dragging;
    setDragging(null);
    if (!current) return;
    const leader = pathToNode(root, leaderNodeId).slice(-1)[0];
    if (!leader?.refId) return;
    try {
      await assignCityLeader(current.refId, leader.refId);
      setDndToast({ refId: current.refId, prevLeaderId: current.currentLeaderRefId });
      onDataChanged();
    } catch (err) {
      setDndError(
        err instanceof ApiError && (err.status === 409 || err.status === 400)
          ? 'Destino no teto (10) ou inválido.'
          : err instanceof ApiError && err.status === 403
            ? 'Sem permissão ou fora do escopo.'
            : 'Erro ao mover.',
      );
    }
  }

  async function undoDnd() {
    const u = dndToast;
    setDndToast(null);
    if (!u) return;
    try {
      await assignCityLeader(u.refId, u.prevLeaderId);
      onDataChanged();
    } catch {
      setDndError('Não foi possível desfazer.');
    }
  }

  // Escala (Fase 5): limita filhos por nível antes de posicionar; nós "carregar
  // mais" revelam o restante sob demanda. Busca/move continuam sobre o `root` cheio.
  const cappedRoot = useMemo(() => capChildrenPerLevel(chunkLargeGroups(root), MAX_CHILDREN_PER_LEVEL, expandedCaps), [root, expandedCaps]);

  // Layout-base (posições) só muda com a árvore/colapso/cap — não com foco/arraste,
  // para o DnD e o foco não recentralizarem a tela.
  const baseLayout = useMemo(() => buildFlowLayout(cappedRoot, collapsed), [cappedRoot, collapsed]);

  const { nodes, edges } = useMemo(() => {
    const dimmed = (id: string) => focusedId !== null && !active.has(id);
    const nodesWithData: Node<OrgNodeData>[] = baseLayout.nodes.map((n) => {
      const nd = n.data.node;
      const isMore = isLoadMoreId(n.id);
      const isPerson = nd.kind === 'person';
      const isLeader = nd.kind === 'leader';
      return {
        ...n,
        data: {
          ...n.data,
          onToggle: toggle,
          onFocus: isMore ? () => expandCap(n.id) : focus,
          loadMore: isMore,
          dimmed: dimmed(n.id),
          focused: n.id === focusedId,
          focusedMemberId: focusedId,
          canDrag: n.data.isCluster ? canReorder && isCityView : canReorder && isCityView && isPerson && !!nd.refId,
          isDragging: !!dragging && isPerson && dragging.refId === nd.refId,
          dropState: dragging && isCityView && isLeader && nd.refId ? (validTargetRefIds.has(nd.refId) ? 'valid' : 'invalid') : null,
          onDragStartNode,
          onDragEndNode,
          onDropOnNode,
        },
        style: { ...n.style, opacity: dimmed(n.id) ? 0.26 : 1 },
      };
    });
    // Rota iluminada (assinatura): as arestas do caminho ativo (raiz→nó focado)
    // acendem em laranja; o resto do terreno fica neutro e faint.
    const routeEdgeIds = new Set<string>();
    for (let i = 0; i < trail.length - 1; i += 1) routeEdgeIds.add(`${trail[i].id}->${trail[i + 1].id}`);
    const edgesStyled = baseLayout.edges.map((e) => {
      const onRoute = routeEdgeIds.has(e.id);
      const isDim = focusedId !== null && (dimmed(e.source) || dimmed(e.target)) && !onRoute;
      return {
        ...e,
        style: {
          ...e.style,
          stroke: onRoute ? '#f97316' : '#2b2b31',
          strokeWidth: onRoute ? 2 : 1.5,
          opacity: isDim ? 0.1 : onRoute ? 0.95 : 0.5,
        },
      };
    });
    return { nodes: nodesWithData, edges: edgesStyled };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLayout, focusedId, active, trail, dragging, validTargetRefIds, canReorder, isCityView]);

  // Refit só quando a estrutura muda (árvore/colapso) ou por busca — não no foco/arraste.
  // Entrada: NUNCA encolhe a árvore inteira só pra caber (minZoom trava em ~0.85, faixa
  // legível); numa árvore alta/estreita ela abre no tamanho de leitura, ancorada no
  // conteúdo útil, e o que sobra o usuário rola/expande — melhor que "longe e minúsculo".
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (fitToId.current) {
        fitView({ nodes: [{ id: fitToId.current }], padding: 0.4, duration: 400, maxZoom: 1.2 });
        fitToId.current = null;
      } else {
        fitView({ padding: 0.12, minZoom: 0.85, maxZoom: 1.1, duration: 300 });
      }
    }, 50);
    return () => window.clearTimeout(id);
  }, [baseLayout, fitView]);

  return (
    <div className="relative h-full w-full">
      {/* Toolbar: busca + breadcrumb da trilha ativa */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <form
          className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-lg border border-[#26262c] bg-[#111114]/95 px-3 py-2 shadow-xl backdrop-blur"
          onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
        >
          <Search className="h-4 w-4 flex-shrink-0 text-[#5f5f69]" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
            placeholder="Buscar pessoa, equipe, cidade…"
            className="w-full bg-transparent text-[13px] text-[#e0e0e4] placeholder:text-[#55555f] focus:outline-none"
          />
          {notFound ? <span className="flex-shrink-0 text-[11px] font-semibold text-amber-400">Nada no escopo</span> : null}
        </form>

        {trail.length > 0 ? (
          <nav className="pointer-events-auto flex max-w-full flex-wrap items-center gap-0.5 self-start rounded-lg border border-[#26262c] bg-[#111114]/95 px-2 py-1 text-xs shadow-xl backdrop-blur">
            {trail.map((n, i) => (
              <span key={n.id} className="flex items-center gap-0.5">
                {i > 0 ? <ChevronRight className="h-3 w-3 text-[#44444c]" /> : null}
                <button
                  type="button"
                  onClick={() => { expandPathTo(n.id); setFocusedId(n.id); }}
                  className={`max-w-[160px] truncate rounded px-1.5 py-0.5 font-medium transition-colors ${
                    i === trail.length - 1 ? 'text-[#f97316]' : 'text-[#8a8a93] hover:text-[#cfcfd4]'
                  }`}
                  title={n.label}
                >
                  {n.label}
                </button>
              </span>
            ))}
          </nav>
        ) : null}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.85, maxZoom: 1.1 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1c1c22" gap={26} size={1} />
        <Controls showInteractive={false} className="!border-[#26262c] !bg-[#121216] !shadow-lg [&_button]:!border-[#26262c] [&_button]:!bg-[#121216] [&_button:hover]:!bg-[#1c1c22] [&_button_svg]:!fill-[#7c7c86]" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => (n.data as OrgNodeData)?.color ?? NEUTRAL_COLOR}
          nodeStrokeWidth={0}
          maskColor="rgba(8,8,10,0.72)"
          className="!bg-[#0e0e11] !border !border-[#26262c] !rounded-lg"
        />
      </ReactFlow>

      {/* Feedback do DnD (Fase 3) */}
      {dragging ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
          <span className="rounded-full border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-300 shadow-lg">
            Solte sobre um gestor <span className="text-emerald-300">destacado</span> para mover
          </span>
        </div>
      ) : null}
      {dndToast ? (
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border border-emerald-500/30 bg-zinc-900/95 px-4 py-2 shadow-xl">
            <span className="text-xs font-semibold text-emerald-300">Pessoa movida.</span>
            <button onClick={undoDnd} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-200 hover:text-white">
              <Undo2 className="h-3.5 w-3.5" /> Desfazer
            </button>
            <button onClick={() => setDndToast(null)} className="text-xs text-zinc-500 hover:text-zinc-300" aria-label="Fechar">✕</button>
          </div>
        </div>
      ) : null}
      {dndError ? (
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center">
          <button onClick={() => setDndError(null)} className="rounded-full border border-rose-500/30 bg-zinc-900/95 px-4 py-2 text-xs font-semibold text-rose-300 shadow-xl">
            {dndError} · fechar
          </button>
        </div>
      ) : null}

      {panelRefId && selectedNode ? (
        <PersonPanel
          key={panelRefId}
          refId={panelRefId}
          personLabel={selectedNode.label}
          managerLabel={managerNode?.label}
          canEdit={canEditPerson}
          canOpenLegendaryScreen={canOpenLegendaryScreen}
          canReorder={canReorder}
          canStructureChange={canStructureChange}
          isCriticalMove={moveCtx.isCriticalMove}
          canMove={moveCtx.canMove}
          moveTargets={moveCtx.moveTargets}
          currentManagerId={moveCtx.currentManagerId}
          detachLabel={moveCtx.detachLabel}
          moveFn={moveCtx.moveFn}
          onMoved={onDataChanged}
          onClose={() => setFocusedId(null)}
        />
      ) : null}
    </div>
  );
}

export function OrgChartTree({ root, canEditPerson, canReorder, canStructureChange, canOpenLegendaryScreen, onDataChanged }: { root: OrgChartNode; canEditPerson: boolean; canReorder: boolean; canStructureChange: boolean; canOpenLegendaryScreen: boolean; onDataChanged: () => void }) {
  return (
    <ReactFlowProvider>
      <OrgChartCanvas root={root} canEditPerson={canEditPerson} canReorder={canReorder} canStructureChange={canStructureChange} canOpenLegendaryScreen={canOpenLegendaryScreen} onDataChanged={onDataChanged} />
    </ReactFlowProvider>
  );
}
