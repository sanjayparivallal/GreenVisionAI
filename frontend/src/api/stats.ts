import { apiClient } from './client';

export interface PlatformTotals {
  overflows_addressed: number;
  organic_kg_total: number;
  total_points_issued: number;
  sla_compliance_pct: number | null;
}

export const statsApi = {
  getPlatformTotals: async (): Promise<PlatformTotals> => {
    const res = await apiClient.get('/stats/platform');
    return res.data;
  },
  getImpactSummary: async () => {
    const res = await apiClient.get('/stats/impact');
    return res.data;
  },
  getDailyStats: async () => {
    const res = await apiClient.get('/stats/daily');
    return res.data;
  },
  getZonePerformance: async () => {
    const res = await apiClient.get('/stats/zones');
    return res.data;
  },
};
