# Central da Manada - Rota do Cerrado

Sistema administrativo para a coordenação do movimento Legendários da Rota do Cerrado. Esta etapa entrega a fundação arquitetural: monorepo, API NestJS, web Next.js, PostgreSQL, Prisma, autenticação JWT, refresh token em cookie HTTP-only, RBAC inicial e seed administrativo.

## Stack

- Monorepo com pnpm workspaces
- Frontend: Next.js, React, TypeScript, App Router e Tailwind CSS
- Backend: NestJS, TypeScript, JWT, DTOs e guards
- Banco: PostgreSQL
- ORM e migrations: Prisma
- Auth: access token JWT + refresh token HTTP-only
- Permissões: RBAC com roles e permissions
- Deploy futuro: Docker com serviços separados

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

## Instalação

```bash
pnpm install
```

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edite principalmente:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_API_URL`

## Banco de dados

Suba o PostgreSQL:

```bash
docker compose up -d postgres
```

Gere o Prisma Client:

```bash
pnpm db:generate
```

Rode as migrations:

```bash
pnpm db:migrate
```

Rode o seed inicial:

```bash
pnpm db:seed
```

O seed cria:

- roles do sistema;
- permissões iniciais;
- usuário administrador usando `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

## Rodando o projeto

API:

```bash
pnpm dev:api
```

Frontend:

```bash
pnpm dev:web
```

Ou ambos:

```bash
pnpm dev
```

URLs padrão:

- Web: `http://localhost:3000`
- API: `http://localhost:3333/api`

## Scripts principais

- `pnpm dev`: roda web e API em paralelo
- `pnpm dev:api`: roda apenas a API
- `pnpm dev:web`: roda apenas o frontend
- `pnpm build`: build dos workspaces
- `pnpm lint`: lint dos workspaces
- `pnpm test`: testes dos workspaces
- `pnpm db:generate`: gera Prisma Client
- `pnpm db:migrate`: roda migrations em desenvolvimento
- `pnpm db:migrate:dev`: cria/aplica migrations em desenvolvimento quando houver alteracao de schema
- `pnpm db:deploy`: aplica migrations em ambiente controlado
- `pnpm db:seed`: cria dados iniciais
- `pnpm db:studio`: abre Prisma Studio

## Estrutura

```txt
apps/
  api/       Backend NestJS
  web/       Frontend Next.js
packages/
  shared/    Enums, tipos e contratos compartilhados
prisma/      Schema, migrations e seed
docker/      Arquivos futuros de deploy
docs/        Documentação técnica
```

## Login inicial

Depois do seed, acesse `/login` no frontend e use:

- e-mail: valor de `ADMIN_EMAIL`
- senha: valor de `ADMIN_PASSWORD`

## Diagnostico de conexao API/Web

### Verificar se a API esta rodando

```bash
npx pnpm@9.15.4 dev:api
```

A API deve escutar, por padrao, em:

```txt
http://localhost:3333/api
```

Teste publico:

```txt
http://localhost:3333/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "timestamp": "..."
}
```

Teste de rota protegida sem login:

```txt
http://localhost:3333/api/auth/me
```

Resposta esperada: `401 Unauthorized`. Se aparecer `ERR_CONNECTION_REFUSED`, a API nao esta rodando ou nao esta na porta correta.

### Variaveis esperadas

No `.env`:

```env
API_PORT="3333"
FRONTEND_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3333/api"
```

O frontend monta chamadas como:

```txt
http://localhost:3333/api/auth/me
```

Nao deve aparecer:

```txt
http://localhost:3333/api/api/auth/me
```

### Resolver ERR_CONNECTION_REFUSED

Verifique nesta ordem:

1. A API esta rodando?

```bash
npx pnpm@9.15.4 dev:api
```

2. A porta esta aberta?

```powershell
Test-NetConnection -ComputerName localhost -Port 3333
```

3. O banco esta rodando? A API conecta no PostgreSQL ao iniciar.

Com Docker:

```bash
docker compose up -d postgres
```

Neste projeto, para evitar conflito com PostgreSQL local na porta `5432`, o `.env` pode usar:

```env
DATABASE_URL="postgresql://central:central@localhost:5433/central_da_manada?schema=public"
POSTGRES_PORT="5433"
```

4. Rode migrations e seed:

```bash
npx pnpm@9.15.4 prisma migrate deploy
npx pnpm@9.15.4 prisma db seed
```

### Refresh 401 sem login

Quando nao existe sessao ativa, `GET /api/auth/me` deve retornar `401 Unauthorized`.
O frontend evita chamar `/api/auth/refresh` quando nao ha marcador local de sessao. Se aparecer um `401` isolado depois de limpar cookies/localStorage, isso e esperado; o problema seria um loop continuo de refresh ou quebra visual da tela.

Para limpar a sessao local manualmente no navegador:

```js
localStorage.removeItem('accessToken')
localStorage.removeItem('hasSession')
```

Depois acesse `/login` novamente.

### PostgreSQL local no Windows sem Docker

Se voce quiser usar o PostgreSQL instalado no Windows em vez do Docker, crie manualmente um usuario e banco equivalentes.

No `psql` como usuario administrador:

```sql
CREATE USER central WITH PASSWORD 'central';
CREATE DATABASE central_da_manada OWNER central;
GRANT ALL PRIVILEGES ON DATABASE central_da_manada TO central;
```

Depois ajuste o `.env` para a porta do seu PostgreSQL local, normalmente `5432`:

```env
DATABASE_URL="postgresql://central:central@localhost:5432/central_da_manada?schema=public"
POSTGRES_PORT="5432"
```

Entao rode:

```bash
npx pnpm@9.15.4 prisma migrate deploy
npx pnpm@9.15.4 prisma db seed
```

### Prisma generate no Windows

Se `npx pnpm@9.15.4 prisma generate` falhar com `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`, algum processo Node da API/Web provavelmente esta usando o Prisma Client.

Pare `dev:api` e `dev:web`, depois rode novamente:

```bash
npx pnpm@9.15.4 prisma generate
```

No PowerShell, para localizar processos Node do projeto:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*Projeto Gestão*' } | Select-Object ProcessId,CommandLine
```

### DBeaver

Se estiver usando o banco do Docker deste projeto:

```txt
Host: localhost
Port: 5433
Database: central_da_manada
Username: central
Password: central
```

Se estiver usando PostgreSQL local instalado no Windows, use a porta e credenciais configuradas nele. Neste caso, normalmente a porta e `5432`, mas o usuario `central` so funciona se voce o criou manualmente.

## Endpoints iniciais

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users/me`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/deactivate`

## Próximos módulos planejados

- Legendários
- Igrejas, profissões e expertises
- Equipes
- TOPs
- Famílias
- Comunicação interna
- Ações sociais
- Dashboard com indicadores reais
- Relatórios
- Auditoria consultável
