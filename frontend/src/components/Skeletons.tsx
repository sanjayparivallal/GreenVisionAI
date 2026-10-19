import React from 'react';

export const StatsWidgetSkeleton: React.FC = () => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 w-28 bg-slate-700/70 rounded animate-pulse" />
      <div className="w-10 h-10 bg-slate-700/70 rounded-xl animate-pulse" />
    </div>
    <div className="h-8 w-20 bg-slate-700/80 rounded animate-pulse mb-2" />
    <div className="h-3 w-36 bg-slate-700/50 rounded animate-pulse" />
  </div>
);

export const ScheduleCardSkeleton: React.FC = () => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2">
        <div className="h-5 w-40 bg-slate-700/80 rounded animate-pulse" />
        <div className="h-4 w-28 bg-slate-700/60 rounded animate-pulse" />
      </div>
      <div className="h-6 w-20 bg-slate-700/70 rounded-full animate-pulse" />
    </div>
    <div className="flex items-center gap-3 pt-3 border-t border-slate-700/40">
      <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse" />
      <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse ml-auto" />
    </div>
  </div>
);

export const ReportCardSkeleton: React.FC = () => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg flex flex-col">
    <div className="w-full h-48 bg-slate-700/60 animate-pulse" />
    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-slate-700/80 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-slate-700/80 rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-slate-700/60 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-slate-700/50 rounded animate-pulse" />
      </div>
      <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="h-4 w-28 bg-slate-700/60 rounded animate-pulse" />
        <div className="h-8 w-24 bg-slate-700/80 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <tr className="border-b border-slate-800/60">
    <td className="p-4"><div className="h-4 w-12 bg-slate-700/70 rounded animate-pulse" /></td>
    <td className="p-4"><div className="h-4 w-28 bg-slate-700/70 rounded animate-pulse" /></td>
    <td className="p-4"><div className="h-4 w-20 bg-slate-700/60 rounded animate-pulse" /></td>
    <td className="p-4"><div className="h-4 w-16 bg-slate-700/60 rounded animate-pulse" /></td>
    <td className="p-4"><div className="h-6 w-24 bg-slate-700/80 rounded-full animate-pulse" /></td>
    <td className="p-4"><div className="h-8 w-20 bg-slate-700/80 rounded-lg animate-pulse" /></td>
  </tr>
);

export const ProfileCardSkeleton: React.FC = () => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 shadow-lg space-y-4">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-slate-700/80 rounded-2xl animate-pulse" />
      <div className="space-y-2 flex-1">
        <div className="h-5 w-36 bg-slate-700/80 rounded animate-pulse" />
        <div className="h-4 w-48 bg-slate-700/60 rounded animate-pulse" />
      </div>
    </div>
    <div className="h-10 w-full bg-slate-700/50 rounded-xl animate-pulse" />
  </div>
);
