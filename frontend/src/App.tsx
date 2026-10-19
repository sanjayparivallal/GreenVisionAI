import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ResidentSignupPage } from './pages/ResidentSignupPage';
import { AdminSignupPage } from './pages/AdminSignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportFlowPage } from './pages/ReportFlowPage';
import { SchedulePage } from './pages/SchedulePage';
import { RewardsPage } from './pages/RewardsPage';
import { OrganicWastePage } from './pages/OrganicWastePage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30s cache
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-950">
            {/* Global Toaster with eco-tech styling */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0F172A',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#0F172A',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#F43F5E',
                    secondary: '#0F172A',
                  },
                },
              }}
            />

            {/* Navbar */}
            <Navbar />

            {/* Main Application Container */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup/resident" element={<ResidentSignupPage />} />
                <Route path="/signup/admin" element={<AdminSignupPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/reports/new" element={<ReportFlowPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/organic" element={<OrganicWastePage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-300">GreenVision AI</span>
                  <span>&bull; Residential Waste Intelligence System</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Powered by GreenVision AI &amp; FastAPI Backend Inference
                </p>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
