'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SocialActionStatus } from '@central-da-manada/shared';
import { createSocialAction, type SocialActionPayload } from '@/features/social-actions/api';
import { SocialActionForm } from '@/features/social-actions/social-action-form';
import { useRequireAuth } from '@/hooks/use-require-auth';

const now = new Date();
const initialDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function NewSocialActionPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [payload, setPayload] = useState<SocialActionPayload>({ title: '', description: '', location: '', city: '', startDate: initialDate, endDate: initialDate, status: SocialActionStatus.PLANNED, responsibleLegendaryId: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const response = await createSocialAction(payload);
      router.push(`/dashboard/acoes-sociais/${response.data.id}`);
    } catch {
      setError('Nao foi possivel criar a acao social.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/dashboard/acoes-sociais"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para listagem
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Nova Ação Social</h1>
        <p className="text-sm text-zinc-400">Cadastre um novo projeto de impacto social liderado pela manada.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg">
        <SocialActionForm value={payload} onChange={setPayload} onSubmit={submit} saving={saving} />
      </div>
    </div>
  );
}

