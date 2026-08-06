# Baseline visual e mapa de tokens

Captura e inventário fechados em 5 de agosto de 2026, antes das alterações da Onda 1. O inventário considera `apps/web/src/**/*.{ts,tsx,css}`.

## Referências escolhidas

- Tela comum: dashboard autenticado.
- Tela densa: controle de acessos autenticado.
- Viewports contratuais: `1600x900` e `390x844` CSS pixels.
- Direção visual aprovada: opção 1, “Hierarquia Operacional”.

## Evidência baseline

As capturas **não são versionadas** — são grandes, efêmeras e ficam obsoletas a cada ajuste visual;
ficam num diretório local de QA na máquina de quem executou e não contêm credenciais nem dados
pessoais persistidos. O que torna a verificação reproduzível são os **viewports contratuais** acima
e os **hashes** abaixo: recapturando nas mesmas condições, o SHA-256 identifica se o estado mudou.

| Estado | Arquivo | SHA-256 |
| --- | --- | --- |
| Dashboard desktop 1600x900 | `dashboard-desktop-1600x900.png` | `F41EB61358C15B255F0061EEAF9AD291A7092C151F0613048CACC998621961A8` |
| Dashboard mobile 390x844 | `dashboard-mobile-390x844.png` | `AF3D79BD2A276395153D83A7CC44DCD60F42D70C6DF874C249423EFF3FE73097` |
| Acessos desktop 1600x900 | `controle-acessos-desktop-1600x900.png` | `E36896AF1E52B18F1F03321099FD0180484C64146FD9260D4FB60AFB0E688E6B` |
| Acessos mobile 390x844 | `controle-acessos-mobile-390x844.png` | `D884DF90F475B99A26A08B6B2E127A6EA5030DF7FA74D9953C4690DA53FDAF40` |

Todas as quatro capturas registraram largura de viewport exata e ausência de overflow horizontal do documento.

## Inventário atual

| Medida | Resultado | Leitura |
| --- | ---: | --- |
| Arquivos de fonte analisados | 148 | TS, TSX e CSS do frontend |
| Cores hex distintas | 62 | inclui cores especializadas de mapa e organograma |
| Arquivos com `bg-orange-*` cru | 47 | migração será incremental |
| Arquivos usando `.input` | 31 | existe padrão visual, mas não composição semântica |
| Arquivos usando `focus-visible` | 3 | foco precisa nascer nos compartilhados e no shell |
| Tamanhos tipográficos encontrados | 29 | inclui cores capturadas pelo padrão `text-*`; tamanhos crus vão de 9px a 13.5px |
| Raios encontrados | 7 | de `rounded` a `rounded-2xl/full` |
| Sombras encontradas | 8 | várias intensidades sem papel documentado |

Valores de superfície próximos encontrados: `#080808`, `#0B0B0B`, `#0E0E10`, `#111113`, `#18181B`, `#1B1B1F` e `#27272A`. O token antigo `--background` apontava para `#0B0B0B`, enquanto o `body` usava `#0E0E10` diretamente.

## Mapa semântico aprovado

| Papel | Token CSS | Valor inicial | Origem |
| --- | --- | --- | --- |
| Canvas | `--canvas` | `#0E0E10` | fundo real do produto |
| Superfície sutil | `--surface-subtle` | `#0B0B0B` | sidebar e regiões mais profundas |
| Superfície base | `--surface` | `#111113` | agrupamentos operacionais |
| Superfície elevada | `--surface-raised` | `#18181B` | controles e painéis elevados |
| Texto forte | `--text-strong` | `#F4F4F5` | títulos e valores |
| Texto operacional | `--text` | `#D4D4D8` | conteúdo principal |
| Texto auxiliar | `--text-muted` | `#A1A1AA` | metadados e instruções |
| Borda | `--line` | `#27272A` | separação discreta |
| Destaque | `--accent` | `#F97316` | laranja Legendários preservado |
| Foco | `--focus` | `#FB923C` | contorno visível de 2px |
| Sucesso | `--feedback-success` | `#22C55E` | confirmação |
| Atenção | `--feedback-warning` | `#F59E0B` | pendência |
| Erro | `--feedback-danger` | `#F43F5E` | erro e ação destrutiva |

`--background`, `--foreground`, `--border`, `--primary` e `--primary-foreground` permanecem como aliases temporários para a migração incremental.

## Escala visual curta

| Papel | Tamanho | Uso |
| --- | --- | --- |
| Título de página | `clamp(24px, ..., 30px)` | um `h1` por tela |
| Título de seção | `16px` | agrupamentos e superfícies |
| Corpo operacional | `14px` | formulários, tabelas, instruções e cards |
| Auxiliar | `12px` | metadados e ajuda, nunca abaixo de 12px nos novos componentes |
| Rótulo | `12px` | labels e eyebrows em caixa alta |

O ritmo usa a escala Tailwind existente nos níveis compactos e dois espaços responsivos: `--space-page` (16–32px) e `--space-section` (20–32px). Tabelas não recebem aumento global.

## Critérios da opção 1

- preto, zinc e laranja permanecem como identidade;
- no máximo uma ação sólida primária por grupo;
- agrupamentos usam nível de superfície e espaço antes de bordas fortes;
- shell, controles e foco são corrigidos antes da migração das páginas;
- o dashboard da Onda 2 agrupará métricas em Pessoas, Estrutura e Engajamento, mantendo permissões e dados atuais;
- mapa, organograma e gráficos podem manter cores de dados especializadas.
