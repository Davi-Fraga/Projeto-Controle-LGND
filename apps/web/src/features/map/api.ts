import { api } from '@/lib/api';

export type MapChurch = {
  id: string;
  name: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
};

export type MapData = {
  summary: { total: number; cities: number; churches: number };
  byCity: { city: string; count: number }[];
  churches: MapChurch[];
};

export async function getMapData(): Promise<MapData> {
  const response = await api<{ data: MapData }>('/map/rota-do-cerrado');
  return response.data;
}
