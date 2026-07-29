# Guia oficial de deploy — Central da Manada

Este é o único runbook oficial de deploy do projeto.

## Infraestrutura confirmada

- VPS via alias SSH vps-manada
- Diretório: /home/deploy/central-da-manada
- Usuário remoto observado: deploy
- Branch de produção: main
- Compose: docker-compose.prod.yml
- Serviços: postgres, redis, api, web, caddy
- Containers: cdm-postgres, cdm-redis, cdm-api, cdm-web, cdm-caddy
- Banco: PostgreSQL 16, serviço postgres
- Cache: Redis 7, serviço redis
- Proxy/TLS: Caddy
- API pública: https://api.sistema.manadarotadocerrado.com.br/api
- Web pública: https://sistema.manadarotadocerrado.com.br
- Healthcheck público: GET /api/health

## Regra de autorização

Todo comando SSH, inclusive de leitura, deve ser apresentado e receber aprovação
explícita antes da execução.

Para qualquer comando que altere estado, apresentar antes comando completo, finalidade,
ambiente, arquivos e serviços afetados, impacto no banco, riscos e rollback.

Cada autorização vale somente para os comandos exatos apresentados naquela interação.

## Estado atual bloqueante

Nenhum deploy pode ocorrer enquanto este estado remoto não for analisado e resolvido
com autorização explícita:

- docker/Caddyfile modificado;
- scripts/deploy.sh com alteração no bit executável;
- backups SQL não rastreados no diretório do projeto.

Diagnóstico permitido somente após aprovação, sem alteração:

~~~bash
git status --short
git diff -- docker/Caddyfile
git diff -- scripts/deploy.sh
git diff --summary
git ls-files --stage scripts/deploy.sh
~~~

Nunca usar como ação automática:

~~~bash
git reset --hard
git clean -fd
git checkout -- arquivo
git restore arquivo
~~~

Qualquer descarte exige mostrar o diff completo e receber autorização explícita.

### Bit executável de deploy.sh

A correção definitiva deve ocorrer localmente, não com chmod manual na VPS:

~~~bash
git update-index --chmod=+x scripts/deploy.sh
git diff --summary
~~~

Depois, commit e push exigem novas autorizações explícitas.

### Backups SQL não rastreados

Backups não devem permanecer misturados ao worktree do projeto.

Antes de mover, excluir ou alterar qualquer backup SQL:

1. listar somente nome, data, permissões e tamanho;
2. confirmar a validade do backup sem revelar seu conteúdo;
3. definir uma pasta segura fora do repositório;
4. apresentar o comando de movimentação;
5. aguardar aprovação.

Nunca ler ou exibir o conteúdo dos arquivos SQL sem autorização específica.

## Script scripts/deploy.sh

O script existente não pode ser executado diretamente sob esta política. Ele encadeia:

1. git pull --ff-only;
2. build de imagens;
3. subida de dependências;
4. prisma migrate deploy;
5. seed parcial com SEED_MODE=access;
6. subida dos serviços;
7. docker image prune -f.

Essas etapas alteram Git, imagens, containers e banco. Antes de qualquer execução ou
substituição, as etapas devem ser separadas, apresentadas e autorizadas individualmente.

## Pré-requisitos locais

Antes de propor deploy:

~~~bash
pnpm --filter api test
pnpm --filter web test
pnpm -r lint
pnpm --filter api build
git log -1
~~~

A mudança deve estar integrada à main e o commit local aprovado deve ser identificado.

## Diagnóstico pré-deploy

Cada comando requer aprovação própria:

~~~bash
ssh vps-manada "cd /home/deploy/central-da-manada && git branch --show-current && git log -1 && git status --short"

ssh vps-manada "cd /home/deploy/central-da-manada && docker compose --env-file .env.production -f docker-compose.prod.yml ps"

ssh vps-manada 'curl -fsS --max-time 10 https://api.sistema.manadarotadocerrado.com.br/api/health'
~~~

Bloquear o deploy se a branch não for main, o worktree estiver sujo, containers
essenciais não estiverem saudáveis, o healthcheck falhar ou o commit remoto não puder
ser relacionado ao commit aprovado.

## Backup antes de migrations

O Compose confirma pelos arquivos do projeto:

- serviço postgres;
- imagem oficial postgres:16-alpine;
- POSTGRES_USER e POSTGRES_DB disponíveis dentro do container.

A existência do binário pg_dump é PENDENTE DE CONFIRMAÇÃO por inspeção remota
somente leitura aprovada. Portanto, o comando abaixo é o procedimento proposto, mas não
deve ser tratado como definitivo nem executado até essa confirmação e autorização.

~~~bash
umask 077
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "/home/deploy/backups/central-da-manada/backup_$(date +%Y%m%d-%H%M%S).sql"
~~~

O backup escreve fora do repositório e exige autorização explícita.

Após criar um backup, validar sem abrir seu conteúdo:

~~~bash
test -s "/caminho/do/backup.sql"
ls -lh "/caminho/do/backup.sql"
~~~

Restauração também exige plano, backup confirmado, comando completo e autorização específica.

## Permissões de .env.production

A permissão atual é PENDENTE DE CONFIRMAÇÃO.

Diagnóstico futuro, somente após aprovação:

~~~bash
stat -c '%A %U %G %n' .env.production
~~~

Possível correção futura:

~~~bash
chmod 600 .env.production
~~~

Antes de executar, confirmar proprietário, grupo, usuário que roda o Docker Compose
e se algum processo depende de permissão de grupo.

Nunca exibir conteúdo, valores ou credenciais de .env.production.

## Migrations e seed

Em produção, Prisma usa somente:

~~~bash
pnpm exec prisma migrate deploy
~~~

Nunca usar:

~~~bash
prisma migrate dev
prisma db push
prisma migrate reset
~~~

Seed completo é proibido em produção. O seed parcial de permissões também escreve no
banco e requer autorização específica, impacto, risco e rollback apresentados antes.

## Validação pós-deploy

Cada comando requer aprovação:

~~~bash
git branch --show-current
git log -1
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS --max-time 10 https://api.sistema.manadarotadocerrado.com.br/api/health
curl -fsS --max-time 10 -o /dev/null -w '%{http_code}\n' https://sistema.manadarotadocerrado.com.br/login
~~~

A API é considerada saudável somente se a resposta confirmar:

- HTTP bem-sucedido;
- status: ok;
- database: up;
- redis: up.

Para o frontend, validar apenas o código HTTP, sem imprimir a página inteira.

Também coletar logs recentes e limitados de api, web e caddy, sempre sem revelar segredos.

## Rollback e recuperação

Rollback deve ser planejado antes do deploy específico.

- Código: criar e publicar um commit de reversão aprovado na main, seguido de novo
  deploy controlado.
- Banco: restaurar somente backup previamente verificado e somente se a migration não
  admitir forward-fix seguro.
- Imagens de release: PENDENTE DE CONFIRMAÇÃO; o processo atual não mantém tags
  imutáveis de imagem.

Se qualquer etapa falhar:

1. interromper;
2. não seguir automaticamente;
3. coletar apenas diagnóstico aprovado;
4. reportar o erro sem segredos;
5. apresentar opções de recuperação;
6. aguardar autorização.

## Identificação de releases

O processo atual não mantém tags imutáveis de release.

Formato de nome proposto para futuras tags:

~~~text
deploy-YYYYMMDD-HHMMSS
~~~

Os comandos exatos de criação e envio da tag devem ser apresentados separadamente
e exigem autorização explícita.

