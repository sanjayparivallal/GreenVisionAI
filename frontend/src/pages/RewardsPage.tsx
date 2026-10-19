import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { RewardSummary, RewardTransaction } from '../types';
import { StatsWidgetSkeleton } from '../components/Skeletons';
import toast from 'react-hot-toast';
import {
  Award,
  Gift,
  Clock,
  TrendingUp,
  CheckCircle2,
  Ticket,
  Bus,
  ShoppingBag,
  Zap,
  TreePine,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export const RewardsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // 1. Reward Summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery<RewardSummary>({
    queryKey: ['reward-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/rewards/summary');
      return res.data;
    },
  });

  // 2. Transaction Ledger
  const { data: history = [], isLoading: isLoadingHistory } = useQuery<RewardTransaction[]>({
    queryKey: ['reward-history'],
    queryFn: async () => {
      const res = await apiClient.get('/rewards/history');
      return res.data;
    },
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async ({ title, pts }: { title: string; pts: number }) => {
      const res = await apiClient.post('/rewards/redeem', {
        reward_title: title,
        points_required: pts,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Reward redeemed successfully!');
      queryClient.invalidateQueries({ queryKey: ['reward-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reward-history'] });
    },
  });

  const catalog = [
    {
      title: '$5 Public Transit Bus Pass',
      pts: 50,
      icon: Bus,
      color: 'from-cyan-500 to-blue-500',
      description: 'Valid for all city metro buses and light rail lines',
    },
    {
      title: '$10 Eco Grocery Market Voucher',
      pts: 90,
      icon: ShoppingBag,
      color: 'from-emerald-500 to-teal-500',
      description: 'Redeemable at participating local organic grocers',
    },
    {
      title: 'Municipal Utility Bill Rebate ($20)',
      pts: 150,
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
      description: 'Applied directly to your next municipal water/power statement',
    },
    {
      title: 'Plant-A-Tree Certificate',
      pts: 30,
      icon: TreePine,
      color: 'from-emerald-600 to-green-500',
      description: 'Plants a native urban tree in Sector 4 greenbelt',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> Resident Eco-Rewards Marketplace
            </span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-white">Earn Points for Clean Neighborhoods</h1>
          <p className="text-xs text-slate-300">
            Submit reports &bull; Admin verifies & approves &bull; Redeem points for civic vouchers and transit passes
          </p>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/40 px-6 py-4 rounded-2xl text-right">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Current Balance
          </span>
          <div className="text-3xl font-heading font-black text-amber-400">
            {summary?.total_points || 0} <span className="text-xs font-bold text-slate-300">PTS</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {isLoadingSummary ? (
          <>
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
          </>
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400">Lifetime Points Earned</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{summary?.earned_points || 0} pts</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400">Points Redeemed</div>
              <div className="text-2xl font-black text-slate-300 mt-1">{summary?.redeemed_points || 0} pts</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400">Pending Approval Potential</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                ~{summary?.estimated_pending_points || 0} pts
              </div>
            </div>
          </>
        )}
      </section>

      {/* Catalog Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-extrabold text-white flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-400" />
          Redeem Eco Rewards Catalog
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {catalog.map((item) => {
            const Icon = item.icon;
            const canAfford = (summary?.total_points || 0) >= item.pts;

            return (
              <div
                key={item.title}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
              >
                <div className="space-y-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-slate-950 font-bold shadow-lg`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Required:</span>
                    <span className="text-amber-400">{item.pts} PTS</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => redeemMutation.mutate({ title: item.title, pts: item.pts })}
                    disabled={!canAfford || redeemMutation.isPending}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md hover:brightness-110'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Redeem Voucher' : 'Insufficient Points'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ledger History Table */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
          <Ticket className="w-5 h-5 text-teal-400" />
          Rewards Transaction Ledger
        </h3>

        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 rounded-2xl">
            No transaction records found yet. Submit waste reports to start earning points!
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {history.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      tx.type === 'earned' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {tx.type === 'earned' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{tx.description}</p>
                    <p className="text-[10px] text-slate-400">Transaction ID: {tx.id}</p>
                  </div>
                </div>

                <div
                  className={`text-xs font-extrabold ${
                    tx.type === 'earned' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {tx.type === 'earned' ? `+${tx.points} pts` : `-${tx.points} pts`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
