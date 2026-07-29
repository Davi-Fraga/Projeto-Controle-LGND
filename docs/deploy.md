# Guia oficial de deploy — Central da Manada

Este é o único runbook oficial de deploy do projeto.

## Infraestrutura confirmada

- VPS via alias SSH vps-manada
- Diretório: /home/deploy/central-da-manada
- Diretório de backups: /home/deploy/backups/central-da-manada (fora do worktree, `700`)
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

## Acesso da VPS ao GitHub (repositório privado)

O `deploy.sh` começa com `git pull --ff-only`. Num repositório **privado**, isso só funciona se a
VPS tiver credencial própria — e ela **não** pode ser a sua.

Configuração em vigor desde 29/07/2026:

- remote: `git@github-cdm:Davi-Fraga/Projeto-Controle-LGND.git`
- chave dedicada na VPS: `~/.ssh/github_cdm_deploy`, referenciada por um `Host github-cdm` no
  `~/.ssh/config` do usuário `deploy`
- no GitHub: cadastrada como **Deploy Key somente leitura** do repositório

**Armadilha do remote HTTPS:** com `https://github.com/...` num repo privado, o `git pull` falha
pedindo usuário e senha — e, rodando dentro do `deploy.sh` sem terminal, ele simplesmente
**trava ou aborta** sem deixar claro que o problema é autenticação. Se o pull falhar, conferir o
remote **antes** de procurar qualquer outra causa.

Verificação (leitura, exige aprovação como todo comando remoto):

~~~bash
git remote -v
git ls-remote origin HEAD
~~~

O `ls-remote` deve devolver o commit da `main` e sair com código 0. Nunca exibir o conteúdo da
chave privada.

## Regra de autorização

Todo comando SSH, inclusive de leitura, deve ser apresentado e receber aprovação
explícita antes da execução.

Para qualquer comando que altere estado, apresentar antes comando completo, finalidade,
ambiente, arquivos e serviços afetados, impacto no banco, riscos e rollback.

Cada autorização vale somente para os comandos exatos apresentados naquela interação.

## Estado do worktree remoto

Verificar sempre antes do deploy. Em 29/07/2026, após a limpeza, restou apenas:

- `docker/Caddyfile` modificado (diff cosmético — comentários e acentos), **nunca descartado**.

Resolvidos em 29/07/2026:

- `scripts/deploy.sh` com bit executável divergente — corrigido **no repositório** com
  `git update-index --chmod=+x`, não com `chmod` na VPS;
- backups SQL não rastreados no worktree — consolidados em
  `/home/deploy/backups/central-da-manada/` com permissão `600`.

**Worktree sujo não é bloqueio automático.** O que importa é se algum arquivo modificado é
tocado pelos commits a implantar: se não for, o `git pull --ff-only` passa sem conflito.
Verificar com `git diff --name-only <commit_atual>..<commit_alvo>` e cruzar com o `git status`.

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

Corrigido no repositório em 29/07/2026 (`100644` → `100755`). A correção é sempre local, nunca
com `chmod` manual na VPS:

~~~bash
git update-index --chmod=+x scripts/deploy.sh
git diff --summary
~~~

Depois, commit e push exigem novas autorizações explícitas.

### Backups SQL não rastreados

Backups não devem permanecer misturados ao worktree do projeto. Consolidados em
`/home/deploy/backups/central-da-manada/` (permissão `600`) em 29/07/2026.

Antes de mover, excluir ou alterar qualquer backup SQL:

1. listar somente nome, data, permissões e tamanho;
2. confirmar a validade do backup sem revelar seu conteúdo;
3. definir uma pasta segura fora do repositório;
4. apresentar o comando de movimentação;
5. aguardar aprovação.

**Nunca deduzir que dois dumps são duplicados pelo tamanho.** Em 29/07/2026, dois backups com
**tamanho idêntico** (1.492.674 bytes) tinham `sha256sum` **diferente** — eram backups distintos,
tirados com 5 minutos de diferença. Comparar hash **dentro** do comando, antes de qualquer `rm`:

~~~bash
sha256sum "$A" "$B"
if [ "$(sha256sum "$A" | cut -d' ' -f1)" = "$(sha256sum "$B" | cut -d' ' -f1)" ]; then rm -v "$A"; fi
~~~

Nunca ler ou exibir o conteúdo dos arquivos SQL sem autorização específica.

## Script scripts/deploy.sh

O script tem `set -euo pipefail`: qualquer falha aborta e as etapas seguintes não rodam. Ele
encadeia:

1. git pull --ff-only;
2. **marcação das imagens atuais como `pre-<commit>`** (rollback);
3. build de imagens;
4. subida de dependências (postgres, redis);
5. prisma migrate deploy;
6. seed parcial com SEED_MODE=access;
7. subida dos serviços (api, web, caddy) — **é aqui que o site cai por alguns segundos**;
8. docker image prune -f.

O script **não faz nenhum teste de saúde**. Termina com `compose ps`, que mostra apenas `Up` — e
`api`/`web`/`caddy` não têm healthcheck no compose. A validação real é externa (ver
"Validação pós-deploy").

Executar em **sessão persistente**, para que uma queda de conexão não mate o build no meio:

~~~bash
LOG=/home/deploy/deploy-<commit>.log
: > "$LOG"
tmux new-session -d -s deploy 'cd /home/deploy/central-da-manada && ./scripts/deploy.sh >> /home/deploy/deploy-<commit>.log 2>&1; echo "EXIT_CODE=$?" >> /home/deploy/deploy-<commit>.log'

# aguardar o fim e trazer o log:
until grep -q EXIT_CODE /home/deploy/deploy-<commit>.log; do sleep 10; done
cat /home/deploy/deploy-<commit>.log
~~~

Conferir `EXIT_CODE=0` no final do log — `compose ps` verde não substitui isso.

Essas etapas alteram Git, imagens, containers e banco. Antes de qualquer execução ou
substituição, as etapas devem ser separadas, apresentadas e autorizadas individualmente.

### Corepack pode travar a execução

As etapas que rodam dentro de container (migration e seed parcial) exigem:

~~~text
COREPACK_ENABLE_DOWNLOAD_PROMPT=0
~~~

A variável precisa ser passada **dentro dos containers envolvidos** (`-e` no
`docker compose run`/`exec`). Exportá-la no shell do host **não** resolve. Sem ela, o Corepack
pode abrir um prompt interativo `[Y/n]` ao baixar o pnpm e **travar** a execução sem mensagem
de erro — o processo fica parado esperando entrada que ninguém vai digitar.

### Etapa 7 — docker image prune -f, e por que ela deixou de ser perigosa

O `docker-compose.prod.yml` **não** define chave `image:` para os serviços `web` e `api`. As
imagens são nomeadas pelo Compose (`central-da-manada-web`, `central-da-manada-api`) e o `latest`
é substituído a cada build — a imagem anterior fica **dangling**, que é exatamente o que
`docker image prune -f` remove. Historicamente, essa etapa apagava o único caminho de volta.

**Resolvido em 29/07/2026:** o `deploy.sh` agora marca as imagens em execução **antes do build**
como `central-da-manada-{api,web}:pre-<commit>`, onde `<commit>` é o commit sendo implantado.
Imagem com tag não é dangling, então o prune não a alcança.

A marcação é idempotente: se a tag já existir, ela é **mantida** — re-rodar o deploy no mesmo
commit não sobrescreve o ponto de retorno com a imagem nova.

~~~text
Rollback rápido por imagem: IMPLEMENTADO (tags pre-<commit>, automáticas desde 29/07/2026)
~~~

Ver "Rollback e recuperação" para o procedimento de uso.

### Build cache: o que o deploy NÃO limpa

`docker image prune -f` **não toca no build cache**. Ele acumula a cada deploy e ninguém o
limpa: em 29/07/2026 havia **17 GB** (64% de todo o disco ocupado), com camadas de 1,2 a 1,5 GB
por deploy.

Limpeza periódica, à mão, sob aprovação:

~~~bash
docker system df                              # ver o tamanho antes
docker builder prune -f --filter until=72h    # remove só o que tem mais de 72h
docker system df
~~~

O filtro `until=72h` preserva o cache do dia, então o próximo deploy continua rápido. **Escolher
o filtro olhando a idade real do cache** — em 29/07 o cache tinha 5-6 dias, então `until=168h`
(7 dias) não teria removido nada. Sem filtro, remove tudo: o próximo build reconstrói do zero,
sem outro prejuízo. Build cache é 100% reconstruível — não é imagem, não é volume, não é dado.

Resultado medido em 29/07/2026: 9,82 GB liberados, disco de 23% para 14%.

## Pré-requisitos locais

Antes de propor deploy:

~~~bash
pnpm --filter api test
pnpm --filter web test
pnpm lint
pnpm --filter api build
git log -1
~~~

`pnpm lint` é o **comando completo da raiz**: cobre `api`, `web`, `shared` **e** `prisma/`
(seed e scripts). `pnpm -r lint` é **parcial** — roda só os três pacotes, deixa `prisma/` sem
type-check nenhum, e **não substitui** `pnpm lint`.

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

O binário `pg_dump` foi **confirmado** dentro do container `postgres` em 29/07/2026, e o
procedimento abaixo foi executado com sucesso (dump de ~1,49 MB). Continua exigindo autorização
a cada execução.

Diagnóstico que reconfirma o binário, se houver dúvida:

~~~bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec -T postgres sh -c 'command -v pg_dump'
~~~

### Etapa 1 — criar o diretório de backups (uma vez, exige autorização)

Fica **fora** do worktree: um dump dentro do projeto aparece em `git status`, entra em glob de
comandos do repo e pode ser copiado por engano junto com o código.

~~~bash
install -d -m 700 /home/deploy/backups/central-da-manada
~~~

### Etapa 2 — backup e validação (exige autorização)

Os comandos abaixo devem ser executados **na mesma sessão do shell**. Se a sessão for encerrada,
a variável `BACKUP_FILE` será perdida e deverá ser definida novamente. Antes da execução, todo o
bloco deve ser apresentado e aprovado.

~~~bash
umask 077
BACKUP_FILE="/home/deploy/backups/central-da-manada/backup_$(date +%Y%m%d-%H%M%S).sql"

docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  < /dev/null > "$BACKUP_FILE"

test -f "$BACKUP_FILE" && echo "existe OK"
test -s "$BACKUP_FILE" && echo "tamanho > 0 OK"
stat -c '%A %U %G %s bytes %n' "$BACKUP_FILE"
~~~

`umask 077` faz o arquivo nascer legível só pelo dono. O nome carrega **data, hora e segundos**:
dois backups no mesmo dia não se sobrescrevem. A validação confirma arquivo existente, tamanho
maior que zero, proprietário, permissões e o caminho exato criado.

Validar sempre por `"$BACKUP_FILE"`, nunca por glob (`backup_*.sql`) — o glob pode casar vários
arquivos e validar o backup errado, inclusive um antigo.

### Blocos remotos: o `< /dev/null` não é decoração

Para manter `BACKUP_FILE` viva entre os comandos, o bloco inteiro precisa rodar na **mesma
sessão de shell** — na prática, um único `ssh vps-manada 'bash -s' <<'EOF' ... EOF`.

A armadilha: `bash -s` lê o script **pelo stdin**, e qualquer comando dentro do bloco que também
leia stdin (`docker compose exec -T`, `psql`) **consome o resto do script**. O efeito é
traiçoeiro — o comando principal roda, o bloco termina com **exit 0**, e as linhas seguintes
(justamente as de validação) não executam e não imprimem nada.

Foi o que ocorreu em 29/07/2026: o `pg_dump` gerou o arquivo, mas `test -f`, `test -s` e `stat`
sumiram. Saída vazia, exit 0. Sem o `< /dev/null`, seria "backup feito" sem prova nenhuma.

**Regra:** bloco remoto que devolve **menos saída do que deveria** é falha silenciosa, nunca
sucesso. Investigar antes de seguir.

**Nunca ler o conteúdo do dump** (`head`, `cat`, `less`): contém os dados pessoais de todos os
legendários.

**Se qualquer um desses comandos falhar:**

1. interromper imediatamente;
2. não seguir para migration ou deploy;
3. mostrar o erro sem expor dados;
4. preservar o caminho do arquivo para diagnóstico;
5. aguardar nova autorização.

### Limite desta validação

Tamanho maior que zero é **validação mínima e não prova restaurabilidade**. Um dump truncado por
disco cheio, ou gerado com erro parcial, também tem tamanho maior que zero.

A verificação real de restaurabilidade deve ser planejada **separadamente**, restaurando em
**ambiente descartável** e conferindo contagens — **nunca sobre produção apenas para teste**.
Hoje esse procedimento não existe.

Restauração também exige plano, backup confirmado, comando completo e autorização específica.

## Permissões de .env.production

Em diagnóstico realizado em 28/07/2026, `.env.production` foi observado com permissão
`-rw-rw-r--`. Esse estado pode mudar e deve ser reconfirmado antes de qualquer correção.

Uma eventual alteração para `600` ou `640` exige verificar previamente proprietário, grupo,
usuário que executa o Docker Compose e dependências de leitura pelo grupo.

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

### Análise individual obrigatória de cada migration pendente

Nunca presumir que uma migration futura é aditiva, reversível, sem downtime ou segura porque as
anteriores foram. Antes de aplicar, analisar **cada** migration pendente quanto a:

- o **SQL** efetivo (`prisma/migrations/<timestamp>_<nome>/migration.sql`, lido localmente);
- impacto em **locks** (tabela travada durante a operação);
- **volume de dados** afetado;
- necessidade de **backfill**;
- **compatibilidade com a versão anterior da aplicação** — durante o deploy as duas coexistem;
- estratégia de **rollback ou forward-fix**;
- **possível downtime**.

Seed completo é proibido em produção. O seed parcial de permissões também escreve no
banco e requer autorização específica, impacto, risco e rollback apresentados antes.

### Senha do admin no seed completo

Confirmado no código atual, em `prisma/seed.ts:343-352`: o `upsert` do admin usa
`update: { name, isActive }` e define `passwordHash` **somente** no `create`. Logo, na
implementação atual, re-rodar o seed completo **não** altera a senha do admin.

Isso **deve ser revalidado caso o seed mude**. E independentemente disso, o seed completo
continua **proibido no fluxo normal de deploy de produção** — em deploy usa-se somente o
parcial (`SEED_MODE=access`).

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

Quando o deploy tocar permissões ou dados, confirmar o efeito **direto no banco**, não só pelo
log do seed.

### Contagem de linhas: use COUNT(*), nunca n_live_tup

`pg_stat_user_tables.n_live_tup` é **estimativa** do coletor de estatísticas e é zerada quando o
Postgres reinicia de forma suja — depois só se reconstrói via autovacuum. Em 29/07/2026 ela
indicava `Legendary = 6` num banco com **249** legendários reais, e `Church` sequer aparecia.

Para contagem real (as tabelas do Prisma não têm `@@map`: são PascalCase e exigem aspas duplas;
o model de TOP é **`TopEvent`**, não `Top`):

~~~bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT (SELECT count(*) FROM \"Legendary\") AS legendarios, \
             (SELECT count(*) FROM \"Church\") AS igrejas, \
             (SELECT count(*) FROM \"TopEvent\") AS tops"' \
  < /dev/null
~~~

Literais de texto em SQL que atravessa três shells (local → bash remoto → sh do container):
usar **dollar quoting** com o `$` escapado (`\$\$texto\$\$`), porque aspas simples aninhadas
quebram e `$$` sem escape vira o PID do shell.

## Dependências externas

- **Geocoding de igrejas — Nominatim.** A API chama `nominatim.openstreetmap.org` para converter
  endereço em coordenadas. A VPS precisa de **saída** para esse host. Uso **interativo e leve**
  apenas, respeitando o limite aplicável do serviço (1 requisição por segundo) e enviando
  `User-Agent` identificável. **Geocoding em massa contra o serviço público é proibido.**

  Registro de dependência e restrição de uso — **não** é autorização para executar geocoding,
  script de backfill ou qualquer chamada em lote.

## Rollback e recuperação

Rollback deve ser planejado antes do deploy específico.

- **Imagem (segundos, sem rebuild):** o `deploy.sh` deixa `central-da-manada-{api,web}:pre-<commit>`
  apontando para o que estava no ar antes. Para voltar, declarar essas tags em
  `docker-compose.prod.yml` nos serviços `api` e `web` e subir só eles:

  ~~~bash
  # em docker-compose.prod.yml, nos serviços api e web:
  #   image: central-da-manada-api:pre-<commit>
  #   image: central-da-manada-web:pre-<commit>
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d api web
  ~~~

  **Limite:** volta o código, **não** volta o banco. Se o deploy aplicou migration ou alterou
  dados, avaliar compatibilidade antes — a imagem antiga vai encontrar o schema novo.

- **Código:** criar e publicar um commit de reversão aprovado na main, seguido de novo
  deploy controlado. `git revert -m 1 <merge>` para reverter um merge.
- **Banco:** restaurar somente backup previamente verificado e somente se a migration não
  admitir forward-fix seguro. Fazer dump do estado **atual** antes de restaurar, senão perde-se
  tudo que foi escrito depois do backup.

As tags `pre-<commit>` acumulam a cada deploy. Descartar as antigas periodicamente, mantendo ao
menos a do deploy vigente:

~~~bash
docker images 'central-da-manada-*' --format '{{.Repository}}:{{.Tag}}'
docker rmi central-da-manada-api:pre-<commit_antigo> central-da-manada-web:pre-<commit_antigo>
~~~

Se qualquer etapa falhar:

1. interromper;
2. não seguir automaticamente;
3. coletar apenas diagnóstico aprovado;
4. reportar o erro sem segredos;
5. apresentar opções de recuperação;
6. aguardar autorização.

## Erros comuns

| Sintoma | Causa confirmada | O que fazer |
|---|---|---|
| `git pull --ff-only` aborta por arquivo local modificado | Worktree remoto sujo | Ver "Estado do worktree remoto" — checar se os commits a implantar tocam o arquivo; nunca descartar sem autorização |
| `git pull` pede usuário/senha ou trava sem saída | Remote HTTPS em repositório privado, sem terminal para responder | Conferir `git remote -v` — deve ser `git@github-cdm:...` (ver "Acesso da VPS ao GitHub") |
| `./scripts/deploy.sh: Permission denied` | O repositório guarda o script como `100644`; na VPS estava `100755` | Corrigir no repositório com `git update-index --chmod=+x`, não com `chmod` manual na VPS |
| Execução trava sem mensagem de erro | Corepack abriu prompt `[Y/n]` ao baixar o pnpm | Garantir `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` **dentro** do container |
| Bloco remoto devolve **menos saída do que deveria**, com exit 0 | `docker compose exec -T`/`psql` consumiu o resto do script pelo stdin do `bash -s` | Fechar o stdin do comando invasor com `< /dev/null`; tratar saída faltante como falha |
| `pg_dump` falha com role ou banco vazio | Variável expandida no shell do host, onde não existe | Usar a forma com `sh -c` e aspas simples (seção de backup) |
| Contagem de tabela absurdamente baixa | `n_live_tup` zerado por reinício do Postgres | Usar `COUNT(*)`; ver "Contagem de linhas" |
| Imagem anterior desapareceu após o deploy | `docker image prune -f` removeu a imagem dangling do build anterior | Desde 29/07/2026 o `deploy.sh` cria `pre-<commit>` antes do build; se a tag não existir, reverter por código |
| Disco enchendo sem motivo aparente | Build cache do Docker, que o deploy nunca limpa | `docker builder prune -f --filter until=72h` (ver "Build cache") |
| Feature não aparece no navegador após deploy verde | JavaScript antigo em cache | Hard refresh (Ctrl+Shift+R) |
| `/auth/me` responde 401 | Sessão expirada | Não é falha de deploy — relogar |
| `Redis ECONNREFUSED` após reinício | `cdm-redis` ainda subindo | Aguardar o healthcheck do serviço |
| Lint local verde mas contrato do `shared` quebrado | `api`/`web` resolvem o `shared` pelo `dist` | Usar `pnpm lint` da raiz; `pnpm -r lint` é parcial |

## Identificação de releases

**Imagens Docker:** identificadas por `pre-<commit>`, criadas automaticamente pelo `deploy.sh`
antes de cada build. Não são tags de release — são pontos de retorno, e apontam para o estado
**anterior** ao commit que dá nome à tag.

**Tags git de release:** o processo ainda não as mantém. Formato proposto:

~~~text
deploy-YYYYMMDD-HHMMSS
~~~

Os comandos exatos de criação e envio da tag devem ser apresentados separadamente
e exigem autorização explícita.

## Checklist operacional

Cada item remete à sua seção; nenhum deles substitui a autorização individual exigida ali.

- [ ] Estado do worktree remoto analisado (e cruzado com os arquivos que os commits tocam)
- [ ] Pré-requisitos locais verdes (`pnpm lint` completo, testes, build)
- [ ] Mudança integrada à `main` e commit a implantar identificado
- [ ] Diagnóstico pré-deploy aprovado: branch, `git ls-remote`, containers, **health de baseline**
- [ ] Cada migration pendente analisada individualmente
- [ ] Backup criado e validado por `"$BACKUP_FILE"` na mesma sessão de shell
- [ ] Impacto do seed parcial (`SEED_MODE=access`) apresentado
- [ ] `deploy.sh` executado em sessão persistente (`tmux`), com `EXIT_CODE=0` conferido no log
- [ ] Validação pós-deploy completa (HTTP, `status`, `database`, `redis`, logs)
- [ ] Efeito no banco confirmado por `COUNT(*)`, quando o deploy tocar dados ou permissões
- [ ] Tags `pre-<commit>` presentes; tags antigas descartadas quando não fizerem mais sentido
- [ ] Build cache verificado (`docker system df`) e podado se estiver grande
- [ ] Tag de release proposta separadamente, se aplicável

