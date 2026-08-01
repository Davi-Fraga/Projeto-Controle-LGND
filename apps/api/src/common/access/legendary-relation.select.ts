import { Prisma } from '@prisma/client';

/**
 * Projeção segura do Legendário quando ele aparece EMBUTIDO em outro recurso:
 * participante de TOP/ação social, membro de equipe, coordenador, representante,
 * destinatário de comunicado, linha de relatório.
 *
 * Por que existe: `include: { legendary: true }` devolve a linha inteira, incluindo
 * `email` e `birthDate` — que o `prisma/schema.prisma` marca como "dado pessoal
 * sensível — exposição restrita por escopo (D12)" — além de contato de familiar
 * (`relative*`), telefone do líder espiritual, habilidades e observações internas.
 * O `LegendariosService` já aplicava esse recorte via `stripSensitive`, mas o filtro
 * era local ao módulo: qualquer outro módulo que embutisse o Legendário devolvia
 * tudo, inclusive para papéis escopados que o próprio `GET /legendarios/:id` recusa.
 *
 * É um ALLOWLIST de propósito, não um "apague os campos sensíveis": campo novo no
 * schema fica de fora até alguém decidir expô-lo conscientemente — fail secure.
 *
 * Vale para TODOS, inclusive Administrador: é a mesma regra do `findAll` de
 * Legendários ("NUNCA em listagens gerais, para ninguém", D12). A PII completa
 * continua no detalhe administrativo `GET /legendarios/:id`, para escopo irrestrito.
 */
export const LEGENDARY_RELATION_SELECT = {
  id: true,
  fullName: true,
  lgndNumber: true,
  phone: true,
  city: true,
  status: true,
  churchId: true,
  professionId: true,
  professionText: true,
  isFromRotaDoCerrado: true,
  socialActionInterest: true,
  needsReview: true,
  deletedAt: true,
} satisfies Prisma.LegendarySelect;

/**
 * Use no lugar de `legendary: true` / `coordinator: true` / `representative: true`
 * em qualquer `include` cujo resultado vá para a resposta HTTP:
 * `include: { legendary: LEGENDARY_RELATION }`.
 */
export const LEGENDARY_RELATION = { select: LEGENDARY_RELATION_SELECT };
