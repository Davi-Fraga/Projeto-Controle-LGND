'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { buildFlowLayout, type OrgNodeData } from './layout';
import { NEUTRAL_COLOR } from './color';
import { OrgChartNodeCard } from './org-chart-node';

const nodeTypes = { orgNode: OrgChartNodeCard };

function OrgChartCanvas({ root }: { root: OrgChartNode }) {
  // Start fully expanded so the tree structure (incl. the leader level) is visible;
  // the user collapses branches by clicking the leader/group nodes.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const { fitView } = useReactFlow();

  // Reset collapse state whenever the tree (view) changes.
  useEffect(() => {
    setCollapsed(new Set());
  }, [root]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { nodes, edges } = useMemo(() => {
    const layout = buildFlowLayout(root, collapsed);
    const nodesWithToggle: Node<OrgNodeData>[] = layout.nodes.map((n) => ({
      ...n,
      data: { ...n.data, onToggle: toggle },
    }));
    return { nodes: nodesWithToggle, edges: layout.edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, collapsed]);

  // Refit the viewport after the layout changes.
  useEffect(() => {
    const id = window.setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    return () => window.clearTimeout(id);
  }, [nodes, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#27272a" gap={24} />
      <Controls showInteractive={false} className="!border-zinc-800 !bg-zinc-900 [&_button]:!border-zinc-800 [&_button]:!bg-zinc-900 [&_button:hover]:!bg-zinc-800 [&_button_svg]:!fill-zinc-400" />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => (n.data as OrgNodeData)?.color ?? NEUTRAL_COLOR}
        maskColor="rgba(0,0,0,0.6)"
        className="!bg-zinc-900 !border !border-zinc-800"
      />
    </ReactFlow>
  );
}

export function OrgChartTree({ root }: { root: OrgChartNode }) {
  return (
    <ReactFlowProvider>
      <OrgChartCanvas root={root} />
    </ReactFlowProvider>
  );
}
