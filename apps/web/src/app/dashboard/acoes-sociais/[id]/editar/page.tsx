'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSocialAction, updateSocialAction, type SocialActionPayload } from '@/features/social-actions/api';
import { SocialActionForm } from '@/features/social-actions/social-action-form';
import { useRequireAuth } from '@/hooks/use-require-auth';

function toLocalDate(value: string) {
  return value.slice(0, 16);
}


export default function EditSocialActionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const [payload, setPayload] = useState<SocialActionPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    getSocialAction(params.id).then((response) => setPayload({
      title: response.data.title,
      description: response.data.description ?? '',
      location: response.data.location ?? '',
      city: response.data.city ?? '',
      startDate: toLocalDate(response.data.startDate),
      endDate: toLocalDate(response.data.endDate),
      status: response.data.status,
      responsibleLegendaryId: response.data.responsibleLegendaryId,
      notes: response.data.notes ?? '',
      resultSummary: response.data.resultSummary ?? '',
    })).catch(() => router.replace('/dashboard/acoes-sociais'));
  }, [authLoading, params.id, router]);

  async function submit() {
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      await updateSocialAction(params.id, payload);
      router.push(`/dashboard/acoes-sociais/${params.id}`);
    } catch {
      setError('Não foi possível salvar a ação social.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !payload) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href={`/dashboard/acoes-sociais/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Voltar para detalhes
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">Editar Ação Social</h1>
        <p className="text-sm text-zinc-400">Atualize as informações do projeto social {payload.title}.</p>
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
