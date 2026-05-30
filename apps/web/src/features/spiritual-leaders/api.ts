import { api } from '@/lib/api';

export type SpiritualLeaderChurch = {
  id: string;
  name: string;
  city: string | null;
  spiritualLeaderName: string | null;
  spiritualLeaderPhone: string | null;
  spiritualLeaderUserId: string | null;
  spiritualLeader: { id: string; name: string; email: string } | null;
  latitude: number | null;
  longitude: number | null;
  _count: { legendarios: number };
};

export async function getSpiritualLeaderChurches(): Promise<SpiritualLeaderChurch[]> {
  const response = await api<{ data: SpiritualLeaderChurch[] }>('/churches/spiritual-leaders');
  return response.data;
}
