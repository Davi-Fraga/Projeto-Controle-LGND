'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, User, X } from 'lucide-react';
import { formatPhone } from '@central-da-manada/shared';
import { getChurch, type ChurchDetail } from './api';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  AWAY: 'Afastado',
  VISITOR: 'Visitante',
  UNKNOWN: '—',
};

export function ChurchDetailModal({ churchId, onClose }: { churchId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<ChurchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!churchId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(false);
    getChurch(churchId)
      .then((response) => setDetail(response.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [churchId]);

  if (!churchId) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-black uppercase tracking-wide text-white">{detail?.name ?? 'Igreja'}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 transition-colors hover:text-zinc-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm font-semibold text-rose-400">Não foi possível carregar os detalhes da igreja.</p>
          ) : detail ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Info label="Cidade" value={detail.city} icon={<MapPin className="h-3.5 w-3.5 text-zinc-500" />} />
                <Info label="Líder espiritual" value={detail.spiritualLeaderName} icon={<User className="h-3.5 w-3.5 text-zinc-500" />} />
                <Info label="Telefone do líder" value={formatPhone(detail.spiritualLeaderPhone)} icon={<Phone className="h-3.5 w-3.5 text-zinc-500" />} />
                <Info
                  label="Coordenadas"
                  value={detail.latitude != null && detail.longitude != null ? `${detail.latitude}, ${detail.longitude}` : null}
                />
                {detail.notes ? <Info label="Observações" value={detail.notes} className="sm:col-span-2" /> : null}
              </dl>

              <div className="mt-5 border-t border-zinc-800 pt-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
                    Legendários vinculados
                  </span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-300">
                    {detail.legendarios.length}
                  </span>
                </div>
                {detail.legendarios.length === 0 ? (
                  <p className="py-3 text-sm text-zinc-500">Nenhum Legendário vinculado a esta igreja.</p>
                ) : (
                  <ul className="divide-y divide-zinc-850 rounded-lg border border-zinc-800">
                    {detail.legendarios.map((member) => (
                      <li key={member.id} className="flex items-center justify-between px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{member.fullName}</p>
                          <p className="text-[11px] text-zinc-500">
                            {[member.city, member.lgndNumber ? `LGND ${member.lgndNumber}` : null].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          {STATUS_LABELS[member.status] ?? member.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon, className }: { label: string; value?: string | null; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-200">
        {value ? (
          <>
            {icon}
            {value}
          </>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </dd>
    </div>
  );
}
