import type { NextConfig } from 'next';

const securityHeaders = [
  // Anti-clickjacking (as páginas não devem ser embutidas em iframes)
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // Anti MIME-sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS (ignorado em http/dev; ativo em produção https)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@central-da-manada/shared'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
