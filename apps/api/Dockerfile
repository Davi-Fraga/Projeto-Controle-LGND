# syntax=docker/dockerfile:1
# Build context = RAIZ do monorepo (definido no docker-compose.prod.yml).
# Multi-stage: 'build' instala tudo e compila; 'runtime' roda o resultado.
# Mantemos a CLI do Prisma na imagem final de propósito: o deploy.sh roda
# `prisma migrate deploy` dentro deste mesmo container.

FROM node:20-alpine AS build
# OpenSSL é exigido pelo Prisma (detecção da libssl + engine correto no generate)
RUN apk add --no-cache openssl libssl3
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Código do monorepo (node_modules/.next/dist ficam fora via .dockerignore)
COPY . .

# Instala deps do workspace, compila o pacote shared, gera o Prisma Client e builda a API
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @central-da-manada/shared build \
  && pnpm prisma generate \
  && pnpm --filter @central-da-manada/api build

# ----------------------------------------------------------------------------

FROM node:20-alpine AS runtime
# Mesma libssl no runtime: o query-engine e o schema-engine do Prisma a carregam
RUN apk add --no-cache openssl libssl3
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
ENV NODE_ENV=production

# Copia o app já instalado/compilado (preserva symlinks do pnpm).
# --chown=node:node: o usuário 'node' precisa ser dono de node_modules para
# que `prisma migrate deploy` (rodado pelo deploy.sh) não tente escrever em
# pasta root-owned de engines.
COPY --from=build --chown=node:node /app /app

# Roda como usuário sem privilégios
USER node

EXPOSE 3333
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
