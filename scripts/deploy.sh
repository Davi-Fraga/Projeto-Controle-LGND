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
# Usa o Prisma já instalado na imagem (sem baixar/reinstalar nada).
# Roda como 'node', que é dono de node_modules (COPY --chown no Dockerfile).
# -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0: sem isso o Corepack pode abrir um prompt
# interativo [Y/n] ao baixar o pnpm e TRAVAR o deploy. Precisa ir DENTRO do
# container (não adianta exportar no shell do host).
compose run --rm -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -w /app api pnpm exec prisma migrate deploy

echo ">> Sincronizando acesso (roles + permissions)..."
# SEED_MODE=access: roda só a parte idempotente do seed (roles/permissions/concessões
# por papel). Garante que permissions novas de features cheguem ao banco. NÃO mexe no
# admin (não reseta senha) nem injeta dados demo.
compose run --rm -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -e SEED_MODE=access -w /app api pnpm exec prisma db seed

echo ">> Subindo aplicação (api, web, caddy)..."
compose up -d

echo ">> Limpando imagens órfãs..."
docker image prune -f

echo ">> Deploy concluído."
compose ps
