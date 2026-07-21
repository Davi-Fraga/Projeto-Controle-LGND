# Guia de Deploy — Central da Manada

Deploy **manual** na VPS (sem CI/CD). O script `scripts/deploy.sh` faz o trabalho pesado;
este guia cobre o passo a passo seguro em volta dele, incluindo os pontos que o script
**não** cobre (backup, prompt do Corepack, verificação).

## Como funciona (resumo)

`scripts/deploy.sh` executa, em ordem:

1. `git pull --ff-only` — **traz o que estiver no `main`** (a VPS acompanha o `main`).
2. `docker compose build` — reconstrói as imagens (roda `prisma generate`).
3. Sobe `postgres` + `redis`.
4. `prisma migrate deploy` — aplica migrations pendentes (idempotente).
5. Sobe `api`, `web`, `caddy`.
6. Remove imagens órfãs.

Usa `.env.production` + `docker-compose.prod.yml`.

---

## Pré-requisitos (uma vez)

- VPS com o repositório clonado, Docker + Docker Compose.
- `.env.production` preenchido (copiar de `.env.production.example`).
- Seed administrativo rodado **uma única vez** (não faz parte do deploy):
  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml \
    run --rm -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -w /app api pnpm exec prisma db seed
  ```

---

## Passo a passo do deploy

### 1. A feature precisa estar no `main`
A VPS faz `git pull --ff-only` do `main` — **só sai em produção o que está no `main`**.
No fluxo do repo, PRs de feature entram via PR para o `main` (direto ou passando pela
branch de integração). Confirme que o merge foi feito **antes** de fazer deploy.

> Se o `git pull` não trouxer nada novo, a feature não está no `main` ainda.

### 2. Backup do banco (o `deploy.sh` NÃO faz isto)
Produção tem dados reais. Antes de qualquer migration:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backup_$(date +%F_%H%M).sql"
```

### 3. Rodar o deploy
Na raiz do repositório, na VPS:
```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 ./scripts/deploy.sh
```
> **Por que a variável:** no passo de migration o `pnpm` pode ser baixado pelo Corepack e
> abrir um prompt interativo (`Do you want to continue? [Y/n]`) que **trava** o deploy.
> `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` faz o download acontecer sem perguntar.

### 4. Verificar (não pule)
```bash
# migrations aplicadas?
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -w /app api pnpm exec prisma migrate status
# esperado: "Database schema is up to date!"

# containers de pé?
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```
E o **smoke test** da feature no navegador (ex.: a tela alterada). Faça **Ctrl+Shift+R**
(hard refresh) para descartar o JS antigo em cache.

---

## Rollback

- **Código:** reverter o merge no `main` e rodar `./scripts/deploy.sh` de novo.
- **Banco:** migrations aditivas (coluna nulável / tabela nova) são seguras e não precisam
  ser revertidas. Para restaurar dados, use o dump do passo 2:
  ```bash
  cat backup_XXXX.sql | docker compose --env-file .env.production -f docker-compose.prod.yml \
    exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
  ```
- Sem downtime esperado em mudanças aditivas.

---

## Migrations — regras

- **Nunca** alterar uma migration já aplicada — sempre criar uma nova.
- `prisma migrate deploy` (não `migrate dev`) é o comando de produção; o `deploy.sh` já o roda.
- Migrations criadas à mão devem ser conferidas com `prisma migrate status` (o passo 4).

---

## Dependências externas

- **Geocoding (igrejas):** a API chama `nominatim.openstreetmap.org` (endereço → coordenadas).
  A VPS precisa de saída para esse host. Uso interativo/leve apenas (respeita 1 req/s +
  `User-Agent`); nada de geocoding em massa contra o serviço público.

---

## Checklist rápido

- [ ] Feature mergeada no `main`
- [ ] Backup do banco (`pg_dump`)
- [ ] `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 ./scripts/deploy.sh`
- [ ] `prisma migrate status` = "up to date"
- [ ] `docker compose ... ps` (containers Running/Healthy)
- [ ] Smoke test no navegador (hard refresh)
