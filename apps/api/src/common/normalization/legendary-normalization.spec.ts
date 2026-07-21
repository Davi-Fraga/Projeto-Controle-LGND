import {
  canonCity,
  cityKey,
  cleanLgnd,
  cleanPhone,
  formatCpf,
  formatPhone,
  maskCpfInput,
  maskPhoneInput,
  normalizeName,
} from '@central-da-manada/shared';

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

  describe('contact formatting', () => {
    it.each([
      ['64992485187', '(64) 99248-5187'],
      ['5564992485187', '(64) 99248-5187'],
      ['(42) 99947-1325', '(42) 99947-1325'],
      ['+55 64 99988-7766', '(64) 99988-7766'],
      ['6432217788', '(64) 3221-7788'],
    ])('formata telefone legado %s', (value, expected) => {
      expect(formatPhone(value)).toBe(expected);
    });

    it('preserva valores não reconhecidos e ausência de valor', () => {
      expect(formatPhone('ramal 123')).toBe('ramal 123');
      expect(formatPhone('6499')).toBe('6499');
      expect(formatPhone(null)).toBeNull();
      expect(formatPhone(undefined)).toBeUndefined();
    });

    it('formata CPF completo e preserva valor incompleto na exibição', () => {
      expect(formatCpf('12345678901')).toBe('123.456.789-01');
      expect(formatCpf('123.456.789-01')).toBe('123.456.789-01');
      expect(formatCpf('123')).toBe('123');
      expect(formatCpf(null)).toBeNull();
    });

    it('aplica máscaras incrementais reutilizáveis e limita o tamanho', () => {
      expect(maskPhoneInput('6')).toBe('(6');
      expect(maskPhoneInput('64992485187')).toBe('(64) 99248-5187');
      expect(maskPhoneInput('6432217788')).toBe('(64) 3221-7788');
      expect(maskPhoneInput('5564992485187')).toBe('(64) 99248-5187');
      expect(maskPhoneInput('64992485187999')).toBe('(64) 99248-5187');
      expect(maskPhoneInput('')).toBe('');

      expect(maskCpfInput('1')).toBe('1');
      expect(maskCpfInput('12345678901')).toBe('123.456.789-01');
      expect(maskCpfInput('123.456.789-0199')).toBe('123.456.789-01');
      expect(maskCpfInput('')).toBe('');
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
