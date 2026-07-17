/**
 * Expande abreviações comuns de endereços brasileiros para a forma por extenso, porque
 * o Nominatim (OpenStreetMap) frequentemente NÃO reconhece as abreviadas e devolve vazio
 * — o que fazia o geocoding cair silenciosamente no centro da cidade. Ex.: "St." (Setor)
 * quebrava a busca; "Setor" resolve. Só expande tokens delimitados por fronteira de
 * palavra + espaço, preservando o resto do texto (número, CEP, cidade). Ver bug do
 * geocoding por endereço (change `endereco-igreja-geocoding-preciso`).
 */
const ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bAv\.?(?=\s)/gi, 'Avenida'],
  [/\bR\.?(?=\s)/gi, 'Rua'],
  [/\bTrav\.?(?=\s)/gi, 'Travessa'],
  [/\bTv\.?(?=\s)/gi, 'Travessa'],
  [/\bRod\.?(?=\s)/gi, 'Rodovia'],
  [/\bP(?:ç|c)a?\.?(?=\s)/gi, 'Praça'],
  [/\bJd\.?(?=\s)/gi, 'Jardim'],
  [/\bPq\.?(?=\s)/gi, 'Parque'],
  [/\bCj\.?(?=\s)/gi, 'Conjunto'],
  [/\bQd\.?(?=\s)/gi, 'Quadra'],
  // "St." = Setor (dominante em endereços de Goiás). Ambíguo com "Santo", raro nesse contexto.
  [/\bSt\.?(?=\s)/gi, 'Setor'],
];

export function expandBrAbbreviations(text: string): string {
  let out = text;
  for (const [pattern, full] of ABBREVIATIONS) out = out.replace(pattern, full);
  return out;
}
