import { apiClient } from './client';
import { User } from '../types';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  signupResident: async (data: any) => {
    const res = await apiClient.post('/auth/signup/resident', data);
    return res.data;
  },
  signupAdmin: async (data: any) => {
    const res = await apiClient.post('/auth/signup/admin', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data: {
    name?: string;
    phone?: string;
    address?: string;
    profile_image?: string;
  }): Promise<User> => {
    const res = await apiClient.patch('/auth/me', data);
    return res.data;
  },
};
