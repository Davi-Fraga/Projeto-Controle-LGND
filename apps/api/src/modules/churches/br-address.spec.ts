import { expandBrAbbreviations } from './br-address';

describe('expandBrAbbreviations', () => {
  it('expande St. para Setor (o vilão do bug real)', () => {
    expect(expandBrAbbreviations('Av. Central, 167 - St. Urias Magalhães, Goiânia - GO')).toBe(
      'Avenida Central, 167 - Setor Urias Magalhães, Goiânia - GO',
    );
  });

  it('expande as principais abreviações de logradouro', () => {
    expect(expandBrAbbreviations('R. das Flores')).toBe('Rua das Flores');
    expect(expandBrAbbreviations('Pça. da Sé')).toBe('Praça da Sé');
    expect(expandBrAbbreviations('Jd. Goiás')).toBe('Jardim Goiás');
    expect(expandBrAbbreviations('Rod. BR-153')).toBe('Rodovia BR-153');
  });

  it('não altera texto sem abreviações', () => {
    expect(expandBrAbbreviations('Avenida Central, 167, Setor Central, Goiânia')).toBe(
      'Avenida Central, 167, Setor Central, Goiânia',
    );
  });

  it('não expande abreviação no meio de outra palavra (fronteira de palavra)', () => {
    // "Est." (Estrada) não deve virar "Setor" por causa do "st"
    expect(expandBrAbbreviations('Est. Velha do Mar')).toBe('Est. Velha do Mar');
  });
});
