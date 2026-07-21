'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InternalMessageTargetType } from '@central-da-manada/shared';
import { CommunicationForm } from '@/features/communications/communication-form';
import { createCommunication, type CommunicationPayload } from '@/features/communications/api';
import { useRequireAuth } from '@/hooks/use-require-auth';

const initial: CommunicationPayload = {
  title: '',
  body: '',
  targetType: InternalMessageTargetType.ALL_ACTIVE_LEGENDARIES,
  targetId: '',
  topEventId: '',
  requiresConfirmation: false,
};

export default function NewCommunicationPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [payload, setPayload] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const response = await createCommunication(payload);
      router.push(`/dashboard/comunicacao/${response.data.id}`);
    } catch {
      setError('Não foi possível salvar o comunicado.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/dashboard/comunicacao"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Novo Comunicado</h1>
        <p className="text-sm text-zinc-400">Escreva um aviso ou mensagem para disparar para grupos da manada.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <CommunicationForm value={payload} onChange={setPayload} onSubmit={submit} saving={saving} />
      </div>
    </div>
  );
}
