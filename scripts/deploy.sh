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

echo ">> Marcando imagens atuais para rollback..."
# O compose não define `image:` para api/web, então cada build substitui o mesmo nome e a
# imagem anterior fica dangling — que é justamente o que o `docker image prune -f` do final
# apaga. Marcar ANTES do build dá um ponto de retorno em segundos (sem rebuild), e a tag
# protege a imagem do prune. O rótulo é o commit que está sendo implantado: `pre-<commit>`
# significa "estado imediatamente ANTES de <commit>".
ROLLBACK_TAG="pre-$(git rev-parse --short HEAD)"
for svc in api web; do
  img="central-da-manada-$svc"
  if ! docker image inspect "$img:latest" >/dev/null 2>&1; then
    echo "   $img:latest não existe (primeiro deploy?) — nada a marcar"
  elif docker image inspect "$img:$ROLLBACK_TAG" >/dev/null 2>&1; then
    echo "   $img:$ROLLBACK_TAG já existe — mantido (não sobrescreve o ponto de retorno)"
  else
    docker tag "$img:latest" "$img:$ROLLBACK_TAG"
    echo "   $img:latest -> $img:$ROLLBACK_TAG"
  fi
done

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
# Só remove imagens SEM tag. As `pre-<commit>` sobrevivem de propósito — são o rollback.
# NÃO limpa build cache: isso acumula (chegou a 17 GB em 29/07/2026). Periodicamente, à mão:
#   docker builder prune -f --filter until=72h
docker image prune -f

echo ">> Deploy concluído."
echo "   Rollback rápido disponível em: central-da-manada-{api,web}:$ROLLBACK_TAG"
compose ps
