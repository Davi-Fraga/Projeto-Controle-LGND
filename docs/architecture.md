# Arquitetura - Central da Manada

## Decisão por monorepo

O projeto usa pnpm workspaces para manter frontend, backend e contratos compartilhados no mesmo repositório. Isso reduz divergência de tipos entre camadas e facilita evolução coordenada sem acoplar regras de negócio ao frontend.

## Separação de aplicações

- `apps/web`: interface Next.js. Contém telas, componentes, hooks e cliente HTTP.
- `apps/api`: API NestJS. Contém módulos, regras de negócio, validação, autenticação, autorização e acesso ao banco.
- `packages/shared`: enums, tipos e contratos compartilhados.
- `prisma`: schema, migrations e seed.

## Backend

A API segue organização modular:

- controllers recebem requisições HTTP;
- DTOs validam entrada;
- services concentram regras de aplicação;
- PrismaService isola acesso ao banco;
- guards aplicam autenticação e autorização;
- filters padronizam erros.

Módulos iniciais:

- auth
- users
- roles
- permissions
- audit
- database
- config

## Autenticação

O login retorna um access token JWT de curta duração e grava um refresh token em cookie HTTP-only. O refresh token é armazenado no banco apenas como hash, permitindo revogação por logout ou desativação do usuário.

Fluxo inicial:

1. `POST /api/auth/login` valida credenciais.
2. A API retorna `accessToken` e define cookie HTTP-only.
3. O frontend usa `Authorization: Bearer <token>` nas chamadas autenticadas.
4. `POST /api/auth/refresh` rotaciona o refresh token.
5. `POST /api/auth/logout` revoga o refresh token atual.

## RBAC

O controle de acesso nasce com roles e permissions:

- `User`
- `Role`
- `Permission`
- `UserRole`
- `RolePermission`

Os primeiros endpoints administrativos usam role `COORDINATION_ADMIN`. As permissões já existem no banco para evolução futura para policies mais finas.

## Prisma e banco

O PostgreSQL é o banco principal. O Prisma centraliza schema, migrations e Prisma Client. IDs usam UUID. Entidades importantes possuem campos de auditoria temporal e soft delete quando aplicável.

Índices iniciais:

- `User.email`
- `Legendary.lgndNumber`
- `Legendary.fullName`
- `Legendary.city`
- `Legendary.status`
- `AuditLog.entityType`
- `AuditLog.actorUserId`

## Auditoria

O módulo `audit` fornece serviço base para registrar alterações sensíveis. Nesta etapa ele está preparado, mas ainda não foi acoplado a todos os fluxos para evitar escopo fora da fundação.

Campos do log:

- usuário executor;
- entidade;
- ação;
- antes/depois;
- IP;
- user agent;
- data.

## Padrões de módulos futuros

Novos domínios devem entrar em `apps/api/src/modules/<domain>` com:

- controller;
- service;
- DTOs;
- guards/policies quando necessário;
- testes focados em regra crítica.

No frontend, cada domínio deve entrar em `apps/web/src/features/<domain>`, deixando componentes genéricos em `components/ui` ou `components/layout`.
