import { apiClient } from './client';
import { CollectionSchedule } from '../types';

export const scheduleApi = {
  getSchedules: async () => {
    const res = await apiClient.get('/schedule');
    return res.data as CollectionSchedule[];
  },
  createSchedule: async (data: { zone_name: string; waste_type: string; collection_date: string; status?: string }) => {
    const res = await apiClient.post('/schedule', data);
    return res.data;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await apiClient.patch(`/schedule/${id}`, { status });
    return res.data;
  },
  deleteSchedule: async (id: string) => {
    const res = await apiClient.delete(`/schedule/${id}`);
    return res.data;
  }
};
