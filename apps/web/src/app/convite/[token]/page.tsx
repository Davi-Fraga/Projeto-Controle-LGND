'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { acceptInvite, validateInvite } from '@/features/invites/api';

type State = 'loading' | 'valid' | 'invalid' | 'done';

export default function AceitarConvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [state, setState] = useState<State>('loading');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    validateInvite(token)
      .then((res) => { setEmail(res.data.email); setState('valid'); })
      .catch(() => setState('invalid'));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setSubmitting(true);
    try {
      await acceptInvite(token, { name: name.trim(), password });
      setState('done');
      setTimeout(() => router.replace('/login'), 2500);
    } catch {
      setError('Não foi possível concluir. O convite pode ter expirado ou já ter sido usado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0B0B] p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111113] p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-700">
            <span className="font-black text-white text-sm">M</span>
          </div>
          <div>
            <h1 className="font-black tracking-wide text-zinc-100 text-sm uppercase">Central da Manada</h1>
            <p className="text-[10px] font-semibold text-orange-500 tracking-widest uppercase">Rota do Cerrado</p>
          </div>
        </div>

        {state === 'loading' && <p className="text-sm text-zinc-500">Validando convite...</p>}

        {state === 'invalid' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">Convite inválido</h2>
            <p className="text-sm text-zinc-400">Este convite é inválido, expirou ou já foi usado. Peça um novo link ao administrador.</p>
            <Link href="/login" className="inline-flex h-10 items-center rounded-lg border border-zinc-800 px-4 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-900">Ir para o login</Link>
          </div>
        )}

        {state === 'done' && (
          <div className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-emerald-400">Conta criada!</h2>
            <p className="text-sm text-zinc-400">Sua conta foi criada com sucesso. Redirecionando para o login...</p>
          </div>
        )}

        {state === 'valid' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-white">Criar sua conta</h2>
              <p className="mt-1 text-sm text-zinc-400">Convite para <span className="font-semibold text-zinc-200">{email}</span>. Defina seu nome e senha.</p>
            </div>

            {error && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400">{error}</div>}

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nome completo</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Senha</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Confirmar senha</span>
              <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </label>

            <button type="submit" disabled={submitting} className="flex h-11 w-full items-center justify-center rounded-lg bg-orange-600 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 disabled:opacity-50">
              {submitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
