'use client';

import Link from 'next/link';
import { LegendarioForm } from '@/features/legendarios/legendario-form';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function NovoLegendarioPage() {
  const { loading } = useRequireAuth();
  if (loading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/dashboard/legendarios"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Novo Legendário</h1>
        <p className="text-sm text-zinc-400">Insira as informações do novo homem da manada.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <LegendarioForm />
      </div>
    </div>
  );
}

