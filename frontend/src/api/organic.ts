import { apiClient } from './client';
import { OrganicWasteRecord, OrganicWasteListing, OrganicWasteRequest } from '../types';

export const organicApi = {
  getRecords: async () => {
    const res = await apiClient.get('/organic');
    return res.data as OrganicWasteRecord[];
  },
  createRecord: async (data: { report_id?: string; quantity_kg: number; distributed_to: string; distribution_date: string; status?: string }) => {
    const res = await apiClient.post('/organic', data);
    return res.data;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await apiClient.patch(`/organic/${id}`, { status });
    return res.data;
  },
  getListings: async (status?: string) => {
    const res = await apiClient.get('/organic/listings', { params: { status } });
    return res.data as OrganicWasteListing[];
  },
  createListing: async (data: {
    total_kg: number;
    description: string;
    waste_type?: string;
    pickup_location?: string;
    available_until?: string;
    image_base64?: string;
  }) => {
    const res = await apiClient.post('/organic/listings', data);
    return res.data;
  },
  // Marketplace request endpoints
  getRequests: async () => {
    const res = await apiClient.get('/organic/requests');
    return res.data as OrganicWasteRequest[];
  },
  createRequest: async (listingId: string, data: { requested_kg: number; contact_info: string }) => {
    const res = await apiClient.post(`/organic/listings/${listingId}/request`, data);
    return res.data;
  },
  updateRequestStatus: async (requestId: string, data: { status: 'approved' | 'rejected' | 'completed'; admin_note?: string }) => {
    const res = await apiClient.patch(`/organic/requests/${requestId}`, data);
    return res.data;
  },
};
