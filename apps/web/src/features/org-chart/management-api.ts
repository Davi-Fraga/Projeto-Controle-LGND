import { api } from '@/lib/api';

// Mover pessoa entre gestores dentro da subdivisão (Fase 3). Reusa os endpoints
// do módulo `management`, que validam teto de 10, ciclo, escopo e auditam.
// `leaderId: null` = voltar para "sem gestor".

export function assignCityLeader(legendaryId: string, leaderId: string | null) {
  return api(`/management/city/assign-leader`, {
    method: 'POST',
    body: JSON.stringify({ legendaryId, leaderId }),
  });
}

export function assignTeamManager(membershipId: string, managerMembershipId: string | null) {
  return api(`/management/team/assign-manager`, {
    method: 'POST',
    body: JSON.stringify({ membershipId, managerMembershipId }),
  });
}
