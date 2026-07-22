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
5. **Sincroniza acesso** — `SEED_MODE=access prisma db seed`: garante que permissions novas
   de features cheguem ao banco (roles/permissions, idempotente). NÃO mexe no admin nem em demo.
6. Sobe `api`, `web`, `caddy`.
7. Remove imagens órfãs.

Usa `.env.production` + `docker-compose.prod.yml`.

---

## Pré-requisitos (uma vez)

- VPS com o repositório clonado, Docker + Docker Compose.
- `.env.production` preenchido (copiar de `.env.production.example`).
- Seed **completo** rodado **uma única vez** na instalação (cria o admin + dados demo;
  NÃO faz parte do deploy):
  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml \
    run --rm -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -w /app api pnpm exec prisma db seed
  ```
  > As **permissions** (roles/permissions) são sincronizadas automaticamente em **todo deploy**
  > (`SEED_MODE=access`, dentro do `deploy.sh`). Não precisa re-rodar o seed completo quando uma
  > feature adiciona permission nova — se rodar o completo, ele **não** reseta a senha do admin
  > (o `update` do upsert não toca em `passwordHash`).

---

## Passo a passo do deploy

### 1. A feature precisa estar no `main`
A VPS faz `git pull --ff-only` do `main` — **só sai em produção o que está no `main`**.
No fluxo do repo, PRs de feature entram via PR para o `main` (direto ou passando pela
branch de integração). Confirme que o merge foi feito **antes** de fazer deploy.

> Se o `git pull` não trouxer nada novo, a feature não está no `main` ainda.

### 2. Backup do banco (o `deploy.sh` NÃO faz isto)
Produção tem dados reais. **Você não roda migration na mão** — o `deploy.sh` chama
`prisma migrate deploy` e aplica as pendentes **automaticamente**. As migrations do projeto
são **aditivas** (coluna nulável, tabela nova, ou backfill dentro da própria migration):
sem perda de dado e sem downtime. Ou seja, "mexeu no schema" **não** exige ação manual sua —
só o **backup abaixo** é manual. Antes de qualquer migration:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backup_$(date +%F_%H%M).sql"
```

### 3. Rodar o deploy
Na raiz do repositório, na VPS:
```bash
./scripts/deploy.sh
```
> O script já passa `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` **dentro** dos containers de
> migration/sync — sem isso o Corepack abre um prompt `[Y/n]` ao baixar o pnpm e **trava** o
> deploy. Dica: rode sob `tmux`/`screen` para uma queda de SSH não matar o deploy.

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

### 5. Marcar o deploy (para saber depois o que está no ar)
Não há CI nem branch de produção, então **o git não registra qual commit está em produção** —
a menos que você marque. Depois do deploy verde, na VPS:
```bash
git tag -a "deploy-$(date +%F)" -m "deploy: <features do dia>"
git push origin --tags
```
Assim "o que está no ar" vira `git describe --tags`, e o próximo deploy sabe de onde partiu
(sem precisar reconstruir isso pelo histórico de merges).

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
- [ ] Tag do deploy (`git tag -a deploy-AAAA-MM-DD -m "..." && git push origin --tags`)
