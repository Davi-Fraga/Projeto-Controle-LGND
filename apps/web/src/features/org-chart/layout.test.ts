import { describe, it, expect } from 'vitest';
import type { OrgChartNode } from '@central-da-manada/shared';
import { activeSet, buildFlowLayout, capChildrenPerLevel, chunkLargeGroups, collapsedByDefault, eligibleCityLeaders, eligibleTeamManagers, findNodesByLabel, isLoadMoreId, pathToNode } from './layout';

function node(id: string, children: OrgChartNode[] = [], label = id): OrgChartNode {
  return { id, kind: 'group', label, count: 0, children };
}

function leader(id: string, refId: string, childCount: number): OrgChartNode {
  return { id, kind: 'leader', label: id, count: 0, refId, children: Array.from({ length: childCount }, (_, i) => ({ id: `${id}-c${i}`, kind: 'person', label: 'x', count: 0, children: [] })) };
}

// root -> [A -> [A1 -> [A1a]], B (folha)]
function tree(): OrgChartNode {
  return node('root', [node('a', [node('a1', [node('a1a')])]), node('b')]);
}

describe('collapsedByDefault (overview)', () => {
  it('openDepth 1: recolhe os nós do 1º nível que têm filhos (A), não a folha (B)', () => {
    const collapsed = collapsedByDefault(tree(), 1);
    expect(collapsed.has('a')).toBe(true); // tem filhos → recolhido
    expect(collapsed.has('b')).toBe(false); // folha → nada a recolher
    expect(collapsed.has('root')).toBe(false); // raiz fica aberta
  });

  it('openDepth 2: raiz e 1º nível abertos; recolhe A1 (nível 2 com filhos)', () => {
    const collapsed = collapsedByDefault(tree(), 2);
    expect(collapsed.has('a')).toBe(false);
    expect(collapsed.has('a1')).toBe(true);
  });

  it('nós-folha nunca entram no conjunto (nada a expandir)', () => {
    const collapsed = collapsedByDefault(tree(), 1);
    expect(collapsed.has('a1a')).toBe(false);
    expect(collapsed.has('b')).toBe(false);
  });
});

describe('pathToNode (breadcrumb/trilha)', () => {
  it('retorna a trilha da raiz até o nó (inclusive)', () => {
    expect(pathToNode(tree(), 'a1a').map((n) => n.id)).toEqual(['root', 'a', 'a1', 'a1a']);
  });

  it('trilha da raiz é só a raiz', () => {
    expect(pathToNode(tree(), 'root').map((n) => n.id)).toEqual(['root']);
  });

  it('nó inexistente => trilha vazia', () => {
    expect(pathToNode(tree(), 'zzz')).toEqual([]);
  });
});

describe('activeSet (foco: trilha + filhos + irmãos)', () => {
  it('inclui ancestrais, o próprio nó, seus filhos e irmãos', () => {
    // foco em A: trilha root,a; filhos a1; irmão b
    const set = activeSet(tree(), 'a');
    expect(set.has('root')).toBe(true);
    expect(set.has('a')).toBe(true);
    expect(set.has('a1')).toBe(true); // filho
    expect(set.has('b')).toBe(true); // irmão
    // neto não entra (fica atenuado)
    expect(set.has('a1a')).toBe(false);
  });

  it('foco nulo/inexistente => conjunto vazio (sem atenuação)', () => {
    expect(activeSet(tree(), null).size).toBe(0);
    expect(activeSet(tree(), 'zzz').size).toBe(0);
  });
});

describe('findNodesByLabel (busca tolerante a acento/caixa)', () => {
  it('acha por substring sem acento e sem caixa', () => {
    const t = node('root', [node('j', [], 'João Silva'), node('m', [], 'MARIA')]);
    expect(findNodesByLabel(t, 'joao').map((n) => n.id)).toEqual(['j']);
    expect(findNodesByLabel(t, 'maria').map((n) => n.id)).toEqual(['m']);
  });

  it('query vazia => nenhum resultado', () => {
    expect(findNodesByLabel(tree(), '  ')).toEqual([]);
  });
});

describe('eligibleCityLeaders (destinos válidos de move na cidade)', () => {
  // city -> [L1(refId l1, 2 filhos), L2(refId l2, 0 filhos), L3(refId l3, 10 filhos=cheio), Sem gestor(group)]
  const city = (): OrgChartNode => ({
    id: 'city:x', kind: 'city', label: 'Cidade', count: 0,
    children: [leader('L1', 'l1', 2), leader('L2', 'l2', 0), leader('L3', 'l3', 10), node('sg', [], 'Sem gestor')],
  });

  it('exclui o líder atual, o próprio, e líderes lotados (>=10)', () => {
    // pessoa 'p1' hoje sob l1 → destinos: L2 (tem vaga). L3 está cheio, L1 é o atual.
    const result = eligibleCityLeaders(city(), 'p1', 'l1').map((n) => n.refId);
    expect(result).toEqual(['l2']);
  });

  it('sem líder atual: retorna todos os líderes com vaga (exceto o próprio)', () => {
    const result = eligibleCityLeaders(city(), 'p1').map((n) => n.refId);
    expect(result).toEqual(['l1', 'l2']); // L3 cheio fica de fora
  });

  it('não sugere o próprio como líder', () => {
    const result = eligibleCityLeaders(city(), 'l2').map((n) => n.refId);
    expect(result).toEqual(['l1']); // l2 é o próprio; L3 cheio
  });
});

describe('chunkLargeGroups (fragmentar pilhas em grupos de 10)', () => {
  const pile = (n: number): OrgChartNode => ({
    id: 'g', kind: 'group', label: 'Sem gestor', count: n,
    children: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, kind: 'person' as const, label: `P${i}`, count: 0, children: [] })),
  });

  it('≤10 pessoas: não fragmenta', () => {
    const out = chunkLargeGroups(pile(10));
    expect(out.children).toHaveLength(10);
    expect(out.children.every((c) => c.kind === 'person')).toBe(true);
  });

  it('67 pessoas: vira 7 grupos (10×6 + 7)', () => {
    const out = chunkLargeGroups(pile(67));
    expect(out.children).toHaveLength(7);
    expect(out.children.every((c) => c.kind === 'group')).toBe(true);
    expect(out.children[0].children).toHaveLength(10);
    expect(out.children[6].children).toHaveLength(7);
    expect(out.children[0].label).toBe('Grupo 1/7');
  });

  it('não fragmenta ramos (sub-líderes já ≤10)', () => {
    const mixed: OrgChartNode = {
      id: 'coord', kind: 'leader', label: 'Coord', count: 0,
      children: [
        { id: 'sub', kind: 'leader', label: 'Sub', count: 0, children: [{ id: 'x', kind: 'person', label: 'X', count: 0, children: [] }] },
        ...Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, kind: 'person' as const, label: `D${i}`, count: 0, children: [] })),
      ],
    };
    const out = chunkLargeGroups(mixed);
    // sub-líder preservado + 2 grupos (12 diretos → 10+2)
    expect(out.children.filter((c) => c.id === 'sub')).toHaveLength(1);
    expect(out.children.filter((c) => c.label.startsWith('Grupo'))).toHaveLength(2);
  });
});

describe('buildFlowLayout — blocos de subdivisão (cluster ≤10)', () => {
  const cityWithLeader = (): OrgChartNode => ({
    id: 'city:x', kind: 'city', label: 'Cidade', count: 0,
    children: [
      {
        id: 'leader:legendary:l1', kind: 'leader', label: 'João', refId: 'l1', count: 0,
        children: [
          { id: 'legendary:p1', kind: 'person', label: 'Pedro', refId: 'p1', count: 0, children: [] },
          { id: 'legendary:p2', kind: 'person', label: 'Lucas', refId: 'p2', count: 0, children: [] },
        ],
      },
    ],
  });

  it('líder com pessoas vira UM bloco (isCluster) — pessoas viram chips, não nós', () => {
    const { nodes } = buildFlowLayout(cityWithLeader(), new Set());
    const cluster = nodes.find((n) => n.id === 'leader:legendary:l1')!;
    expect(cluster.data.isCluster).toBe(true);
    expect(cluster.data.members?.map((m) => m.id)).toEqual(['legendary:p1', 'legendary:p2']);
    expect(nodes.some((n) => n.id === 'legendary:p1')).toBe(false);
    expect(nodes.some((n) => n.id === 'legendary:p2')).toBe(false);
  });

  it('bloco recolhido aparece como card do líder (sem chips, sem isCluster)', () => {
    const { nodes } = buildFlowLayout(cityWithLeader(), new Set(['leader:legendary:l1']));
    const leader = nodes.find((n) => n.id === 'leader:legendary:l1')!;
    expect(leader.data.isCluster).toBeFalsy();
    expect(leader.data.collapsed).toBe(true);
    expect(nodes.some((n) => n.id === 'legendary:p1')).toBe(false);
  });
});

describe('eligibleTeamManagers (destinos de move na equipe)', () => {
  const mLeader = (id: string, kids: OrgChartNode[]): OrgChartNode => ({ id, kind: 'leader', label: id, count: 0, children: kids });
  const mPerson = (id: string): OrgChartNode => ({ id, kind: 'person', label: id, count: 0, children: [] });
  // team:t -> coordenador(leader:t) -> [A(sub-coord, 2 filhos: B,E), C(sub-coord, 0), D(integrante)]
  const team = (): OrgChartNode => ({
    id: 'team:t', kind: 'group', label: 'Equipe', count: 0,
    children: [mLeader('leader:t', [
      mLeader('member:A', [mPerson('member:B'), mPerson('member:E')]),
      mLeader('member:C', []),
      mPerson('member:D'),
    ])],
  });

  it('integrante direto: destinos = sub-coordenadores com vaga', () => {
    expect(eligibleTeamManagers(team(), 'member:D').map((n) => n.id)).toEqual(['member:A', 'member:C']);
  });

  it('exclui o sub-coordenador atual', () => {
    expect(eligibleTeamManagers(team(), 'member:B').map((n) => n.id)).toEqual(['member:C']); // B está sob A
  });

  it('exclui o próprio e seus descendentes (anti-ciclo)', () => {
    expect(eligibleTeamManagers(team(), 'member:A').map((n) => n.id)).toEqual(['member:C']); // não sugere A nem B/E
  });
});

describe('capChildrenPerLevel (limite por nível + carregar mais)', () => {
  const wide = (n: number): OrgChartNode => node('root', Array.from({ length: n }, (_, i) => node(`c${i}`)));

  it('acima do limite: mostra os N primeiros + um nó "carregar mais"', () => {
    const capped = capChildrenPerLevel(wide(5), 3, new Set());
    expect(capped.children).toHaveLength(4); // 3 reais + 1 "mais"
    expect(capped.children.slice(0, 3).map((c) => c.id)).toEqual(['c0', 'c1', 'c2']);
    const more = capped.children[3];
    expect(isLoadMoreId(more.id)).toBe(true);
    expect(more.label).toContain('2'); // +2 restantes
  });

  it('no limite ou abaixo: sem nó "carregar mais"', () => {
    const capped = capChildrenPerLevel(wide(3), 3, new Set());
    expect(capped.children).toHaveLength(3);
    expect(capped.children.some((c) => isLoadMoreId(c.id))).toBe(false);
  });

  it('nó expandido mostra todos os filhos (sem "carregar mais")', () => {
    const capped = capChildrenPerLevel(wide(5), 3, new Set(['root']));
    expect(capped.children).toHaveLength(5);
    expect(capped.children.some((c) => isLoadMoreId(c.id))).toBe(false);
  });

  it('não muta a árvore original', () => {
    const original = wide(5);
    capChildrenPerLevel(original, 3, new Set());
    expect(original.children).toHaveLength(5);
  });
});
