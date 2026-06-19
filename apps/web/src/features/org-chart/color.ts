// Deterministic color per leader: same leaderId -> same color, across sessions.
// Subtree inheritance is resolved at layout time (a node without leaderId uses the
// nearest ancestor's leaderId). Nodes with no leader anywhere use the neutral color.

export const NEUTRAL_COLOR = '#52525b'; // zinc-600

const PALETTE = [
  '#f97316', // orange-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
  '#eab308', // yellow-500
  '#14b8a6', // teal-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f59e0b', // amber-500
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
