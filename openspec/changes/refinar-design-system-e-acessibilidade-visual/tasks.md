## 1. Baseline e critérios visuais

- [ ] 1.1 Inventariar cores, tamanhos tipográficos, espaçamentos, bordas, sombras e estados interativos usados no frontend
- [ ] 1.2 Selecionar dashboard e controle de acessos como referências iniciais de tela comum e tela densa
- [ ] 1.3 Registrar screenshots baseline em 1600x900 e 390x844 para os estados definidos nas specs
- [ ] 1.4 Documentar a escala visual proposta e o mapa de valores atuais para tokens semânticos

## 2. Fundações e componentes compartilhados

- [ ] 2.1 Definir tokens CSS de canvas, superfícies, texto, bordas, destaque, foco e feedback em `globals.css`
- [ ] 2.2 Padronizar escala tipográfica e espaçamento responsivo sem aumentar indiscriminadamente a densidade das tabelas
- [ ] 2.3 Criar ou consolidar componentes compartilhados de botão, campo, superfície e cabeçalho de página usando os tokens
- [ ] 2.4 Padronizar estados hover, focus-visible, active, selected e disabled nos componentes compartilhados
- [ ] 2.5 Adicionar suporte a `prefers-reduced-motion` para pulsos, spinners decorativos e transições de deslocamento
- [ ] 2.6 Adicionar testes focados dos contratos visuais e semânticos dos componentes compartilhados

## 3. Shell e navegação acessível

- [ ] 3.1 Garantir nome acessível, `aria-expanded`, `aria-controls` e alvo mobile adequado no toggle da navegação
- [ ] 3.2 Garantir abertura e fechamento do menu mobile pelo toggle e pelo backdrop sem interceptação indevida
- [ ] 3.3 Aplicar foco visível consistente à sidebar, header, menus de ação e navegação por teclado
- [ ] 3.4 Validar que manifesto, `screenAccess` e destinos permission-driven permanecem inalterados
- [ ] 3.5 Cobrir shell desktop/mobile com testes de interação e QA de viewport

## 4. Estados de feedback

- [ ] 4.1 Criar componentes ou padrões compartilhados para loading estrutural, vazio, erro e sucesso
- [ ] 4.2 Migrar validação de sessão e dashboard para estados de carregamento estáveis e acessíveis
- [ ] 4.3 Migrar uma lista representativa para vazio orientado, busca sem resultados e recuperação de erro
- [ ] 4.4 Padronizar progresso e prevenção de envio duplicado em um formulário representativo
- [ ] 4.5 Adicionar testes dos estados assíncronos e de recuperação sem expor mensagens técnicas ou dados sensíveis

## 5. Densidade e responsividade

- [ ] 5.1 Refinar hierarquia de cards e ações do dashboard reduzindo bordas sem função semântica
- [ ] 5.2 Criar padrão mobile para filtros extensos com busca e ação principal sempre acessíveis
- [ ] 5.3 Criar padrão responsivo para tabelas largas preservando identificação e ações dos registros
- [ ] 5.4 Migrar legendários, igrejas e equipes como primeira onda de listas e formulários
- [ ] 5.5 Migrar TOPs, ações sociais, comunicação e usuários como segunda onda de listas e formulários
- [ ] 5.6 Refinar shell e controles ao redor de acesso, relatórios, mapa e organograma sem alterar cores de dados especializadas

## 6. Validação e documentação

- [ ] 6.1 Executar testes do frontend e lint/type-check completo após cada onda
- [ ] 6.2 Executar QA Playwright funcional em desktop e mobile, incluindo teclado, toque e ciclos reversíveis
- [ ] 6.3 Executar QA visual separado nos estados inicial, denso, carregando, vazio, erro, modal/menu aberto e pós-interação
- [ ] 6.4 Verificar ausência de overflow não intencional, clipping, contraste fraco, foco oculto e alvos pequenos
- [ ] 6.5 Publicar guia curto de tokens, tipografia, superfícies, ações e critérios para novos componentes
- [ ] 6.6 Revisar valores crus remanescentes e registrar exceções justificadas de mapa, organograma e gráficos
