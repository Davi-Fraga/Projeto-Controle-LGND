'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firstAllowedRoute } from '@central-da-manada/shared';
import { login } from '@/features/auth/actions';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      // Destino inicial pela ordem do manifesto (change alinhar-abas): Painel se permitido,
      // senão a primeira aba concedida; `/dashboard` cobre o estado "sem acesso" terminal.
      router.push(firstAllowedRoute(user) ?? '/dashboard');
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#0B0B0B] px-4 py-12 overflow-hidden">
      {/* Decorative gradients for the strong visual style */}
      <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-orange-600/10 blur-[130px]" />
      <div className="absolute -right-1/4 -bottom-1/4 h-[600px] w-[600px] rounded-full bg-zinc-900/40 blur-[130px]" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-zinc-850 bg-[#121214]/80 p-8 shadow-2xl backdrop-blur-md"
      >
        {/* Top Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-xl shadow-orange-950/40">
            <span className="text-xl font-black text-white">M</span>
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">
            Central da Manada
          </h1>
          <p className="mt-1.5 text-xs font-bold text-orange-500 tracking-widest uppercase">
            Rota do Cerrado
          </p>
          <div className="mx-auto mt-4 h-0.5 w-16 bg-zinc-800" />
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
              E-mail
            </span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
              Senha
            </span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Sua senha secreta"
              required
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-orange-600 px-4 text-sm font-bold tracking-wide text-white uppercase transition-all hover:bg-orange-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-orange-950/20"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            'Entrar no Sistema'
          )}
        </button>
      </form>
    </main>
  );
}

