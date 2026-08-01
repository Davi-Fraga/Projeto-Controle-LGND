## Why

A interface já possui uma identidade escura e laranja reconhecível, mas cresceu com cores, tamanhos, bordas e estados interativos definidos diretamente em muitas telas. A auditoria visual e funcional de 31 de julho de 2026 também encontrou lacunas concretas de acessibilidade e consistência mobile, tornando oportuno consolidar uma base visual incremental sem redesenhar o produto nem alterar suas regras de negócio.

## What Changes

- Formalizar tokens semânticos para superfícies, texto, bordas, destaque, foco e estados de feedback, preservando a identidade Central da Manada.
- Definir uma escala tipográfica e de espaçamento responsiva que melhore legibilidade e ritmo visual, especialmente para textos auxiliares hoje muito pequenos.
- Padronizar estados de hover, foco visível, seleção, desabilitado e erro nos componentes interativos compartilhados.
- Reduzir ruído visual causado por bordas e caixas repetidas, usando hierarquia de superfícies e espaçamento de forma consistente.
- Melhorar a experiência mobile de navegação, filtros, tabelas e ações, com alvos de toque adequados e controles semanticamente identificáveis.
- Padronizar carregamento, vazio, erro e sucesso para evitar saltos de layout e feedback inconsistente.
- Introduzir uma migração incremental por componentes e telas prioritárias, acompanhada de testes funcionais, acessibilidade básica e QA visual em viewports definidos.

## Capabilities

### New Capabilities

- `visual-design-foundations`: Tokens semânticos, tipografia, espaçamento, superfícies e estados visuais compartilhados da interface.
- `responsive-accessible-interface`: Requisitos de navegação, controles, filtros, tabelas e ações para teclado, toque e viewports desktop/mobile.
- `interface-feedback-states`: Padrões consistentes para carregamento, vazio, erro, sucesso e transições sem deslocamentos visuais desnecessários.

### Modified Capabilities

Nenhuma. As regras funcionais existentes, inclusive navegação por acesso efetivo e autorização no backend, permanecem inalteradas.

## Impact

- Frontend: `apps/web/src/styles/globals.css`, `apps/web/src/components/ui`, `apps/web/src/components/layout` e adoção gradual nas telas de dashboard.
- Testes: Vitest/Testing Library para contratos de interação e acessibilidade; Playwright para fluxos funcionais e revisão visual desktop/mobile.
- Documentação: guia curto de tokens, composição de superfícies e critérios de adoção incremental.
- Sem mudanças previstas em API, banco, Prisma, permissões, contratos compartilhados ou deploy.
