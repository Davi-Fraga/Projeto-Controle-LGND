#!/usr/bin/env bash
# Deploy / atualização da Central da Manada na VPS.
# Roda na VPS, dentro do diretório do repositório clonado.
#
#   ./scripts/deploy.sh
#
# Fluxo: git pull -> build das imagens -> migrations (idempotentes) -> sobe tudo.
# NÃO roda o seed do admin (esse é manual, uma única vez — ver README do deploy).

set -euo pipefail

# Raiz do projeto (um nível acima de scripts/)
cd "$(dirname "$0")/.."

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERRO: $ENV_FILE não encontrado. Copie de .env.production.example e preencha." >&2
  exit 1
fi

# Compose sempre com o env-file de produção (interpolação ${...} + build args)
compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo ">> Atualizando código (git pull)..."
git pull --ff-only

echo ">> Buildando imagens..."
compose build

echo ">> Subindo banco e cache..."
compose up -d postgres redis

echo ">> Aplicando migrations (prisma migrate deploy)..."
compose run --rm -w /app api pnpm prisma migrate deploy

echo ">> Subindo aplicação (api, web, caddy)..."
compose up -d

echo ">> Limpando imagens órfãs..."
docker image prune -f

echo ">> Deploy concluído."
compose ps
