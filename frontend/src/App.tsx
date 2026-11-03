import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';

// ── Eagerly loaded (above-the-fold, always needed) ────────────────────────
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';

// ── Lazy-loaded routes (code-split per route) ─────────────────────────────
const ResidentSignupPage = lazy(() => import('./pages/ResidentSignupPage').then(m => ({ default: m.ResidentSignupPage })));
const AdminSignupPage    = lazy(() => import('./pages/AdminSignupPage').then(m => ({ default: m.AdminSignupPage })));
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ReportFlowPage     = lazy(() => import('./pages/ReportFlowPage').then(m => ({ default: m.ReportFlowPage })));
const SchedulePage       = lazy(() => import('./pages/SchedulePage').then(m => ({ default: m.SchedulePage })));
const RewardsPage        = lazy(() => import('./pages/RewardsPage').then(m => ({ default: m.RewardsPage })));
const OrganicWastePage   = lazy(() => import('./pages/OrganicWastePage').then(m => ({ default: m.OrganicWastePage })));
const FeedbackPage       = lazy(() => import('./pages/FeedbackPage').then(m => ({ default: m.FeedbackPage })));
const ProfilePage        = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));

// ── Route-level loading fallback ──────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  </div>
);

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
          <ErrorBoundary>
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
                <Suspense fallback={<PageLoader />}>
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
                    <Route path="/404" element={<NotFoundPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
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
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
