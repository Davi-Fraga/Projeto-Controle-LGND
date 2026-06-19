import dagre from 'dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type { OrgChartNode, OrgChartNodeKind } from '@central-da-manada/shared';
import { NEUTRAL_COLOR, colorForLeader } from './color';

export type OrgNodeData = {
  node: OrgChartNode;
  color: string;
  hasChildren: boolean;
  collapsed: boolean;
};

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

// Flattens the OrgChartNode tree into React Flow nodes/edges (pruning collapsed
// subtrees), resolving the branch color by inheritance, then positions everything
// with dagre in a left-to-right tree layout.
export function buildFlowLayout(root: OrgChartNode, collapsed: Set<string>): { nodes: Node<OrgNodeData>[]; edges: Edge[] } {
  const nodes: Node<OrgNodeData>[] = [];
  const edges: Edge[] = [];

  const visit = (node: OrgChartNode, parentId: string | undefined, parentColor: string) => {
    const color = node.leaderId ? colorForLeader(node.leaderId) : parentColor;
    const isCollapsed = collapsed.has(node.id);
    const size = nodeSize(node.kind);

    nodes.push({
      id: node.id,
      type: 'orgNode',
      position: { x: 0, y: 0 },
      data: { node, color, hasChildren: node.children.length > 0, collapsed: isCollapsed },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: { width: size.w },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}->${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.7 },
      });
    }

    if (!isCollapsed) {
      for (const child of node.children) visit(child, node.id, color);
    }
  };

  visit(root, undefined, NEUTRAL_COLOR);

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 80, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    const size = nodeSize(n.data.node.kind);
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
