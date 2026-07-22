import { api } from '@/lib/api';

export type SpiritualLeaderChurch = {
  id: string;
  name: string;
  city: string | null;
  spiritualLeaderName: string | null;
  spiritualLeaderPhone: string | null;
  spiritualLeaderUserId: string | null;
  spiritualLeader: { id: string; name: string; email: string } | null;
  spiritualLeaderLegendaryId: string | null;
  spiritualLeaderLegendary: { id: string; fullName: string } | null;
  spiritualLeaderEffectiveName: string | null;
  latitude: number | null;
  longitude: number | null;
  _count: { legendarios: number };
};

export async function getSpiritualLeaderChurches(search?: string): Promise<SpiritualLeaderChurch[]> {
  const term = search?.trim();
  const query = term ? `?search=${encodeURIComponent(term)}` : '';
  const response = await api<{ data: SpiritualLeaderChurch[] }>(`/churches/spiritual-leaders${query}`);
  return response.data;
}
