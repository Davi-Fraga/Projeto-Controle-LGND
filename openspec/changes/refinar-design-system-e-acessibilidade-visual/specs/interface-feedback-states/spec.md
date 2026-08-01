## ADDED Requirements

### Requirement: Carregamento estável e contextual
Telas e regiões assíncronas SHALL comunicar carregamento sem remover contexto necessário nem causar deslocamento visual evitável quando o conteúdo chegar.

#### Scenario: Carregamento inicial de shell autenticado
- **WHEN** a sessão ainda está sendo validada
- **THEN** o sistema apresenta um estado de carregamento identificável e não expõe controles protegidos prematuramente

#### Scenario: Carregamento de lista ou dashboard
- **WHEN** o shell já está disponível e dados de uma região estão carregando
- **THEN** a região preserva suas dimensões aproximadas por skeleton ou placeholder estrutural e informa o estado de forma acessível

### Requirement: Estados vazios orientam a próxima ação
Regiões sem dados SHALL explicar o contexto do vazio e, quando permitido, oferecer a próxima ação útil sem confundir ausência de dados com falha.

#### Scenario: Busca sem resultados
- **WHEN** filtros ou busca não retornam registros
- **THEN** a interface informa que nenhum resultado corresponde aos critérios e oferece limpar ou ajustar filtros

#### Scenario: Coleção ainda não iniciada
- **WHEN** não existem registros e o usuário pode criar o primeiro
- **THEN** o estado vazio apresenta uma chamada para a ação de criação compatível com sua permissão

### Requirement: Erro e recuperação consistentes
Falhas de carregamento ou ação SHALL apresentar mensagem compreensível, não revelar detalhes sensíveis e oferecer recuperação adequada quando possível.

#### Scenario: Falha ao carregar dados
- **WHEN** uma requisição necessária para a tela falha inesperadamente
- **THEN** a região mostra estado de erro, preserva o restante da navegação e oferece nova tentativa quando a operação for segura

#### Scenario: Falha esperada de autenticação
- **WHEN** a sessão está ausente ou expirada
- **THEN** o fluxo redireciona para autenticação sem exibir erro técnico ou entrar em repetição de refresh

### Requirement: Feedback de ações sem instabilidade
Ações iniciadas pelo usuário SHALL comunicar progresso, sucesso ou falha no local apropriado e impedir submissões duplicadas enquanto estiverem em andamento.

#### Scenario: Envio em andamento
- **WHEN** um formulário válido é enviado
- **THEN** a ação de envio fica indisponível, indica progresso e mantém os dados preenchidos até a resposta

#### Scenario: Sucesso não destrutivo
- **WHEN** uma ação termina com sucesso sem navegação imediata
- **THEN** a interface apresenta confirmação perceptível que não bloqueia a continuidade do trabalho

### Requirement: Movimento respeita preferência do usuário
Animações decorativas e transições SHALL respeitar `prefers-reduced-motion` e não serão necessárias para compreender estado ou navegação.

#### Scenario: Movimento reduzido solicitado
- **WHEN** o usuário habilita redução de movimento no sistema operacional
- **THEN** pulsos, giros decorativos e transições de deslocamento são removidos ou reduzidos sem ocultar o estado comunicado
