import type { OrgChartNode, OrgChartNodeKind } from '@central-da-manada/shared';

// Shared builders for org-chart trees, reused by the TOP-scoped (tops module)
// and the global (org-chart module) views so there is a single way to build a
// node, aggregate counts and normalize a city key.

export function orgNode(
  id: string,
  kind: OrgChartNodeKind,
  label: string,
  extra: { subtitle?: string; leaderId?: string } = {},
): OrgChartNode {
  return {
    id,
    kind,
    label,
    children: [],
    count: 0,
    ...(extra.subtitle ? { subtitle: extra.subtitle } : {}),
    ...(extra.leaderId ? { leaderId: extra.leaderId } : {}),
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

export function normalizeCityKey(city: string): string {
  const stripped = [...city.normalize('NFD')]
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return c < 0x0300 || c > 0x036f;
    })
    .join('');
  return stripped.toLowerCase().replace(/\s+/g, ' ').trim();
}
