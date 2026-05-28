import { getApiUrl, getAuthHeaders } from '@/lib/api';
import { api } from '@/lib/api';

export const getLegendariosReport = () => api<any>('/reports/legendarios?perPage=20');
export const getByCityReport = () => api<{ data: Array<{ value: string; count: number }> }>('/reports/legendarios/by-city');
export const getByChurchReport = () => api<{ data: any[] }>('/reports/legendarios/by-church');
export const getByTeamReport = () => api<{ data: any[] }>('/reports/legendarios/by-team');
export const getByProfessionReport = () => api<{ data: any[] }>('/reports/legendarios/by-profession');
export const getByExpertiseReport = () => api<{ data: any[] }>('/reports/legendarios/by-expertise');
export const getSocialInterestedReport = () => api<{ data: any[] }>('/reports/legendarios/social-interested');
export const getTopParticipantsReport = (topId: string) => api<{ data: any[] }>(`/reports/tops/${topId}/participants`);
export const getTopServantsReport = (topId: string) => api<{ data: any[] }>(`/reports/tops/${topId}/servants`);
export const getTopFamiliesReport = (topId: string) => api<{ data: any[] }>(`/reports/tops/${topId}/families`);
export const getSocialActionParticipantsReport = (id: string) => api<{ data: any[] }>(`/reports/social-actions/${id}/participants`);

export async function downloadCsv(path: string, filename: string) {
  const response = await fetch(getApiUrl(path), { headers: getAuthHeaders(), credentials: 'include' });
  if (!response.ok) throw new Error('Falha ao exportar CSV.');
  const blob = await response.blob();
  const href = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(href);
}
