import type { OrgChartNode, OrgChartNodeKind } from '@central-da-manada/shared';

// Shared builders for org-chart trees, reused by the TOP-scoped (tops module)
// and the global (org-chart module) views so there is a single way to build a
// node, aggregate counts and normalize a city key.

export function orgNode(
  id: string,
  kind: OrgChartNodeKind,
  label: string,
  extra: { subtitle?: string; leaderId?: string; refId?: string } = {},
): OrgChartNode {
  return {
    id,
    kind,
    label,
    children: [],
    count: 0,
    ...(extra.subtitle ? { subtitle: extra.subtitle } : {}),
    ...(extra.leaderId ? { leaderId: extra.leaderId } : {}),
    ...(extra.refId ? { refId: extra.refId } : {}),
  };
}

// Sets count = number of descendant person-kind nodes (excluding the node itself);
// returns persons in the subtree including self.
export function annotateCounts(node: OrgChartNode): number {
  let descendants = 0;
  for (const child of node.children) descendants += annotateCounts(child);
  node.count = descendants;
  return descendants + (node.kind === 'person' ? 1 : 0);
}

// Projeta a árvore até `depth` níveis a partir deste nó, sem mutar a original.
// depth 0 => só este nó com filhos podados; cada nó carrega hasChildren indicando
// se tem filhos reais (para a UI oferecer expandir sob demanda no overview+detail).
export function projectToDepth(node: OrgChartNode, depth: number): OrgChartNode {
  const hasChildren = node.children.length > 0;
  const children = depth > 0 ? node.children.map((child) => projectToDepth(child, depth - 1)) : [];
  return { ...node, children, hasChildren };
}

export function normalizeCityKey(city: string): string {
  const stripped = [...city.normalize('NFD')]
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return c < 0x0300 || c > 0x036f;
    })
    .join('');
  return stripped.toLowerCase().replace(/\s+/g, ' ').trim();
}
