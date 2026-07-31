'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InternalMessageStatus } from '@central-da-manada/shared';
import { cancelCommunication, confirmRecipient, getCommunication, getRecipients, markRecipientRead, sendCommunication, updateCommunication, type CommunicationPayload } from '@/features/communications/api';
import { CommunicationForm } from '@/features/communications/communication-form';
import type { InternalMessage, MessageRecipient } from '@central-da-manada/shared';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useCan } from '@/hooks/use-can';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function CommunicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const canDo = useCan(user);
  // `communications.send` é permission PRÓPRIA no backend, distinta de
  // `communications.update` — que cobre tanto editar quanto cancelar o envio.
  const canSend = canDo('communications.send');
  const canUpdate = canDo('communications.update');
  const canUpdateRecipients = canDo('communications.recipients.update');
  const [message, setMessage] = useState<InternalMessage | null>(null);
  const [payload, setPayload] = useState<CommunicationPayload | null>(null);
  const [recipients, setRecipients] = useState<MessageRecipient[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [messageResponse, recipientsResponse] = await Promise.all([getCommunication(params.id), getRecipients(params.id).catch(() => ({ data: [] }))]);
    setMessage(messageResponse.data);
    setPayload({
      title: messageResponse.data.title,
      body: messageResponse.data.body,
      targetType: messageResponse.data.targetType,
      targetId: messageResponse.data.targetId ?? '',
      topEventId: messageResponse.data.topEventId ?? '',
      requiresConfirmation: messageResponse.data.requiresConfirmation,
    });
    setRecipients(recipientsResponse.data);
  }

  useEffect(() => {
    if (authLoading) return;
    load().catch(() => router.replace('/dashboard/comunicacao'));
  }, [authLoading, params.id, router]);

  async function save() {
    if (!payload) return;
    try {
      const response = await updateCommunication(params.id, payload);
      setMessage(response.data);
      setError(null);
    } catch {
      setError('Não foi possível salvar.');
    }
  }

  async function action(kind: 'send' | 'cancel') {
    try {
      const response = kind === 'send' ? await sendCommunication(params.id) : await cancelCommunication(params.id);
      setMessage(response.data);
      await load();
    } catch {
      setError(kind === 'send' ? 'Não foi possível enviar.' : 'Não foi possível cancelar.');
    }
  }

  async function updateRecipient(id: string, kind: 'read' | 'confirm') {
    if (kind === 'read') await markRecipientRead(params.id, id);
    else await confirmRecipient(params.id, id);
    setRecipients((current) => current.map((item) => item.id === id ? { ...item, status: kind === 'read' && item.status === 'CONFIRMED' ? item.status : kind === 'read' ? 'READ' : 'CONFIRMED' } as MessageRecipient : item));
  }

  if (authLoading || !message || !payload) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Carregando comunicado...</span>
        </div>
      </div>
    );
  }

  const draft = message.status === InternalMessageStatus.DRAFT;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar / Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/comunicacao"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Voltar para listagem
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-wide text-white uppercase">{message.title}</h1>
          <p className="text-sm font-semibold text-zinc-400 mt-1">
            Canal/Alvo: {
              message.targetType === 'ALL_ACTIVE_LEGENDARIES' ? 'Toda a Manada' :
              message.targetType === 'TOP_ALL' ? 'Todos de um TOP' :
              message.targetType === 'TOP_REPRESENTATIVES' ? 'Representantes do TOP' :
              message.targetType === 'TOP_FAMILY_REPRESENTATIVES' ? 'Representantes das Famílias do TOP' :
              message.targetType === 'TOP_FAMILY' ? 'Família específica de um TOP' :
              message.targetType === 'TEAM' ? 'Equipe específica' :
              message.targetType === 'TEAM_COORDINATORS' ? 'Coordenadores de Equipe' :
              message.targetType === 'LEGENDARY' ? 'Legendário individual' :
              message.targetType
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft && canSend && (
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500"
              onClick={() => action('send')}
            >
              Enviar Mensagem
            </button>
          )}
          {message.status !== InternalMessageStatus.CANCELLED && canUpdate && (
            <button
              onClick={() => action('cancel')}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-900/30 bg-rose-950/20 px-5 text-xs font-bold uppercase tracking-wider text-rose-400 transition-all hover:bg-rose-950/50 hover:text-rose-300"
            >
              Cancelar Envio
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status do Envio</p>
          <div className="mt-2"><StatusBadge status={message.status} /></div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total de destinatários</p>
          <div className="mt-2 text-2xl font-black text-white">{recipients.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Exige Confirmação</p>
          <div className="mt-2 text-sm font-bold text-zinc-200">
            {message.requiresConfirmation ? 'Sim (Confirmação obrigatória)' : 'Não (Apenas leitura)'}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Message Body / Form Section */}
      <section className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          {draft ? 'Editar Rascunho do Comunicado' : 'Conteúdo do Comunicado'}
        </h2>
        {draft && canUpdate ? (
          <div className="space-y-4">
            <CommunicationForm value={payload} onChange={setPayload} onSubmit={save} />
            <div className="flex justify-end pt-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={save}
                className="flex h-10 items-center justify-center rounded-lg bg-zinc-800 px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-700"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-zinc-950 p-5 border border-zinc-850 font-medium text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {message.body}
          </div>
        )}
      </section>

      {/* Recipients Section */}
      <section className="rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-lg space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-black uppercase">Destinatários e Confirmações</h2>
          <p className="text-xs text-zinc-500 mt-1">Acompanhe quem leu e quem confirmou o comunicado enviado.</p>
        </div>

        <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0B0C]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                  <th className="px-5 py-3">Legendário</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações manuais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {recipients.length ? (
                  recipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-white">
                        {recipient.legendary?.fullName ?? recipient.legendaryId}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={recipient.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdateRecipients && (
                            <>
                              <button
                                className="flex h-7 items-center rounded bg-zinc-800 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700"
                                onClick={() => updateRecipient(recipient.id, 'read')}
                              >
                                Marcar como lido
                              </button>
                              <button
                                className="flex h-7 items-center rounded bg-zinc-800 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700"
                                onClick={() => updateRecipient(recipient.id, 'confirm')}
                              >
                                Marcar como confirmado
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-zinc-500 font-semibold">
                      Nenhum destinatário vinculado a esta mensagem (ela ainda é um rascunho).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
