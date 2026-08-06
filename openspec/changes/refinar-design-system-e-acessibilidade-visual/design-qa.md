# Design QA — onda 1 (fundações, shell e dashboard)

> **Sobre as evidências.** As capturas foram feitas localmente e **não são versionadas** — são
> grandes, efêmeras e ficam obsoletas a cada ajuste visual. Aqui ficam registradas as **condições
> exatas** de captura e os **valores medidos**, que é o que permite reproduzir a verificação.
> Para refazer: `pnpm dev`, autenticar, e capturar nos viewports abaixo.

## Condições de captura

| Parâmetro | Valor |
|---|---|
| Viewport desktop | `1600x900` CSS px, `deviceScaleFactor: 1` |
| Viewport mobile | `390x844` CSS px |
| Estado | dashboard autenticado, densidade realista, usuário administrador anonimizado |
| Normalização | sem redimensionamento; referência e implementação combinadas 1:1, separadas por faixa de 8px |

## Medições

- Mobile sem overflow horizontal: `scrollWidth: 390` (igual ao viewport)
- Toggle mobile: `44x44` CSS px, `aria-controls="primary-navigation"`, ciclo `aria-expanded` `false → true → false`
- Foco: anel externo de 2px com offset de 2px
- Erros de console ou de página durante o fluxo: **nenhum**
- Interações exercitadas: foco por teclado na ação primária; abrir e fechar o menu pelo toggle; fechar pelo backdrop

## Comparação visual

### Composição e hierarquia

A implementação mantém as proporções da referência: sidebar persistente, header compacto, título e subtítulo, faixa de ações rápidas, três grupos de métricas e uma superfície dominante para o TOP em destaque. A ordem de leitura coincide e nada essencial é cortado em 1600x900.

### Tipografia

Mantida a pilha de fontes do sistema já usada na base. Título de página, rótulos, corpo operacional e valores reproduzem os cinco papéis da escala. Corpo operacional em pelo menos 14px; textos auxiliares novos em 12px.

### Espaçamento e superfícies

Margens, alinhamentos e intervalos preservam a densidade administrativa. Bordas fortes saíram dos itens internos; grupos usam uma superfície única com espaço e divisores sutis. Raios e altura de controles coerentes entre desktop e mobile.

### Cores e tokens

Canvas, superfícies, texto, linhas, destaque e foco derivam dos tokens semânticos. O preto/zinc e o laranja `#F97316` dos Legendários seguem dominantes. Ação primária, navegação selecionada e foco recebem a ênfase prevista; ações secundárias ficam tonais.

### Ícones e conteúdo

A tela não exige fotografia nem ilustração. O monograma existente foi preservado e os ícones continuam vindo da biblioteca já instalada — sem SVG artesanal nem placeholder. Labels e dados são os contratos reais da API.

## Desvios intencionais

- **Círculo de progresso do TOP não implementado.** A API não fornece percentual, e inventar o valor violaria a fidelidade funcional. O estado real do TOP e as contagens disponíveis ocupam a mesma região hierárquica.
- **Faixa "Estados de componentes" não colocada no dashboard.** Não é função do produto e não há decisão aprovada para uma rota de catálogo. Os estados estão implementados nos componentes e cobertos por testes.

## Findings

Nenhuma diferença P0, P1 ou P2 acionável após a comparação normalizada. Os desvios acima são restrições funcionais deliberadas, não perdas de fidelidade.

## Histórico da comparação

No primeiro passe, o cache antigo do Next manteve a configuração anterior do Tailwind e as classes semânticas não estavam presentes no CSS servido. O servidor foi parado, o `.next` movido para backup local e a captura refeita. Esse preflight não conta como passe visual. No primeiro passe válido não houve P0/P1/P2.

⚠️ **Armadilha para repetir a verificação:** mudança em `tailwind.config.ts` exige derrubar o dev server e limpar o `.next` — senão você compara contra CSS velho e conclui errado.

## Checklist da onda

- [x] Hierarquia desktop compatível com a referência
- [x] Reflow mobile sem overflow horizontal
- [x] Navegação mobile reversível pelo toggle e pelo backdrop
- [x] Foco visível observado por teclado
- [x] Estados de loading, vazio, erro e sucesso compartilhados
- [x] Console sem erros durante o fluxo validado

## Próximo passo

Nenhum P3 bloqueante. A onda seguinte pode migrar listas e formulários para os novos componentes sem alterar a composição aprovada do dashboard.
