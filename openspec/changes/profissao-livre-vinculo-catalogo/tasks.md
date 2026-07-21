## 1. Schema e contrato compartilhado

- [ ] 1.1 Adicionar `Legendary.professionText` anulável ao schema Prisma e aos tipos compartilhados, sem remover nem alterar `professionId`/relação atuais
- [ ] 1.2 Criar migration aditiva e idempotente para a nova coluna, acompanhada de comandos documentados de preview/dry-run, backup, validação pós-migration e rollback seguro
- [ ] 1.3 Gerar o Prisma Client e validar que a migration preserva a contagem e os IDs de todos os vínculos de profissão existentes em banco de teste com dado legado

## 2. Resolução única de profissão

- [ ] 2.1 Implementar no módulo de profissões um resolvedor público e sem efeitos colaterais que reutilize `normalizeName` e retorne vazio, match único, não encontrado ou ambíguo considerando somente profissões ativas
- [ ] 2.2 Exportar o resolvedor pelo módulo e remover a resolução privada duplicada do `LegendaryFormsSyncService`
- [ ] 2.3 Testar match com caixa/acentos/espaços, texto sem match, colisão normalizada, profissão inativa e garantir que nenhuma operação crie profissão ou alias

## 3. API de legendários

- [ ] 3.1 Acrescentar `professionText` aos DTOs de criação/atualização e rejeitar payload que defina simultaneamente texto e ID, mantendo `professionId` isolado compatível
- [ ] 3.2 Aplicar a resolução compartilhada em create/update com semântica distinta para propriedade ausente, vazia, encontrada e pendente
- [ ] 3.3 Preservar causas globais de `needsReview`, forçando `true` apenas para profissão não encontrada/ambígua e nunca limpando outras pendências automaticamente
- [ ] 3.4 Testar criação e atualização com match, sem match, limpeza explícita, PATCH sem profissão, payload ambíguo e preservação de vínculo legado

## 4. Forms e reconciliação

- [ ] 4.1 Usar o resolvedor compartilhado no sync do Forms e persistir `professionText` quando a profissão não tiver match único
- [ ] 4.2 Atualizar a reconciliação de referências para ler/gravar `professionText` e manter o resultado idempotente
- [ ] 4.3 Testar Forms/reconciliação para match, ausência e ambiguidade, incluindo `needsReview`, histórico da inconsistência e proibição de auto-criação

## 5. Interface e apresentação

- [ ] 5.1 Substituir o `<select>` de profissão do formulário de legendário por input de texto livre, inicializado por `profession.name ?? professionText`, e remover o carregamento obrigatório do catálogo nessa tela
- [ ] 5.2 Garantir que alterações não relacionadas não sobrescrevam um vínculo legado, inclusive quando a profissão vinculada estiver inativa
- [ ] 5.3 Atualizar perfil e exportação para mostrar `profession.name ?? professionText`, mantendo filtros e relatório agrupado baseados em `professionId`
- [ ] 5.4 Adicionar testes de interface/payload e fallback de apresentação para profissão vinculada, livre e ausente

## 6. Validação e rollout

- [ ] 6.1 Executar testes unitários e de integração dos módulos afetados, lint, typecheck e build conforme os scripts do repositório
- [ ] 6.2 Executar migration e smoke tests em ambiente de homologação com dados representativos, comparando o preview com as checagens pós-migration
- [ ] 6.3 Registrar evidências de backup verificado, migration aplicada e integridade dos vínculos antes do deploy de produção
- [ ] 6.4 Validar todos os cenários das specs da change e somente então marcar a implementação pronta para archive
