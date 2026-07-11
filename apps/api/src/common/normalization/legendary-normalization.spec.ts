import { canonCity, cityKey, cleanLgnd, cleanPhone, normalizeName } from '@central-da-manada/shared';

/**
 * Baseline que FIXA o comportamento da normalização extraída de
 * `prisma/import-manus.ts` (D3). Se algum destes quebrar, a chave de dedup do
 * webhook e do import divergiram — regressão que duplicaria legendários.
 */
describe('legendary normalization (shared)', () => {
  describe('cleanLgnd', () => {
    it('mantém apenas dígitos', () => {
      expect(cleanLgnd('12.345')).toBe('12345');
      expect(cleanLgnd(' 1 2 3 ')).toBe('123');
      expect(cleanLgnd('LGND-0042')).toBe('0042');
    });
    it('retorna null quando não há dígito', () => {
      expect(cleanLgnd('')).toBeNull();
      expect(cleanLgnd(null)).toBeNull();
      expect(cleanLgnd('abc')).toBeNull();
    });
  });

  describe('cleanPhone', () => {
    it('formata celular de 11 dígitos', () => {
      expect(cleanPhone('64999887766')).toBe('(64) 99988-7766');
    });
    it('formata fixo de 10 dígitos', () => {
      expect(cleanPhone('6432217788')).toBe('(64) 3221-7788');
    });
    it('remove DDI 55', () => {
      expect(cleanPhone('+55 64 99988-7766')).toBe('(64) 99988-7766');
    });
    it('retorna null quando vazio', () => {
      expect(cleanPhone(null)).toBeNull();
      expect(cleanPhone('')).toBeNull();
    });
  });

  describe('canonCity', () => {
    it('canoniza grafias conhecidas com sufixo de UF', () => {
      expect(canonCity('Caldas novas GO')).toBe('Caldas Novas');
      expect(canonCity('CALDAS NOVAS')).toBe('Caldas Novas');
      expect(canonCity('goiania')).toBe('Goiânia');
      expect(canonCity('aguas lindas de goias')).toBe('Águas Lindas de Goiás');
    });
    it('faz Title-Case no fallback e reporta cidade fora do mapa', () => {
      const unmapped: string[] = [];
      expect(canonCity('cidade nova xyz', (raw) => unmapped.push(raw))).toBe('Cidade Nova Xyz');
      expect(unmapped).toEqual(['cidade nova xyz']);
    });
    it('retorna null quando vazio', () => {
      expect(canonCity(null)).toBeNull();
      expect(canonCity('   ')).toBeNull();
    });
  });

  describe('cityKey', () => {
    it('remove acento, caixa e sufixo de UF', () => {
      expect(cityKey('Goiânia GO')).toBe('goiania');
      expect(cityKey('Rio Verde')).toBe('rio verde');
    });
  });

  describe('normalizeName', () => {
    it('ignora acento, caixa e espaços extras (comparação da chave)', () => {
      expect(normalizeName('  João   da Silva ')).toBe('joao da silva');
      expect(normalizeName('JOÃO DA SILVA')).toBe(normalizeName('joao da silva'));
    });
    it('retorna string vazia para nulo', () => {
      expect(normalizeName(null)).toBe('');
    });
  });
});
