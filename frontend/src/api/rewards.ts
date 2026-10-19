import { apiClient } from './client';
import { RewardSummary, RewardTransaction } from '../types';

export const rewardsApi = {
  getSummary: async () => {
    const res = await apiClient.get('/rewards/summary');
    return res.data as RewardSummary;
  },
  getHistory: async () => {
    const res = await apiClient.get('/rewards/history');
    return res.data as RewardTransaction[];
  },
  redeemReward: async (data: { reward_title: string; points_required: number }) => {
    const res = await apiClient.post('/rewards/redeem', data);
    return res.data;
  }
};
