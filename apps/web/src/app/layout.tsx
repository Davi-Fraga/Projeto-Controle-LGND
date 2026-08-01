import type { Metadata } from 'next';
import '../styles/globals.css';

// O nonce da CSP (src/middleware.ts) só é carimbado nos scripts do Next em páginas
// renderizadas por requisição — prerender estático não tem como embutir um nonce
// único por resposta. Sem isto, a CSP bloqueia todos os chunks e a página não sobe.
// Custo aceitável aqui: é um painel administrativo autenticado, sem página pública
// que se beneficie de cache estático.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Central da Manada',
  description: 'Central da Manada Rota do Cerrado',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
