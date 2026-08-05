import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrgChartNode } from '@central-da-manada/shared';
import type { OrgNodeData } from './layout';

// Props entregues ao <ReactFlow> na última renderização — é o que este arquivo audita.
let reactFlowProps: Record<string, unknown> = {};

vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: Record<string, unknown>) => {
    reactFlowProps = props;
    return <div data-testid="react-flow" />;
  },
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
  useReactFlow: () => ({ fitView: vi.fn() }),
}));

// Importados depois do mock para que o módulo mockado seja o que eles enxergam.
const { OrgChartTree } = await import('./org-chart-tree');
const { OrgChartNodeCard } = await import('./org-chart-node');

const raiz: OrgChartNode = {
  id: 'city:goiania',
  kind: 'city',
  label: 'Goiânia',
  count: 1,
  children: [
    { id: 'leader:legendary:l1', kind: 'leader', label: 'Ana Lima', count: 1, refId: 'l1', children: [
      { id: 'legendary:l2', kind: 'person', label: 'Bruno Sá', count: 0, refId: 'l2', children: [] },
    ] },
  ],
};

/**
 * POR QUE ESTE ARQUIVO NÃO SIMULA UM CLIQUE ATRAVESSANDO O CANVAS:
 *
 * O bug real que motivou estes testes era `pointer-events: none` no wrapper do nó —
 * o React Flow zera os eventos de ponteiro quando seleção, arraste e handlers de nó
 * estão todos ausentes. O JSDOM NÃO faz hit-testing por `pointer-events`: um
 * `fireEvent.click()` acerta o elemento mesmo que ele esteja inerte no navegador.
 * Um teste do tipo "clica no cartão e espera o painel" passaria VERDE com o bug
 * presente — falsa segurança exatamente no ponto que interessa.
 *
 * O que dá para afirmar aqui é (1) a configuração entregue ao <ReactFlow>, que é a
 * regressão provável, e (2) a separação dos alvos dentro do cartão, que é lógica pura.
 * A prova de que o clique chega ao cartão é smoke de navegador, registrado na change.
 */
describe('configuração interativa do canvas', () => {
  beforeEach(() => {
    reactFlowProps = {};
  });

  it('não deixa os nós inertes ao ponteiro', () => {
    render(<OrgChartTree root={raiz} canEditPerson={false} canReorder={false} canStructureChange={false} canOpenLegendaryScreen={false} onDataChanged={() => {}} />);

    // Espelha `hasPointerEvents` do NodeWrapper do @xyflow/react: se seleção, arraste e
    // todos os handlers de nó estiverem desligados, o wrapper recebe pointer-events:none
    // e NENHUM clique alcança os cartões.
    const inerte =
      reactFlowProps.elementsSelectable === false &&
      reactFlowProps.nodesDraggable === false &&
      !reactFlowProps.onNodeClick &&
      !reactFlowProps.onNodeMouseEnter &&
      !reactFlowProps.onNodeMouseMove &&
      !reactFlowProps.onNodeMouseLeave;

    expect(inerte).toBe(false);
  });

  it('mantém desligado o que não deve existir aqui: arrastar nó pelo canvas e criar aresta', () => {
    render(<OrgChartTree root={raiz} canEditPerson={false} canReorder={false} canStructureChange={false} canOpenLegendaryScreen={false} onDataChanged={() => {}} />);

    expect(reactFlowProps.nodesDraggable).toBe(false);
    expect(reactFlowProps.nodesConnectable).toBe(false);
  });

  it('tira o wrapper do nó da ordem de tabulação — quem é acionável são os controles do cartão', () => {
    render(<OrgChartTree root={raiz} canEditPerson={false} canReorder={false} canStructureChange={false} canOpenLegendaryScreen={false} onDataChanged={() => {}} />);

    expect(reactFlowProps.nodesFocusable).toBe(false);
  });
});

describe('recarregar o dado não descarta a navegação', () => {
  // Depois de mover alguém, a árvore é rebuscada e chega um `root` NOVO com a mesma raiz.
  // Se isso for tratado como troca de visão, o foco se perde, o painel fecha e o
  // "Desfazer" que acabou de aparecer nele some antes de poder ser usado.
  const focarPrimeiroNo = () => {
    const nodes = reactFlowProps.nodes as { id: string; data: OrgNodeData }[];
    const alvo = nodes.find((n) => n.data.node.kind === 'leader')!;
    alvo.data.onFocus!(alvo.id);
    return alvo.id;
  };
  const focados = () => (reactFlowProps.nodes as { id: string; data: OrgNodeData }[]).filter((n) => n.data.focused).map((n) => n.id);

  it('mantém o nó focado quando chega um root novo com a mesma raiz', async () => {
    const { rerender } = render(<OrgChartTree root={raiz} canEditPerson={false} canReorder={false} canStructureChange={false} canOpenLegendaryScreen={false} onDataChanged={() => {}} />);

    let focadoId = '';
    await act(async () => { focadoId = focarPrimeiroNo(); });
    expect(focados()).toEqual([focadoId]);

    // Mesma árvore, objeto novo — é o que o refetch produz.
    const rootRecarregado: OrgChartNode = JSON.parse(JSON.stringify(raiz));
    await act(async () => {
      rerender(<OrgChartTree root={rootRecarregado} canEditPerson={false} canReorder={false} canStructureChange={false} canOpenLegendaryScreen={false} onDataChanged={() => {}} />);
    });

    expect(focados()).toEqual([focadoId]);
  });

  it('volta ao overview quando a raiz muda de verdade (troca de visão)', async () => {
    const { rerender } = render(<OrgChartTree root={raiz} canEditPerson={false} canReorder={false} canStructureChange={false} canOpenLegendaryScreen={false} onDataChanged={() => {}} />);

    await act(async () => { focarPrimeiroNo(); });
    expect(focados()).toHaveLength(1);

    const outraArvore: OrgChartNode = { ...JSON.parse(JSON.stringify(raiz)), id: 'city:anapolis', label: 'Anápolis' };
    await act(async () => {
      rerender(<OrgChartTree root={outraArvore} canEditPerson={false} canReorder={false} canStructureChange={false} canOpenLegendaryScreen={false} onDataChanged={() => {}} />);
    });

    expect(focados()).toEqual([]);
  });
});

describe('um clique, uma ação', () => {
  const montar = (node: OrgChartNode, extra: Partial<OrgNodeData> = {}) => {
    const onFocus = vi.fn();
    const onToggle = vi.fn();
    const data = {
      node,
      color: '#f97316',
      hasChildren: node.children.length > 0,
      collapsed: true,
      onFocus,
      onToggle,
      ...extra,
    } as OrgNodeData;
    render(<OrgChartNodeCard id={node.id} data={data} {...({} as never)} />);
    return { onFocus, onToggle };
  };

  it('no nó de pessoa, o corpo abre o detalhe sem mexer na expansão', () => {
    const lider = raiz.children[0];
    const { onFocus, onToggle } = montar(lider);

    fireEvent.click(screen.getByText('Ana Lima'));

    expect(onFocus).toHaveBeenCalledWith('leader:legendary:l1');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('no nó de pessoa, a seta expande/recolhe sem abrir o detalhe', () => {
    const lider = raiz.children[0];
    const { onFocus, onToggle } = montar(lider);

    fireEvent.click(screen.getByRole('button', { name: /expandir ana lima/i }));

    expect(onToggle).toHaveBeenCalledWith('leader:legendary:l1');
    expect(onFocus).not.toHaveBeenCalled();
  });

  it('a seta anuncia o estado de expansão', () => {
    const lider = raiz.children[0];
    montar(lider, { collapsed: false });

    expect(screen.getByRole('button', { name: /recolher ana lima/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('no nó que não é pessoa, o cartão inteiro alterna a expansão', () => {
    const { onFocus, onToggle } = montar(raiz);

    fireEvent.click(screen.getByText('Goiânia'));

    expect(onToggle).toHaveBeenCalledWith('city:goiania');
    expect(onFocus).toHaveBeenCalledWith('city:goiania');
  });

  it('folha de pessoa abre o detalhe e não tem o que expandir', () => {
    const pessoa = raiz.children[0].children[0];
    const { onFocus, onToggle } = montar(pessoa);

    fireEvent.click(screen.getByText('Bruno Sá'));

    expect(onFocus).toHaveBeenCalledWith('legendary:l2');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('chip de membro dentro de um bloco seleciona aquele membro', () => {
    const lider = raiz.children[0];
    const { onFocus } = montar(lider, { isCluster: true, members: lider.children });

    fireEvent.click(screen.getByRole('button', { name: 'Bruno Sá' }));

    expect(onFocus).toHaveBeenCalledWith('legendary:l2');
  });
});
