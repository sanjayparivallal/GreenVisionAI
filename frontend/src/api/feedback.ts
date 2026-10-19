import { apiClient } from './client';
import { FeedbackTicket } from '../types';

export const feedbackApi = {
  getTickets: async () => {
    const res = await apiClient.get('/feedback');
    return res.data as FeedbackTicket[];
  },
  createTicket: async (data: { subject: string; message: string }) => {
    const res = await apiClient.post('/feedback', data);
    return res.data;
  },
  respondTicket: async (id: string, data: { admin_response: string; status: string }) => {
    const res = await apiClient.post(`/feedback/${id}/respond`, data);
    return res.data;
  }
};
