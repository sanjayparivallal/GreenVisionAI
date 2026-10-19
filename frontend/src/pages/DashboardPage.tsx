import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ResidentDashboard } from '../components/ResidentDashboard';
import { AdminDashboard } from '../components/AdminDashboard';
import { Navigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading GreenVision AI portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return role === 'admin' ? <AdminDashboard /> : <ResidentDashboard />;
};
