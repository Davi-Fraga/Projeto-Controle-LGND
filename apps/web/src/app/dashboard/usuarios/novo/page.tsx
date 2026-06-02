'use client';

import Link from 'next/link';
import { UserForm } from '@/features/users/user-form';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function NovoUsuarioPage() {
  const { loading } = useRequireAuth();
  if (loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/dashboard/usuarios"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Novo Usuário</h1>
        <p className="text-sm text-zinc-400">Crie um acesso ao sistema, defina perfis e vincule a um legendário.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <UserForm />
      </div>
    </div>
  );
}
