## Why

O cadastro manual de legendários exige hoje um `professionId` escolhido em uma lista fechada. Como o catálogo é incompleto, o usuário não consegue informar uma profissão válida que ainda não esteja cadastrada; no fluxo de Forms existe um match por nome normalizado, porém o texto não reconhecido fica apenas no histórico de inconsistências e não no perfil do legendário.

A profissão precisa aceitar texto livre sem abandonar o catálogo existente: correspondências inequívocas devem manter o vínculo estruturado, enquanto textos não reconhecidos devem ser preservados e encaminhados para revisão, sem criar profissões automaticamente.

## What Changes

- Substituir o `<select>` fechado de profissão no formulário de legendário por uma entrada de texto livre.
- Acrescentar ao legendário um campo textual opcional para preservar profissões sem vínculo com o catálogo, mantendo `professionId` para correspondências canônicas.
- Extrair a resolução por nome normalizado para um serviço único de profissões e reutilizá-lo no cadastro manual, na sincronização do Forms e na reconciliação.
- Vincular somente quando houver uma correspondência única entre profissões ativas; texto sem correspondência ou ambíguo permanece livre, força `needsReview` e nunca cria `Profession` no runtime.
- Preservar vínculos existentes por meio de migração aditiva e inicializar o novo campo de edição pelo nome catalogado ou pelo texto livre já salvo.
- Exibir e exportar a profissão usando o nome catalogado quando vinculado e o texto livre como fallback.
- Manter temporariamente `professionId` como entrada compatível da API, mas impedir que `professionId` e o novo texto sejam enviados juntos.

## Capabilities

### New Capabilities

- `legendary-free-text-profession`: entrada livre, resolução oportunista contra o catálogo, persistência do texto não reconhecido e preservação dos vínculos existentes.

### Modified Capabilities

- `legendary-forms-sync`: a resolução de profissão do Forms passa a reutilizar o resolvedor compartilhado e a persistir no legendário o texto sem correspondência.

## Impact

- **Banco:** alteração aditiva em `Legendary`, com nova coluna textual anulável; `professionId` e seus dados permanecem intactos.
- **API:** DTOs e serviço de legendários passam a aceitar/resolver texto; módulo de profissões expõe resolução sem efeitos colaterais; sync/reconciliação do Forms usam a mesma regra.
- **Web:** formulário usa entrada livre; perfil e exportação ganham fallback para o texto preservado. O filtro e os relatórios catalogados continuam baseados em `professionId`.
- **Operação:** migration deve ter preview/dry-run, backup antes do deploy e checagens posteriores de contagem e integridade dos vínculos existentes.
- **Testes:** cobrem match normalizado, ausência/ambiguidade de match, proibição de auto-criação, preservação de vínculo e dado legado, ausência do campo em PATCH e fallback de apresentação.
