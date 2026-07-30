import { ProfessionsService } from './professions.service';

/**
 * Foco: `resolveByName` — o caminho ÚNICO de resolução de profissão por nome
 * (change profissao-livre-vinculo-catalogo). A regra crítica é que só a
 * correspondência inequívoca vira vínculo e que o resolvedor NUNCA escreve.
 */
describe('ProfessionsService.resolveByName', () => {
  let service: ProfessionsService;
  let prisma: any;
  let audit: any;

  /** Catálogo ativo devolvido pelo Prisma (o `where deletedAt: null` é do service). */
  function withCatalog(professions: Array<{ id: string; name: string }>) {
    prisma.profession.findMany.mockResolvedValue(professions);
  }

  beforeEach(() => {
    prisma = {
      profession: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      churchAlias: { create: jest.fn(), upsert: jest.fn() },
    };
    audit = { create: jest.fn() };
    service = new ProfessionsService(prisma, audit);
  });

  describe('match único', () => {
    it('casa ignorando caixa, acentos e espaços redundantes', async () => {
      withCatalog([{ id: 'prof-1', name: 'Médico' }]);

      await expect(service.resolveByName('  mEDICO  ')).resolves.toEqual({
        outcome: 'matched',
        professionId: 'prof-1',
        name: 'Médico',
      });
    });

    it('consulta somente profissões ativas', async () => {
      withCatalog([{ id: 'prof-1', name: 'Médico' }]);

      await service.resolveByName('Médico');

      expect(prisma.profession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('profissão inativa não casa (fora do conjunto ativo) → notFound', async () => {
      withCatalog([]); // a inativa não é retornada pelo filtro do service

      await expect(service.resolveByName('Médico')).resolves.toEqual({
        outcome: 'notFound',
        text: 'Médico',
      });
    });
  });

  describe('sem match', () => {
    it('texto desconhecido preserva o valor aparado', async () => {
      withCatalog([{ id: 'prof-1', name: 'Médico' }]);

      await expect(service.resolveByName('  Domador de Leões  ')).resolves.toEqual({
        outcome: 'notFound',
        text: 'Domador de Leões',
      });
    });
  });

  describe('colisão normalizada', () => {
    it('duas profissões ativas com a mesma chave normalizada → ambiguous, sem escolher id', async () => {
      withCatalog([
        { id: 'prof-1', name: 'Médico' },
        { id: 'prof-2', name: 'medico' },
      ]);

      const result = await service.resolveByName('MÉDICO');

      expect(result).toEqual({
        outcome: 'ambiguous',
        text: 'MÉDICO',
        candidateIds: ['prof-1', 'prof-2'],
      });
      // nenhum id é promovido a vínculo
      expect(result).not.toHaveProperty('professionId');
    });
  });

  describe('vazio', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['string vazia', ''],
      ['só espaços', '   '],
    ])('%s → empty sem consultar o catálogo', async (_label, value) => {
      await expect(service.resolveByName(value as string | null | undefined)).resolves.toEqual({
        outcome: 'empty',
      });
      expect(prisma.profession.findMany).not.toHaveBeenCalled();
    });
  });

  describe('sem efeitos colaterais', () => {
    it.each([
      ['match', 'Médico'],
      ['sem match', 'Domador de Leões'],
      ['vazio', ''],
    ])('%s não cria/atualiza profissão, alias nem auditoria', async (_label, value) => {
      withCatalog([{ id: 'prof-1', name: 'Médico' }]);

      await service.resolveByName(value);

      expect(prisma.profession.create).not.toHaveBeenCalled();
      expect(prisma.profession.upsert).not.toHaveBeenCalled();
      expect(prisma.profession.update).not.toHaveBeenCalled();
      expect(prisma.churchAlias.create).not.toHaveBeenCalled();
      expect(prisma.churchAlias.upsert).not.toHaveBeenCalled();
      expect(audit.create).not.toHaveBeenCalled();
    });
  });
});
