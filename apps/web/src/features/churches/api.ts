import { api } from '@/lib/api';
import type { Church } from '@central-da-manada/shared';

export type { Church };

export type ChurchesResponse = { data: Church[] };
export type ChurchResponse = { data: Church };

export type ChurchPayload = {
  name: string;
  city?: string | null;
  address?: string | null;
  spiritualLeaderName?: string | null;
  spiritualLeaderPhone?: string | null;
  spiritualLeaderUserId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export function getChurches(search?: string) {
  const term = search?.trim();
  const query = term ? `?search=${encodeURIComponent(term)}` : '';
  return api<ChurchesResponse>(`/churches${query}`);
}

export function createChurch(payload: ChurchPayload) {
  return api<ChurchResponse>('/churches', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateChurch(id: string, payload: ChurchPayload) {
  return api<ChurchResponse>(`/churches/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export type ChurchMember = {
  id: string;
  fullName: string;
  lgndNumber: string | null;
  city: string | null;
  phone: string | null;
  status: string;
};

export type ChurchDetail = Church & { legendarios: ChurchMember[] };

export function getChurch(id: string) {
  return api<{ data: ChurchDetail }>(`/churches/${id}`);
}

export function deleteChurch(id: string) {
  return api<{ data: Church }>(`/churches/${id}`, { method: 'DELETE' });
}

export type GeocodePrecision = 'address' | 'name' | 'city';
export type GeocodeResult = { lat: number; lng: number; displayName: string; precision: GeocodePrecision };
export type GeocodeResponse = { data: GeocodeResult | null };

export function geocodeChurch(params: { city: string; name?: string; address?: string }) {
  const query = new URLSearchParams({ city: params.city });
  if (params.name?.trim()) query.set('name', params.name.trim());
  if (params.address?.trim()) query.set('address', params.address.trim());
  return api<GeocodeResponse>(`/churches/geocode?${query.toString()}`);
}
