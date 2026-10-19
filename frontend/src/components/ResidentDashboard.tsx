import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { reportsApi } from '../api/reports';
import { WasteReport, CollectionSchedule, RewardSummary } from '../types';
import { ProgressiveImage } from './ProgressiveImage';
import toast from 'react-hot-toast';
import {
  ScheduleCardSkeleton,
  ReportCardSkeleton,
  StatsWidgetSkeleton,
} from './Skeletons';
import {
  Camera,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles,
  Trash2,
  EyeOff,
} from 'lucide-react';

export const ResidentDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => reportsApi.deleteReport(reportId),
    onSuccess: () => {
      toast.success('Report removed from your view.');
      queryClient.invalidateQueries({ queryKey: ['my-reports'] });
    },
    onError: () => {
      toast.error('Failed to remove report. Please try again.');
    },
  });

  // Query 1: My Reports
  const { data: myReports = [], isLoading: isLoadingReports } = useQuery<WasteReport[]>({
    queryKey: ['my-reports'],
    queryFn: async () => {
      const res = await apiClient.get('/reports');
      return res.data;
    },
  });

  // Query 2: Schedule
  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<CollectionSchedule[]>({
    queryKey: ['collection-schedule'],
    queryFn: async () => {
      const res = await apiClient.get('/schedule');
      return res.data;
    },
  });

  // Query 3: Reward Summary
  const { data: rewards, isLoading: isLoadingRewards } = useQuery<RewardSummary>({
    queryKey: ['reward-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/rewards/summary');
      return res.data;
    },
  });

  // Helper badge color
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'medium':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'rejected':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'in_progress':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'collected':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Resident Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900/60 via-slate-900 to-teal-900/40 border border-emerald-500/20 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Resident Eco Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
              Monitor Waste, Report Overflow &amp; Earn Eco-Rewards
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Snap photos of overflowing bins or hazardous waste in your neighborhood. AI evaluates severity instantly, and municipal teams respond.
            </p>
          </div>

          <Link
            to="/reports/new"
            className="group px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-900/40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <Camera className="w-5 h-5" />
            <span>Report Overflowing Bin</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Rewards & Eco Impact Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {isLoadingRewards ? (
          <>
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
          </>
        ) : (
          <>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Eco Points Balance</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-heading font-black text-emerald-400">
                  {rewards?.total_points || 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">pts</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                <span>Earned: {rewards?.earned_points || 0} pts</span>
                <Link to="/rewards" className="text-emerald-400 hover:underline font-bold">
                  Redeem Rewards &rarr;
                </Link>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Pending Admin Approvals</span>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-heading font-black text-amber-400">
                  {rewards?.pending_reports_count || 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">reports</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-[11px] text-amber-300 font-medium">
                Est. ~{rewards?.estimated_pending_points || 0} potential points awaiting review
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-teal-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Neighborhood Impact</span>
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-heading font-black text-teal-300">
                  {myReports.length}
                </span>
                <span className="text-xs text-slate-400 font-semibold">total submissions</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-[11px] text-slate-400">
                Active resident contributor in your sector
              </div>
            </div>
          </>
        )}
      </section>

      {/* Main Grid: My Reports & Collection Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reports Feed (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-heading font-bold text-slate-100 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                My Waste Monitoring Reports
              </h2>
              <p className="text-xs text-slate-400">Real-time status of your neighborhood reports</p>
            </div>
            <Link
              to="/reports/new"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              + New Report
            </Link>
          </div>

          {isLoadingReports ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReportCardSkeleton />
              <ReportCardSkeleton />
            </div>
          ) : myReports.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">No Waste Reports Submitted Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Notice an overflowing bin or uncollected waste in your area? Capture an image to notify municipal operators and earn reward points!
              </p>
              <Link
                to="/reports/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:brightness-110"
              >
                <Camera className="w-4 h-4" /> Capture First Report
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg hover:border-slate-600 transition-colors flex flex-col"
                >
                  <ProgressiveImage
                    src={report.image_base64}
                    alt={report.location_text}
                    aspectRatio="aspect-video"
                  />

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getPriorityBadge(
                            report.priority_level
                          )}`}
                        >
                          {report.priority_level} priority
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(
                              report.status
                            )}`}
                          >
                            {report.status.replace('_', ' ')}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Remove this report from your view? (Municipal admins will still see it.)')) {
                                deleteReportMutation.mutate(report.id);
                              }
                            }}
                            className="p-1 rounded-lg bg-slate-700/60 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-600 hover:border-rose-500/30 transition-colors"
                            title="Remove from my view"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 text-xs text-slate-200 font-semibold line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{report.location_text}</span>
                      </div>

                      <p className="text-[11px] text-slate-300 line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <span className="font-semibold text-emerald-400">AI Action: </span>
                        {report.recommended_action}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Waste: <strong className="text-slate-200 capitalize">{report.waste_type}</strong></span>
                      <span className="text-amber-300 font-bold">
                        {report.status === 'approved'
                          ? `+${Math.round(report.environmental_impact_score)} pts`
                          : 'Awaiting approval'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collection Schedule Side Panel (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-400" />
              Collection Schedule
            </h2>
            <Link to="/schedule" className="text-xs font-bold text-teal-400 hover:underline">
              View All
            </Link>
          </div>

          {isLoadingSchedules ? (
            <div className="space-y-3">
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.slice(0, 4).map((sched) => (
                <div
                  key={sched.id}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 shadow-lg space-y-2 hover:border-teal-500/30 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{sched.zone_name}</h4>
                      <p className="text-[11px] text-teal-400 font-medium">{sched.waste_type}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        sched.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : sched.status === 'delayed'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}
                    >
                      {sched.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {sched.collection_date}
                    </span>
                    <span className="text-slate-400 text-[10px]">Zone Sector</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
