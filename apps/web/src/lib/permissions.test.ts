import { describe, expect, it } from 'vitest';
import { can, hasPermission, hasRole } from './permissions';
import type { CurrentUser } from '@/features/auth/types';

function user(permissions: string[], roles: string[] = []): CurrentUser {
  return { permissions, roles } as CurrentUser;
}

/**
 * Autorização visual (change acoes-web-e-seletores-contextuais). A regra crítica é que a
 * forma usada espelhe o decorator da rota: AND onde a API exige AND, OR onde exige OR.
 */
describe('can', () => {
  describe('atalho de string = AND de um', () => {
    it('permite quando a permission está presente', () => {
      expect(can(user(['teams.update']), 'teams.update')).toBe(true);
    });

    it('nega quando ausente', () => {
      expect(can(user(['teams.read']), 'teams.update')).toBe(false);
    });
  });

  describe('allOf espelha @Permissions', () => {
    it('exige TODAS as permissions', () => {
      const u = user(['tops.families.create']);
      expect(can(u, { allOf: ['tops.families.create', 'tops.families.update'] })).toBe(false);
    });

    it('permite quando todas estão presentes', () => {
      const u = user(['tops.families.create', 'tops.families.update']);
      expect(can(u, { allOf: ['tops.families.create', 'tops.families.update'] })).toBe(true);
    });
  });

  describe('anyOf espelha @AnyPermissions', () => {
    // PATCH /legendarios/:id aceita legendarios.update OU organogram.person.edit.
    // Exigir só a primeira esconderia a ação de quem edita pelo Organograma.
    it('permite por qualquer uma das chaves', () => {
      const viaOrganograma = user(['organogram.person.edit']);
      expect(can(viaOrganograma, { anyOf: ['legendarios.update', 'organogram.person.edit'] })).toBe(true);
    });

    it('nega quando nenhuma está presente', () => {
      expect(can(user(['legendarios.read']), { anyOf: ['legendarios.update', 'organogram.person.edit'] })).toBe(false);
    });

    it('AND no lugar de OR esconderia ação legítima (regressão do inventário)', () => {
      const viaOrganograma = user(['organogram.person.edit']);
      expect(can(viaOrganograma, { allOf: ['legendarios.update', 'organogram.person.edit'] })).toBe(false);
      expect(can(viaOrganograma, { anyOf: ['legendarios.update', 'organogram.person.edit'] })).toBe(true);
    });
  });

  describe('fail-closed', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('sem usuário (%s) nega', (_label, value) => {
      expect(can(value as CurrentUser | null | undefined, 'teams.read')).toBe(false);
    });

    it('usuário sem lista de permissions nega', () => {
      expect(can({ roles: [] } as unknown as CurrentUser, 'teams.read')).toBe(false);
    });

    it.each([
      ['allOf', { allOf: [] as string[] }],
      ['anyOf', { anyOf: [] as string[] }],
    ])('regra vazia em %s nega (não passa por vacuidade)', (_label, rule) => {
      expect(can(user(['teams.read', 'teams.update']), rule)).toBe(false);
    });
  });
});

describe('hasPermission (legado)', () => {
  it('mantém a semântica OR histórica enquanto os consumidores migram', () => {
    expect(hasPermission(user(['teams.read']), 'teams.update', 'teams.read')).toBe(true);
    expect(hasPermission(user(['tops.read']), 'teams.update', 'teams.read')).toBe(false);
  });
});

describe('hasRole', () => {
  it('confere papel exato', () => {
    expect(hasRole(user([], ['COORDINATION_ADMIN']), 'COORDINATION_ADMIN')).toBe(true);
    expect(hasRole(user([], ['SPIRITUAL_LEADER']), 'COORDINATION_ADMIN')).toBe(false);
  });
});
