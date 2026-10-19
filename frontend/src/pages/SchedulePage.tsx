import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { CollectionSchedule } from '../types';
import { ScheduleCardSkeleton } from '../components/Skeletons';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  BellRing,
  Filter,
} from 'lucide-react';

// Format collection_date (TEXT or TIMESTAMPTZ) with relative labels
const formatScheduleDate = (raw: string): { formatted: string; relative: string | null; isOverdue: boolean } => {
  let date: Date | null = null;
  try {
    date = new Date(raw);
    if (isNaN(date.getTime())) date = null;
  } catch { date = null; }

  if (!date) return { formatted: raw, relative: null, isOverdue: false };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const formatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);

  let relative: string | null = null;
  if (diffDays === 0) relative = 'Today';
  else if (diffDays === 1) relative = 'Tomorrow';
  else if (diffDays === -1) relative = 'Yesterday';
  else if (diffDays < 0) relative = `${Math.abs(diffDays)} days ago`;
  else if (diffDays <= 7) relative = `In ${diffDays} days`;

  return { formatted, relative, isOverdue: diffDays < 0 };
};

export const SchedulePage: React.FC = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form for admin add
  const [zoneName, setZoneName] = useState('');
  const [wasteType, setWasteType] = useState('Organic & Compost');
  const [collectionDate, setCollectionDate] = useState('');

  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery<CollectionSchedule[]>({
    queryKey: ['collection-schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/schedule');
      return res.data;
    },
  });

  // Admin add schedule mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/schedule', {
        zone_name: zoneName,
        waste_type: wasteType,
        collection_date: collectionDate,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Collection schedule entry added');
      queryClient.invalidateQueries({ queryKey: ['collection-schedules'] });
      setShowAddModal(false);
      setZoneName('');
      setCollectionDate('');
    },
  });

  // Admin delete schedule
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/schedule/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Schedule entry removed');
      queryClient.invalidateQueries({ queryKey: ['collection-schedules'] });
    },
  });

  const zones = Array.from(new Set(schedules.map((s) => s.zone_name)));
  const filtered = schedules.filter((s) => selectedZone === 'all' || s.zone_name === selectedZone);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" /> Municipal Logistics Timeline
            </span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-white">Residential Waste Collection Schedule</h1>
          <p className="text-xs text-slate-400">
            Sector-wise truck routes, organic compost pickup, and hazardous waste collection times
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg hover:brightness-110 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Schedule Entry
          </button>
        )}
      </div>

      {/* Zone Selector Filter */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-teal-400" /> Filter by Municipal Zone:
        </div>

        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold outline-none"
        >
          <option value="all">All Zones ({schedules.length})</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>

      {/* Schedules List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ScheduleCardSkeleton />
          <ScheduleCardSkeleton />
          <ScheduleCardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/40 border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-400">No collection schedules found for this zone.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sched) => (
            <div
              key={sched.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-teal-500/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-400" />
                    {sched.zone_name}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
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

                <div>
                  <h4 className="text-sm font-bold text-teal-300">{sched.waste_type}</h4>
                  {(() => {
                    const { formatted, relative, isOverdue } = formatScheduleDate(sched.collection_date);
                    return (
                      <div className="mt-1">
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formatted}
                        </p>
                        {relative && (
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-300'
                              : relative === 'Today'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : relative === 'Tomorrow'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-700/40 text-slate-400'
                          }`}>
                            {isOverdue ? '⚠ Overdue: ' : ''}{relative}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toast.success(`SMS Reminder set for ${sched.zone_name}`)}
                  className="text-[11px] font-bold text-slate-300 hover:text-emerald-400 flex items-center gap-1"
                >
                  <BellRing className="w-3.5 h-3.5 text-emerald-400" /> Set Pickup Reminder
                </button>

                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(sched.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-heading font-extrabold text-white">Create Collection Entry</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Zone / Sector Name</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="Zone 5 - North Hills"
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Waste Stream Category</label>
                <select
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100"
                >
                  <option value="Organic & Compost">Organic & Compost</option>
                  <option value="Recyclables (Paper/Plastics)">Recyclables (Paper/Plastics)</option>
                  <option value="General Residential">General Residential</option>
                  <option value="Hazardous / E-Waste">Hazardous / E-Waste</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Collection Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  required
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!zoneName || !collectionDate}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold hover:brightness-110"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
