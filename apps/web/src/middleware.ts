import { NextRequest, NextResponse } from 'next/server';

/**
 * Content-Security-Policy por requisição (VULN-005 da auditoria de segurança).
 *
 * A CSP anterior vivia no `next.config.ts` e tinha só `frame-ancestors 'none'` —
 * cobria clickjacking e mais nada. Sem `script-src`, um XSS teria execução livre,
 * e o access token fica em `localStorage` (lido por `lib/auth.ts`), então um XSS
 * vira roubo de sessão. Esta é a camada que faltava.
 *
 * Por que middleware e não header estático: `script-src` só é útil de verdade com
 * nonce, e nonce precisa ser único por resposta. O Next injeta o nonce nos próprios
 * scripts quando encontra o header `x-nonce` na REQUISIÇÃO — daí o repasse abaixo.
 *
 * `strict-dynamic`: os chunks do Next são carregados pelo bootstrap já nonce-ado,
 * então herdam confiança. Navegador com CSP3 ignora `'self'` em script-src nesse
 * modo; `'self'` fica como fallback para navegador antigo.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  // O front conversa com a API em OUTRA origem em produção
  // (api.sistema… x sistema…), então connect-src precisa liberá-la explicitamente.
  let apiOrigin = '';
  try {
    apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api').origin;
  } catch {
    apiOrigin = '';
  }

  return [
    "default-src 'self'",
    // 'unsafe-eval' só em dev: o HMR do Next compila por eval. Nunca em produção.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // O Leaflet escreve estilos inline nos elementos do mapa — sem isto o mapa quebra.
    "style-src 'self' 'unsafe-inline'",
    // blob:/data: para ícones do Leaflet; tiles do OpenStreetMap (features/map/rota-map.tsx).
    "img-src 'self' blob: data: https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}${isDev ? ' ws: http://localhost:*' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);

  // O Next lê `x-nonce` da requisição para carimbar seus próprios <script>.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Assets estáticos não precisam de CSP e pagariam o custo do middleware à toa.
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
