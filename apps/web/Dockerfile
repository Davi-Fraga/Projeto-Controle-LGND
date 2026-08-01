# syntax=docker/dockerfile:1
# Build context = RAIZ do monorepo (definido no docker-compose.prod.yml).
# Next.js em modo 'standalone' (ver next.config.ts): a imagem final carrega só
# o servidor mínimo + as deps realmente usadas.
#
# IMPORTANTE: NEXT_PUBLIC_API_URL é embutido no bundle em BUILD-TIME. Por isso
# entra como ARG e precisa ter o valor de produção já no momento do build.

FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY . .

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @central-da-manada/shared build \
  && pnpm --filter @central-da-manada/web build

# ----------------------------------------------------------------------------

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Precisa existir DE NOVO aqui, não só no estágio de build: o middleware da CSP
# (apps/web/src/middleware.ts) lê esta variável em RUNTIME para montar o `connect-src`.
# Sem ela o middleware cai no fallback localhost e a CSP bloqueia TODA chamada do
# browser à API em produção — falha que não aparece em dev nem no build.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Saída standalone: server.js + node_modules tracados, estáticos e public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
