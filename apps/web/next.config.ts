import type { NextConfig } from 'next';
import path from 'path';

const securityHeaders = [
  // Anti-clickjacking (as páginas não devem ser embutidas em iframes).
  // Mantido aqui porque vale para TODA resposta, inclusive as que o middleware não
  // intercepta (assets estáticos). O `frame-ancestors` equivalente — e o resto da
  // CSP, com nonce por requisição — fica em `src/middleware.ts`.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Anti MIME-sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS (ignorado em http/dev; ativo em produção https)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
];

// O output standalone depende de symlinks que o Windows bloqueia sem Modo
// Desenvolvedor/admin. Builds Linux (CI/Docker) continuam gerando standalone;
// no Windows, o build padrão ainda compila, valida tipos e gera as páginas.
const standaloneOutput = process.platform === 'win32' ? undefined : 'standalone';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@central-da-manada/shared'],
  // Build standalone: gera um servidor mínimo (.next/standalone) com só as deps
  // realmente usadas — imagem Docker enxuta. outputFileTracingRoot aponta para a
  // raiz do monorepo para o tracing de dependências funcionar com pnpm workspaces.
  output: standaloneOutput,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
