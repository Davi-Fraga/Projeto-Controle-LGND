import type { OrgChartNode } from '@central-da-manada/shared';
import { annotateCounts, orgNode, projectToDepth } from './org-chart.util';

// Monta: root -> [A -> [A1, A2], B (folha)]
function sampleTree(): OrgChartNode {
  const root = orgNode('root', 'root', 'Raiz');
  const a = orgNode('a', 'leader', 'A');
  a.children.push(orgNode('a1', 'person', 'A1'), orgNode('a2', 'person', 'A2'));
  const b = orgNode('b', 'person', 'B');
  root.children.push(a, b);
  annotateCounts(root);
  return root;
}

describe('projectToDepth (overview+detail)', () => {
  it('depth 0: só a raiz, filhos podados mas hasChildren=true', () => {
    const projected = projectToDepth(sampleTree(), 0);
    expect(projected.id).toBe('root');
    expect(projected.children).toEqual([]);
    expect(projected.hasChildren).toBe(true);
  });

  it('depth 1: raiz + filhos diretos, netos podados com hasChildren refletindo folha/pai', () => {
    const projected = projectToDepth(sampleTree(), 1);
    const byId = Object.fromEntries(projected.children.map((c) => [c.id, c]));

    expect(projected.children.map((c) => c.id)).toEqual(['a', 'b']);
    // A tinha filhos → hasChildren true, mas filhos podados nesta profundidade.
    expect(byId['a'].hasChildren).toBe(true);
    expect(byId['a'].children).toEqual([]);
    // B é folha → hasChildren false.
    expect(byId['b'].hasChildren).toBe(false);
    expect(byId['b'].children).toEqual([]);
  });

  it('preserva a contagem de descendentes (count) mesmo com filhos podados', () => {
    const projected = projectToDepth(sampleTree(), 0);
    expect(projected.count).toBe(3); // A1, A2 e B são as três pessoas descendentes
  });

  it('depth alto retorna a árvore inteira (sem poda)', () => {
    const projected = projectToDepth(sampleTree(), 10);
    const a = projected.children.find((c) => c.id === 'a')!;
    expect(a.children.map((c) => c.id)).toEqual(['a1', 'a2']);
  });

  it('não muta a árvore original', () => {
    const original = sampleTree();
    projectToDepth(original, 0);
    expect(original.children.length).toBe(2); // segue intacta
  });
});
