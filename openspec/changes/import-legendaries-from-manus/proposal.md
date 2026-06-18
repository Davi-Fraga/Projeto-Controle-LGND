## Why

A operação da Rota do Cerrado mantém hoje **226 legendários** da manada no app antigo (Manus), que está sendo descontinuado. Esses dados são a base de quase tudo no Gestão LGND — equipes, escopo de acesso, contagem de TOPs e o mapa geográfico — mas o sistema novo está vazio deles. A exportação JSON do Manus (já capturada em `manus-membros.json`) traz dados sujos que não podem ser importados crus (cidades em **52 grafias** para ~34 cidades reais, telefones inconsistentes, `numeroLegendario` com ponto), então é preciso uma importação **normalizada, idempotente e auditável**.

## What Changes

- Adiciona um importador (`prisma/import-manus.ts`, executado via `tsx`) que lê a exportação JSON do Manus, normaliza os dados e popula `Legendary`, `Team` e `TeamMembership`. O loader aceita tanto o array direto quanto o envelope `{ result: { data: { json: [...] } } }`.
- Normaliza a **cidade canônica** via tabela de mapeamento explícita (52 grafias → ~34 cidades) para evitar pontos duplicados no mapa; grafias fora do mapa caem em um fallback Title-Case.
- Normaliza **telefone** para um formato BR único `(DD) XXXXX-XXXX` (remove `+55`, zero de DDD e espaços; grava o dígito cru se não bater 10/11 dígitos) e **`lgndNumber`** (remove pontos/não-dígitos).
- Marca todos os importados com `isFromRotaDoCerrado = true` e `status = ACTIVE`.
- Garante **idempotência por `lgndNumber`** (find + update / create): reexecução não duplica `Legendary`. As **9 equipes** (`Administrativo, Eventos, Logística, Segurança, A Definir, Pastor, Mídia, Voz, Hakoona`) são resolvidas por nome (find-or-create) e o vínculo `TeamMembership` é criado só se ainda não existir ativo.
- Marca com `needsReview = true` as **11 pessoas** com função de liderança no Manus (`Coordenador`, `Sub coordenador`, `Lider`, `Líder adoração`) para atribuição manual posterior de coordenador de equipe; a função original é preservada em `notes` (`"Função no Manus: ..."`) e usada como `role` da membership.
- Ao final, imprime um **resumo auditável** (criados, atualizados, vínculos criados, marcados para revisão).

## Capabilities

### New Capabilities
- `legendary-import`: importação normalizada, idempotente e auditável dos legendários da Rota do Cerrado a partir da exportação JSON do Manus, incluindo normalização de cidade/telefone/`lgndNumber`, criação das equipes e vínculos, marcação de revisão para lideranças e resumo final.

### Modified Capabilities
<!-- Nenhuma. A change não altera requisitos de capabilities existentes. -->

## Impact

- **Affected specs**: nova capability `legendary-import`.
- **Affected code**: `prisma/import-manus.ts` (novo script). Insumo: `manus-membros.json` — hoje na raiz do repo; o script o lê de `prisma/data/manus-membros.json`, então o arquivo precisa ser movido/copiado para lá (ou o caminho ajustado).
- **Affected data**: cria/atualiza `Legendary`, `Team`, `TeamMembership`. Não altera schema do Prisma, migrations, auth, permissões, refresh token, CORS ou configuração global.
- **Risco**: baixo. Operação isolada de seed/migração de dados, idempotente. Os 226 registros têm `numeroLegendario` (0 sem número), então a idempotência por `lgndNumber` cobre todos. Não toca em código de runtime da API/web.
