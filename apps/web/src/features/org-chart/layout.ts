import dagre from 'dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type { OrgChartNode, OrgChartNodeKind } from '@central-da-manada/shared';
import { NEUTRAL_COLOR, colorForLeader } from './color';

export type OrgNodeData = {
  node: OrgChartNode;
  color: string;
  hasChildren: boolean;
  collapsed: boolean;
  // Interação/estado visual injetados na camada de canvas (overview+detail).
  onToggle?: (id: string) => void;
  onFocus?: (id: string) => void;
  dimmed?: boolean;
  focused?: boolean;
  loadMore?: boolean; // nó sintético "carregar mais" (Fase 5)
  // Drag-and-drop de subdivisão (Fase 3), injetados na camada de canvas:
  canDrag?: boolean; // pessoa arrastável (visão de cidade + permissão)
  isDragging?: boolean; // este nó está sendo arrastado
  dropState?: 'valid' | 'invalid' | null; // líder como alvo, durante um arraste
  onDragStartNode?: (id: string) => void;
  onDragEndNode?: () => void;
  onDropOnNode?: (id: string) => void;
  // Bloco de subdivisão (≤10): quando expandido, o líder+membros vira UM bloco com
  // grade de chips, em vez de nós soltos. `members` = os chips; a interação de chip
  // reusa onFocus/onDragStartNode (com o id do membro) e focusedMemberId destaca um.
  isCluster?: boolean;
  members?: OrgChartNode[];
  focusedMemberId?: string | null;
  size?: { w: number; h: number };
};

// Um nó é HOST de bloco quando todos os seus filhos são pessoas (folha) — uma
// subdivisão fechada de ≤10 (líder→legendários, sub-coordenador→integrantes, igreja→
// pessoas, "Sem gestor"). Recolhido = card do líder; expandido = bloco com chips.
function isClusterHost(node: OrgChartNode): boolean {
  return node.children.length > 0 && node.children.every((c) => c.kind === 'person') && node.kind !== 'root';
}

// Tamanho do bloco expandido: grade de 2 colunas, até 10 chips visíveis.
function clusterSize(memberCount: number): { w: number; h: number } {
  const shown = Math.min(memberCount, GROUP_CAP);
  const rows = Math.max(1, Math.ceil(shown / 2));
  const extra = memberCount > GROUP_CAP ? 22 : 0;
  return { w: 288, h: 44 + rows * 30 + extra + 12 };
}

// Node footprint per kind (also used as the rendered card width for visual/layout match).
const NODE_SIZES: Record<OrgChartNodeKind, { w: number; h: number }> = {
  root: { w: 210, h: 52 },
  leader: { w: 240, h: 72 },
  group: { w: 220, h: 60 },
  city: { w: 220, h: 60 },
  person: { w: 220, h: 56 },
};

export function nodeSize(kind: OrgChartNodeKind) {
  return NODE_SIZES[kind] ?? NODE_SIZES.person;
}

// Teto de gestão por subdivisão (org-hierarchy-limits).
export const GROUP_CAP = 10;

// Escala (Fase 5): máximo de filhos renderizados por nível antes de "carregar mais".
export const MAX_CHILDREN_PER_LEVEL = 20;

const LOAD_MORE_SUFFIX = '::more';
export function isLoadMoreId(id: string): boolean {
  return id.endsWith(LOAD_MORE_SUFFIX);
}
export function loadMoreParentId(id: string): string {
  return id.slice(0, -LOAD_MORE_SUFFIX.length);
}

// Limita a `limit` filhos por nível (imutável); nós com mais filhos ganham um nó
// sintético "carregar mais" (a menos que estejam em `expanded`). count do pai é
// preservado (já anotado na árvore cheia), então "N pessoas" continua correto.
export function capChildrenPerLevel(root: OrgChartNode, limit: number, expanded: Set<string>): OrgChartNode {
  const cap = (node: OrgChartNode): OrgChartNode => {
    const children = node.children.map(cap);
    if (expanded.has(node.id) || children.length <= limit) {
      return { ...node, children };
    }
    const hidden = children.length - limit;
    const more: OrgChartNode = {
      id: `${node.id}${LOAD_MORE_SUFFIX}`,
      kind: 'group',
      label: `+${hidden} a mais`,
      count: 0,
      children: [],
      hasChildren: false,
    };
    return { ...node, children: [...children.slice(0, limit), more] };
  };
  return cap(root);
}

// Fragmenta automaticamente pilhas grandes de pessoas em grupos de `size` (10).
// Um nó com >10 pessoas-folha (ex.: "Sem gestor" / diretos de um coordenador sem
// sub-coordenadores) tem essas pessoas trocadas por ceil(N/10) grupos de ≤10, cada
// um virando um BLOCO fechado. Ramos (sub-líderes, que já respeitam o teto) não mudam.
export function chunkLargeGroups(root: OrgChartNode, size = GROUP_CAP): OrgChartNode {
  const transform = (node: OrgChartNode): OrgChartNode => {
    const persons = node.children.filter((c) => c.kind === 'person');
    const others = node.children.filter((c) => c.kind !== 'person').map(transform);
    if (persons.length <= size) {
      return { ...node, children: [...others, ...persons] };
    }
    const total = Math.ceil(persons.length / size);
    const groups: OrgChartNode[] = [];
    for (let i = 0; i < persons.length; i += size) {
      const k = i / size + 1;
      groups.push({ id: `${node.id}::g${k}`, kind: 'group', label: `Grupo ${k}/${total}`, count: persons.slice(i, i + size).length, children: persons.slice(i, i + size) });
    }
    return { ...node, children: [...others, ...groups] };
  };
  return transform(root);
}

// Destinos válidos para mover uma pessoa na cidade (Fase 3): líderes diretos da
// cidade com vaga (< teto de 10), excluindo o próprio e o líder atual. A validação
// real (teto/ciclo/escopo) é sempre refeita no backend.
export function eligibleCityLeaders(cityRoot: OrgChartNode, personRefId: string, currentLeaderRefId?: string): OrgChartNode[] {
  return cityRoot.children.filter(
    (child) =>
      child.kind === 'leader' &&
      !!child.refId &&
      child.refId !== personRefId &&
      child.refId !== currentLeaderRefId &&
      child.children.length < GROUP_CAP,
  );
}

// Destinos válidos para mover uma membership na equipe (Fase 4/finalização):
// sub-coordenadores (nós 'leader' com id `member:*`) com vaga, excluindo o próprio,
// o sub-coordenador atual e os descendentes (anti-ciclo). Backend revalida.
export function eligibleTeamManagers(root: OrgChartNode, movedNodeId: string): OrgChartNode[] {
  const path = pathToNode(root, movedNodeId);
  const moved = path[path.length - 1];
  const parent = path[path.length - 2];
  const currentManagerId = parent && parent.id.startsWith('member:') ? parent.id : null;

  const descendantIds = new Set<string>();
  const collect = (node: OrgChartNode) => { for (const child of node.children) { descendantIds.add(child.id); collect(child); } };
  if (moved) collect(moved);

  const result: OrgChartNode[] = [];
  const walk = (node: OrgChartNode) => {
    if (
      node.kind === 'leader' &&
      node.id.startsWith('member:') &&
      node.id !== movedNodeId &&
      node.id !== currentManagerId &&
      !descendantIds.has(node.id) &&
      node.children.length < GROUP_CAP
    ) {
      result.push(node);
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return result;
}

// Trilha (breadcrumb) da raiz até o nó, inclusive; [] se não encontrado.
export function pathToNode(root: OrgChartNode, id: string): OrgChartNode[] {
  const walk = (node: OrgChartNode, trail: OrgChartNode[]): OrgChartNode[] | null => {
    const here = [...trail, node];
    if (node.id === id) return here;
    for (const child of node.children) {
      const found = walk(child, here);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []) ?? [];
}

// Foco (overview+detail): ids a destacar = trilha (ancestrais + nó) ∪ filhos
// diretos ∪ irmãos. Sem foco (ou nó ausente) => vazio (a UI não atenua nada).
export function activeSet(root: OrgChartNode, focusedId: string | null): Set<string> {
  if (!focusedId) return new Set();
  const path = pathToNode(root, focusedId);
  if (path.length === 0) return new Set();

  const set = new Set<string>(path.map((n) => n.id));
  const focused = path[path.length - 1];
  for (const child of focused.children) set.add(child.id);
  const parent = path[path.length - 2];
  if (parent) for (const sibling of parent.children) set.add(sibling.id);
  return set;
}

// Busca por rótulo, tolerante a acento e caixa; pré-ordem. Query vazia => [].
export function findNodesByLabel(root: OrgChartNode, query: string): OrgChartNode[] {
  const q = normalizeText(query);
  if (!q) return [];
  const matches: OrgChartNode[] = [];
  const walk = (node: OrgChartNode) => {
    if (normalizeText(node.label).includes(q)) matches.push(node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return matches;
}

function normalizeText(value: string): string {
  return [...value.normalize('NFD')]
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return c < 0x0300 || c > 0x036f;
    })
    .join('')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Overview (change organograma-navegacao-escalavel): ids dos nós a recolher por
// padrão — todo nó COM filhos em profundidade >= openDepth. Folhas nunca entram
// (nada a expandir). openDepth=1 => raiz e 1º nível abertos, resto recolhido.
export function collapsedByDefault(root: OrgChartNode, openDepth: number): Set<string> {
  const collapsed = new Set<string>();
  const visit = (node: OrgChartNode, depth: number) => {
    if (depth >= openDepth && node.children.length > 0) collapsed.add(node.id);
    for (const child of node.children) visit(child, depth + 1);
  };
  visit(root, 0);
  return collapsed;
}

// Flattens the OrgChartNode tree into React Flow nodes/edges (pruning collapsed
// subtrees), resolving the branch color by inheritance, then positions everything
// with dagre in a left-to-right tree layout.
export function buildFlowLayout(root: OrgChartNode, collapsed: Set<string>): { nodes: Node<OrgNodeData>[]; edges: Edge[] } {
  const nodes: Node<OrgNodeData>[] = [];
  const edges: Edge[] = [];

  const pushNode = (node: OrgChartNode, color: string, size: { w: number; h: number }, extra: Partial<OrgNodeData>) => {
    nodes.push({
      id: node.id,
      type: 'orgNode',
      position: { x: 0, y: 0 },
      data: { node, color, hasChildren: node.children.length > 0, collapsed: false, size, ...extra },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: { width: size.w },
    });
  };
  const pushEdge = (parentId: string | undefined, targetId: string, color: string) => {
    if (!parentId) return;
    edges.push({ id: `${parentId}->${targetId}`, source: parentId, target: targetId, type: 'smoothstep', style: { stroke: color, strokeWidth: 1.5, opacity: 0.7 } });
  };

  const visit = (node: OrgChartNode, parentId: string | undefined, parentColor: string) => {
    const color = node.leaderId ? colorForLeader(node.leaderId) : parentColor;
    const isCollapsed = collapsed.has(node.id);

    // Bloco expandido: líder + membros (≤10) num único nó com grade de chips.
    if (isClusterHost(node) && !isCollapsed) {
      pushNode(node, color, clusterSize(node.children.length), { isCluster: true, members: node.children });
      pushEdge(parentId, node.id, color);
      return; // membros são chips, não nós
    }

    // Nó normal (inclui bloco recolhido, que aparece como card do líder).
    pushNode(node, color, nodeSize(node.kind), { collapsed: isCollapsed });
    pushEdge(parentId, node.id, color);
    if (isCollapsed) return;

    // Nó misto (pessoas + ramos, ex.: coordenador): as pessoas diretas viram um
    // bloco sintético "Diretos"; os ramos (sub-coordenadores) seguem como blocos.
    const persons = node.children.filter((c) => c.kind === 'person');
    const branches = node.children.filter((c) => c.kind !== 'person');
    if (persons.length && branches.length) {
      const clusterId = `${node.id}::direct`;
      const cnode: OrgChartNode = { id: clusterId, kind: 'group', label: 'Diretos', count: persons.length, children: persons, leaderId: node.leaderId };
      pushNode(cnode, color, clusterSize(persons.length), { isCluster: true, members: persons });
      pushEdge(node.id, clusterId, color);
      for (const b of branches) visit(b, node.id, color);
    } else {
      for (const child of node.children) visit(child, node.id, color);
    }
  };

  visit(root, undefined, NEUTRAL_COLOR);

  const g = new dagre.graphlib.Graph();
  // Organograma de cima pra baixo (clássico): raiz no topo, irmãos lado a lado.
  // nodesep = gap horizontal entre irmãos; ranksep = gap vertical entre níveis.
  g.setGraph({ rankdir: 'TB', nodesep: 34, ranksep: 76, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    const size = n.data.size ?? nodeSize(n.data.node.kind);
    g.setNode(n.id, { width: size.w, height: size.h });
  }
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  for (const n of nodes) {
    const pos = g.node(n.id);
    // dagre returns the node center; React Flow expects the top-left corner.
    n.position = { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 };
  }

  return { nodes, edges };
}
