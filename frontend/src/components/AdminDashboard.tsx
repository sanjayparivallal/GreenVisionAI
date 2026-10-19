import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { organicApi } from '../api/organic';
import { WasteReport, CollectionSchedule, OrganicWasteRecord, FeedbackTicket } from '../types';
import { ProgressiveImage } from './ProgressiveImage';
import { TableRowSkeleton, StatsWidgetSkeleton } from './Skeletons';
import toast from 'react-hot-toast';
import { reportsApi } from '../api/reports';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Award,
  Calendar,
  Sprout,
  MessageSquare,
  AlertOctagon,
  ChevronDown,
  ExternalLink,
  Trash2,
  EyeOff,
  Plus,
  Search,
  Truck,
  X,
  Building2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 1. All Reports
  const { data: reports = [], isLoading: isLoadingReports, refetch: refetchReports } = useQuery<WasteReport[]>({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const res = await apiClient.get('/reports');
      return res.data;
    },
  });

  // 2. Schedules
  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<CollectionSchedule[]>({
    queryKey: ['admin-schedule'],
    queryFn: async () => {
      const res = await apiClient.get('/schedule');
      return res.data;
    },
  });

  // 3. Organic Records
  const { data: organicRecords = [], isLoading: isLoadingOrganic } = useQuery<OrganicWasteRecord[]>({
    queryKey: ['admin-organic'],
    queryFn: async () => {
      const res = await apiClient.get('/organic');
      return res.data;
    },
  });

  // 4. Feedback
  const { data: feedbackTickets = [], isLoading: isLoadingFeedback } = useQuery<FeedbackTicket[]>({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const res = await apiClient.get('/feedback');
      return res.data;
    },
  });

  // Mutations for Approve / Reject / Status Change
  const approveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiClient.post(`/reports/${reportId}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Report approved and reward points awarded!');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiClient.post(`/reports/${reportId}/reject`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Report rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiClient.patch(`/reports/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Report status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  // Soft-delete: hides report from admin view (resident still sees it)
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => reportsApi.deleteReport(reportId),
    onSuccess: () => {
      toast.success('Report hidden from admin view. Resident can still see it.');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: () => {
      toast.error('Failed to hide report. Please try again.');
    },
  });

  // Organic Log Management state & mutations
  const [isAddOrganicOpen, setIsAddOrganicOpen] = useState(false);
  const [organicSearch, setOrganicSearch] = useState('');
  const [organicFilterStatus, setOrganicFilterStatus] = useState('all');
  const [newFarmName, setNewFarmName] = useState('');
  const [newKg, setNewKg] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStatus, setNewStatus] = useState('completed');

  const createOrganicMutation = useMutation({
    mutationFn: (data: { quantity_kg: number; distributed_to: string; distribution_date: string; status: string }) =>
      organicApi.createRecord(data),
    onSuccess: () => {
      toast.success('Organic farm distribution record logged successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-organic'] });
      setIsAddOrganicOpen(false);
      setNewFarmName('');
      setNewKg('');
    },
    onError: () => {
      toast.error('Failed to log distribution record.');
    },
  });

  const updateOrganicStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      organicApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Organic distribution status updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-organic'] });
    },
    onError: () => {
      toast.error('Failed to update status.');
    },
  });

  const [searchReport, setSearchReport] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const filteredOrganicRecords = organicRecords.filter((org) => {
    const matchesSearch = org.distributed_to.toLowerCase().includes(organicSearch.toLowerCase());
    const matchesStatus = organicFilterStatus === 'all' || org.status.toLowerCase() === organicFilterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Priority sorting (critical -> high -> medium -> low)
  const priorityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  
  const filteredReports = reports
    .filter((r) => filterPriority === 'all' || r.priority_level === filterPriority)
    .filter((r) => filterStatus === 'all' || r.status === filterStatus)
    .filter((r) => {
      if (!searchReport.trim()) return true;
      const q = searchReport.toLowerCase();
      return (
        r.location_text?.toLowerCase().includes(q) ||
        r.reporter_name?.toLowerCase().includes(q) ||
        r.reporter_email?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (priorityRank[b.priority_level] || 0) - (priorityRank[a.priority_level] || 0));

  const criticalCount = reports.filter((r) => r.priority_level === 'critical' && r.status !== 'collected').length;
  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const totalOrganicKg = organicRecords.reduce((sum, o) => sum + (Number(o.quantity_kg) || 0), 0);

  return (
    <div className="space-y-8">
      {/* Admin Operations Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-cyan-500/30 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-cyan-400" /> Municipal Operations Command
            </span>
            <span className="text-xs text-slate-400">GreenVision AI Admin Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
            Waste Dispatch, Report Validation &amp; Reward Verification
          </h1>
          <p className="text-xs md:text-sm text-slate-300">
            Priority-sorted residential reports, AI severity verification, and automated point allocation upon municipal approval.
          </p>
        </div>

        <button
          onClick={() => refetchReports()}
          className="px-4 py-2.5 rounded-xl bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:bg-slate-700 font-bold text-xs flex items-center gap-2 shadow-lg"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Dispatch Feed
        </button>
      </div>

      {/* Municipal Stats Header */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingReports ? (
          <>
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
          </>
        ) : (
          <>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400">Critical Priority Alerts</span>
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-heading font-black text-rose-400">{criticalCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Requires immediate municipal vehicle dispatch</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400">Pending Review Queue</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-heading font-black text-amber-400">{pendingCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Awaiting approval to release eco-reward points</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400">Organic Compost Recovered</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sprout className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-heading font-black text-emerald-400">{totalOrganicKg.toFixed(1)} kg</div>
              <p className="text-[11px] text-slate-400 mt-1">Distributed to local partner organic farms</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400">Total System Reports</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-heading font-black text-cyan-300">{reports.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Processed across municipal sectors</p>
            </div>
          </>
        )}
      </section>

      {/* Main Reports Management Queue */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              Priority Waste Dispatch Feed
            </h2>
            <p className="text-xs text-slate-400">Reports automatically ranked by AI severity score (Critical &rarr; Low)</p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search location or reporter..."
                value={searchReport}
                onChange={(e) => setSearchReport(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48 sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-semibold">Priority:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 outline-none"
              >
                <option value="all" className="bg-slate-800">All</option>
                <option value="critical" className="bg-slate-800">Critical</option>
                <option value="high" className="bg-slate-800">High</option>
                <option value="medium" className="bg-slate-800">Medium</option>
                <option value="low" className="bg-slate-800">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-semibold">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 outline-none"
              >
                <option value="all" className="bg-slate-800">All</option>
                <option value="pending" className="bg-slate-800">Pending Review</option>
                <option value="approved" className="bg-slate-800">Approved</option>
                <option value="in_progress" className="bg-slate-800">In Progress</option>
                <option value="collected" className="bg-slate-800">Collected</option>
                <option value="rejected" className="bg-slate-800">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table / Cards */}
        {isLoadingReports ? (
          <div className="space-y-3">
            <StatsWidgetSkeleton />
            <StatsWidgetSkeleton />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No reports match current filter criteria</h4>
            <p className="text-xs text-slate-400">All municipal dispatch tickets in this category are clear.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className={`bg-slate-800/50 border rounded-2xl p-5 shadow-xl transition-all ${
                  report.priority_level === 'critical'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-slate-700/60'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Photo Thumbnail with Lightbox */}
                  <div
                    className="w-full lg:w-48 h-36 shrink-0 rounded-xl overflow-hidden border border-slate-700 cursor-pointer group relative"
                    onClick={() => setLightboxImage(report.image_base64)}
                    title="Click to expand photo"
                  >
                    <ProgressiveImage src={report.image_base64} alt={report.location_text} aspectRatio="aspect-video" />
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[11px] font-bold text-cyan-300">
                      Click to Expand 🔍
                    </div>
                  </div>

                  {/* Report Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase border ${
                            report.priority_level === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : report.priority_level === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          {report.priority_level} Priority
                        </span>

                        <span className="text-xs font-bold text-slate-300 capitalize px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                          {report.waste_type} Waste
                        </span>

                        <span className="text-xs font-medium text-slate-400">
                          Fill: <strong className="text-slate-200 capitalize">{report.fill_level}</strong>
                        </span>

                        {report.estimated_waste_kg !== undefined && (
                          <span className="text-xs font-medium text-slate-400">
                            Est. Weight: <strong className="text-cyan-300 font-bold">{Number(report.estimated_waste_kg).toFixed(1)} kg</strong>
                          </span>
                        )}

                        {(report.reporter_name || report.reporter_email) && (
                          <span className="text-xs text-slate-400">
                            Reporter: <strong className="text-emerald-400">{report.reporter_name || 'Resident'}</strong> {report.reporter_email && <span className="text-slate-500">({report.reporter_email})</span>}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          Severity Score: <strong className="text-amber-400 font-bold">{Number(report.severity_score).toFixed(1)}/10</strong>
                        </span>
                        <span className="text-xs text-slate-400">
                          Impact: <strong className="text-emerald-400 font-bold">{Number(report.environmental_impact_score).toFixed(1)}/100</strong>
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{report.location_text}</h4>
                      <p className="text-xs text-slate-300 mt-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <strong className="text-cyan-400">AI Municipal Recommendation: </strong>
                        {report.recommended_action}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          Report ID: <code className="text-slate-300">{report.id}</code>
                        </span>
                        <span className="text-xs text-slate-400">
                          Status:{' '}
                          <span className="font-bold text-slate-200 capitalize">{report.status.replace('_', ' ')}</span>
                        </span>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2">
                        {/* Soft-delete: hides from admin view only */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Hide this report from the admin view? The resident will still see it.')) {
                              deleteReportMutation.mutate(report.id);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-700/60 text-slate-400 border border-slate-600 hover:bg-slate-700 hover:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Hide from admin view"
                        >
                          <EyeOff className="w-3.5 h-3.5" /> Hide
                        </button>

                        {report.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate(report.id)}
                              disabled={approveMutation.isPending}
                              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-900/30 hover:brightness-110 flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve &amp; Award Points
                            </button>

                            <button
                              type="button"
                              onClick={() => rejectMutation.mutate(report.id)}
                              disabled={rejectMutation.isPending}
                              className="px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-xs flex items-center gap-1 transition-all"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          </>
                        )}

                        {report.status !== 'pending' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Update Status:</span>
                            <select
                              value={report.status}
                              onChange={(e) => statusMutation.mutate({ id: report.id, status: e.target.value })}
                              className="bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl outline-none"
                            >
                              <option value="approved">Approved</option>
                              <option value="in_progress">In Progress</option>
                              <option value="collected">Collected</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Grid: Schedule & Organic Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Schedule Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-400" />
              Municipal Collection Schedules
            </h3>
            <span className="text-xs text-slate-400">{schedules.length} Active Zones</span>
          </div>

          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-200">{s.zone_name}</h5>
                  <p className="text-[11px] text-teal-400">{s.waste_type} &bull; {s.collection_date}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 capitalize">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Organic Compost & Farm Distribution Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-heading font-bold text-slate-100">
                  Organic Waste &amp; Farm Distribution Log
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track compost recovery and agricultural partner allocations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                {totalOrganicKg} kg total
              </span>
              <button
                onClick={() => setIsAddOrganicOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Log Transfer
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search farm or recipient..."
                value={organicSearch}
                onChange={(e) => setOrganicSearch(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <select
              value={organicFilterStatus}
              onChange={(e) => setOrganicFilterStatus(e.target.value)}
              className="bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_transit">In Transit</option>
              <option value="scheduled">Scheduled</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Distribution Records List */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {isLoadingOrganic ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading distribution log...</p>
            ) : filteredOrganicRecords.length === 0 ? (
              <div className="p-6 text-center bg-slate-800/30 rounded-2xl border border-slate-800">
                <Sprout className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No distribution records found.</p>
              </div>
            ) : (
              filteredOrganicRecords.map((org) => {
                const statusColor =
                  org.status.toLowerCase() === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : org.status.toLowerCase() === 'in_transit'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';

                return (
                  <div
                    key={org.id}
                    className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-100">{org.distributed_to}</h5>
                          <span className="text-[10px] text-slate-400">Date: {org.distribution_date}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        {org.quantity_kg} kg
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize flex items-center gap-1 ${statusColor}`}>
                          {org.status.toLowerCase() === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {org.status.toLowerCase() === 'in_transit' && <Truck className="w-3 h-3" />}
                          {org.status.toLowerCase() !== 'completed' && org.status.toLowerCase() !== 'in_transit' && <Clock className="w-3 h-3" />}
                          {org.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Status:</span>
                        <select
                          value={org.status}
                          onChange={(e) =>
                            updateOrganicStatusMutation.mutate({ id: org.id, status: e.target.value })
                          }
                          className="bg-slate-800 text-[11px] font-bold text-slate-200 border border-slate-700 px-2 py-1 rounded-lg outline-none cursor-pointer focus:border-emerald-500"
                        >
                          <option value="completed">Completed</option>
                          <option value="in_transit">In Transit</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Log New Organic Farm Distribution Modal */}
      {isAddOrganicOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sprout className="w-4 h-4" />
                </div>
                <h3 className="text-base font-heading font-bold text-white">Log Organic Farm Distribution</h3>
              </div>
              <button
                onClick={() => setIsAddOrganicOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newFarmName.trim()) {
                  toast.error('Please specify recipient farm or partner name.');
                  return;
                }
                const kgVal = parseFloat(newKg);
                if (isNaN(kgVal) || kgVal <= 0) {
                  toast.error('Please enter a valid quantity in kg.');
                  return;
                }
                createOrganicMutation.mutate({
                  distributed_to: newFarmName.trim(),
                  quantity_kg: kgVal,
                  distribution_date: newDate,
                  status: newStatus,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Recipient Farm / Agricultural Partner
                </label>
                <input
                  type="text"
                  placeholder="e.g. Green Valley Agro Farm #4"
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 250"
                    value={newKg}
                    onChange={(e) => setNewKg(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Distribution Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Transfer Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="completed">Completed (Delivered)</option>
                  <option value="in_transit">In Transit</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="pending">Pending Approval</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOrganicOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrganicMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {createOrganicMutation.isPending ? 'Saving...' : 'Record Distribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 z-10 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage.startsWith('data:') ? lightboxImage : `data:image/jpeg;base64,${lightboxImage}`}
              alt="Full resolution waste inspection"
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
