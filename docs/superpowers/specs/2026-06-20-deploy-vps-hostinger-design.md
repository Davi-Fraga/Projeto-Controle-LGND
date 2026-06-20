# Deploy em VPS Hostinger — Central da Manada

> **Data:** 2026-06-20
> **Status:** Design aprovado · artefatos criados · execução pendente (VPS + domínio)
> **Autor:** Davi Fraga (com Claude Code)

## Contexto

O sistema (monorepo pnpm: `apps/api` NestJS + `apps/web` Next.js 15 + Postgres + Redis)
roda hoje só em ambiente de desenvolvimento. O `docker-compose.yml` existente sobe apenas
infraestrutura local (Postgres/PgBouncer/Redis) e **não havia** Dockerfiles nem stack de
produção. Este design adiciona a camada de produção para hospedar tudo em uma única VPS
Hostinger **KVM 2** (2 vCPU, 8 GB RAM, 100 GB disco) via Docker.

### Decisões tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Arquitetura | Tudo em Docker na mesma VPS | Reaproveita o compose existente; menos peças para operar. |
| Reverse proxy | **Caddy** (não Nginx+Certbot) | HTTPS automático (Let's Encrypt) com config mínima. |
| Domínio/SSL | Domínio próprio + TLS automático | Necessário para cookies `Secure` e produção real. |
| Deploy | Manual via SSH (`scripts/deploy.sh`) | Simples para começar; CI/CD fica para 2ª etapa. |
| PgBouncer | **Removido** por enquanto | Pool de conexões só importa em alta concorrência (centenas/milhares simultâneos). Uso interno (~226 pessoas) → Postgres aguenta direto. Reintroduzir = só apontar `DATABASE_URL` para ele. |
| Seed do admin | **Manual, uma única vez** | `deploy.sh` roda a cada atualização; seed no fluxo automático poderia recriar/resetar admin. Migrations (idempotentes) ficam no automático; dados iniciais ficam manuais. |

## Arquitetura alvo

```
Internet → :80/:443 → Caddy (TLS automático)
                         ├── seudominio.com.br      → web   (Next.js :3000)
                         └── api.seudominio.com.br  → api   (NestJS :3333)
                                                        ├── postgres :5432 (rede interna)
                                                        └── redis    :6379 (rede interna)
```

- Só o **Caddy** publica portas para a internet (80/443).
- **Postgres** e **Redis** ficam apenas na rede interna do Docker (sem portas expostas).
- Dados persistem em volumes nomeados (`postgres_data`, `redis_data`, `caddy_data`).

## Artefatos criados no repositório (Fase A — concluída)

| Arquivo | Função |
|---|---|
| `apps/api/Dockerfile` | Build multi-stage da API (pnpm install → shared build → prisma generate → nest build). Mantém CLI do Prisma na imagem p/ migrations. |
| `apps/web/Dockerfile` | Build multi-stage do Next.js em modo `standalone`. `NEXT_PUBLIC_API_URL` como build arg. |
| `docker-compose.prod.yml` | Orquestra caddy + web + api + postgres + redis (rede interna, healthchecks, restart). |
| `docker/Caddyfile` | Roteamento + TLS automático (vars `DOMAIN`/`API_DOMAIN`). Inclui bloco comentado p/ teste via IP. |
| `.env.production.example` | Todas as variáveis documentadas, sem segredos. |
| `scripts/deploy.sh` | git pull → build → migrate deploy → up. **Não** roda seed. |
| `.dockerignore` | Builds rápidos / imagens limpas; exclui segredos. |
| `next.config.ts` | `output: 'standalone'` + `outputFileTracingRoot` (monorepo). |
| `.gitignore` | Passou a ignorar `.env.production`. |

### Pontos de atenção (já tratados nos artefatos)

- **`NEXT_PUBLIC_API_URL` é build-time** no Next → entra como ARG no Dockerfile e build arg no compose.
- **CORS** (`FRONTEND_URL`/`FRONTEND_URLS`) deve bater com o domínio HTTPS final.
- **Cookies de refresh** (`Secure`/`SameSite`) só funcionam sob HTTPS.
- **Interpolação do compose** lê de `--env-file .env.production` (não do `.env` padrão); o `deploy.sh` já passa essa flag.
- `.env.production` tem segredos reais → ignorado pelo git; só o `.example` é versionado.
- **`FORMS_WEBHOOK_SECRET` de produção** deve ser valor forte e NOVO (≠ do dev) — é o mesmo valor colado no Apps Script do Forms.

## Runbook de execução (Fase B — na VPS)

### 1. Provisionar a VPS
- Painel Hostinger → criar VPS KVM 2 → SO **Ubuntu 24.04 LTS** (template limpo).
- Anotar o **IP público**.

### 2. Acesso e hardening básico
```bash
ssh root@SEU_IP
adduser deploy && usermod -aG sudo deploy        # usuário não-root
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copia chave SSH
# desabilitar login root/senha em /etc/ssh/sshd_config: PermitRootLogin no / PasswordAuthentication no
systemctl restart ssh
# ⚠️ ANTES de desabilitar root/senha: abra OUTRO terminal e confirme que você
#    consegue entrar como `deploy` via chave (ssh deploy@SEU_IP). Só desabilite
#    root/PasswordAuthentication depois disso — senão você se tranca pra fora.
# firewall
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
apt update && apt install -y fail2ban
```
Reconectar como `deploy` daqui em diante.

### 3. Instalar Docker + Compose plugin
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy   # relogar para valer
docker compose version           # confirma o plugin
```

### 4. Apontar o DNS (quando tiver o domínio)
No painel do domínio, criar registros **A**:
- `@`   → `SEU_IP`
- `api` → `SEU_IP`

> A emissão do HTTPS pelo Caddy só ocorre **depois** que o DNS propagar (minutos a horas).
> Se subir antes da propagação, o HTTPS não pega de primeira — é normal. Dá para testar via
> IP em HTTP usando o bloco "MODO IP" do `Caddyfile` enquanto isso.

### 5. Clonar e configurar
```bash
git clone <URL_DO_REPO> central-da-manada && cd central-da-manada
cp .env.production.example .env.production
nano .env.production    # preencher TUDO com valores reais e fortes
```
Gerar segredos: `openssl rand -base64 48` para `JWT_*` e `FORMS_WEBHOOK_SECRET`.

### 6. Primeira subida
```bash
chmod +x scripts/deploy.sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
# aplicar migrations
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm -w /app api pnpm prisma migrate deploy
```

### 7. Seed do admin (MANUAL — só nesta primeira vez)
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm -w /app api pnpm prisma db seed
```
> Não repetir em deploys futuros. Atualizações usam apenas `scripts/deploy.sh`.

### 8. Validar
- `https://seudominio.com.br` carrega o site (cadeado válido).
- Login funciona (cookie de refresh setado sob HTTPS).
- `https://api.seudominio.com.br/api/...` responde.
- Webhook do Google Forms: atualizar a URL e o `FORMS_WEBHOOK_SECRET` no Apps Script.

### Atualizações futuras
```bash
cd central-da-manada && ./scripts/deploy.sh
```

## Critérios de aceite

- [ ] Site acessível por HTTPS no domínio, com certificado válido.
- [ ] API acessível por HTTPS no subdomínio `api`.
- [ ] Postgres e Redis **não** acessíveis pela internet (só rede interna).
- [ ] Login/refresh funcionando sob HTTPS (cookies `Secure`).
- [ ] Migrations aplicadas; seed do admin rodado uma única vez.
- [ ] `.env.production` fora do git; nenhum segredo versionado.
- [ ] Webhook do Forms validando com o `FORMS_WEBHOOK_SECRET` de produção.
- [ ] `./scripts/deploy.sh` atualiza o sistema sem tocar nas credenciais do admin.

## Melhorias futuras (fora de escopo agora)

- Imagem da API enxuta com `pnpm deploy --prod` (hoje prioriza-se confiabilidade do build pnpm+Prisma).
- CI/CD via GitHub Actions (push na main → deploy).
- Backups automáticos do Postgres (`pg_dump` agendado + retenção off-site).
- Reintroduzir PgBouncer se a concorrência crescer.
- Healthcheck HTTP dedicado para api/web no compose.
