// Cor determinística por líder: mesmo leaderId -> mesma cor, entre sessões. A cor
// serve só como ESPINHA fina de wayfinding (diferenciar subdivisões), nunca como
// preenchimento. Por isso a paleta é de baixa saturação e lightness parecida — ela
// deve sussurrar. O laranja fica RESERVADO ao estado ativo/selecionado (ACCENT).

export const NEUTRAL_COLOR = '#5b5b66'; // espinha neutra (sem líder)
export const ACCENT = '#f97316';        // laranja: só foco/seleção/rota ativa

// Tons desbotados, mesma família de brilho — leem como "rotas de mapa", não neon.
const PALETTE = [
  '#6f8caf', // steel blue
  '#5f9e8f', // sage/teal
  '#a88bb0', // dusty mauve
  '#b0906a', // muted ochre
  '#8f9e6b', // muted olive
  '#9a7b8e', // dusty rose
  '#6f97a0', // muted cyan-gray
  '#a0955f', // gold-olive
  '#8b8fb0', // muted periwinkle
  '#7fa08a', // muted green
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

export function colorForLeader(leaderId?: string): string {
  if (!leaderId) return NEUTRAL_COLOR;
  return PALETTE[hashString(leaderId) % PALETTE.length];
}
