import { apiClient } from './client';
import { WasteReport, MLInferenceResult } from '../types';

export const reportsApi = {
  getReports: async (params?: { user_id?: string; status?: string; priority?: string }) => {
    const res = await apiClient.get('/reports', { params });
    return res.data as WasteReport[];
  },
  getReportById: async (id: string) => {
    const res = await apiClient.get(`/reports/${id}`);
    return res.data as WasteReport;
  },
  createReport: async (data: { image_base64: string; location_text: string; latitude?: number; longitude?: number }) => {
    const res = await apiClient.post('/reports', data);
    return res.data as { message: string; report: WasteReport; ai_diagnosis: MLInferenceResult };
  },
  approveReport: async (id: string) => {
    const res = await apiClient.post(`/reports/${id}/approve`);
    return res.data;
  },
  rejectReport: async (id: string) => {
    const res = await apiClient.post(`/reports/${id}/reject`);
    return res.data;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await apiClient.patch(`/reports/${id}/status`, { status });
    return res.data;
  },
  deleteReport: async (id: string) => {
    const res = await apiClient.delete(`/reports/${id}`);
    return res.data;
  },
  // Note: deleteReportImage is removed per Task 2 — image deletion no longer supported in UI
};
