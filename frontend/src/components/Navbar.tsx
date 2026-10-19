import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  Camera,
  LayoutDashboard,
  Calendar,
  Award,
  Sprout,
  MessageSquare,
  LogOut,
  ShieldAlert,
  UserCheck,
  Menu,
  X,
  Sparkles,
  UserCircle,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Notification badge: pending reports count for admin
  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ['nav-pending-count'],
    queryFn: async () => {
      const res = await apiClient.get('/reports?status=pending&limit=1');
      return Array.isArray(res.data) ? res.data.length : 0;
    },
    enabled: isAuthenticated && role === 'admin',
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  // Notification badge: earned points for resident
  const { data: rewardPoints = 0 } = useQuery<number>({
    queryKey: ['nav-reward-points'],
    queryFn: async () => {
      const res = await apiClient.get('/rewards/summary');
      return res.data?.total_points || 0;
    },
    enabled: isAuthenticated && role === 'resident',
    staleTime: 60 * 1000,
  });

  interface NavItem {
    label: string;
    path: string;
    icon: any;
    highlight?: boolean;
    badge?: number | boolean;
  }

  const residentNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Report Waste', path: '/reports/new', icon: Camera, highlight: true },
    { label: 'Organic Compost', path: '/organic', icon: Sprout },
    { label: 'Schedule', path: '/schedule', icon: Calendar },
    { label: 'Rewards', path: '/rewards', icon: Award, badge: rewardPoints > 0 },
    { label: 'Support & Feedback', path: '/feedback', icon: MessageSquare },
  ];

  const adminNav: NavItem[] = [
    { label: 'Municipal Control', path: '/dashboard', icon: LayoutDashboard, badge: pendingCount },
    { label: 'Collection Schedule', path: '/schedule', icon: Calendar },
    { label: 'Organic Distribution', path: '/organic', icon: Sprout },
    { label: 'Feedback Resolution', path: '/feedback', icon: MessageSquare },
  ];

  const navItems = role === 'admin' ? adminNav : residentNav;

  // Avatar initials from user name
  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-lg text-slate-100 tracking-tight">
                  GreenVision
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none">
                {role === 'admin' ? 'Municipal Operations' : 'Residential Waste Monitor'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const hasBadge = item.badge === true || (typeof item.badge === 'number' && item.badge > 0);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      item.highlight
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-900/20 hover:brightness-110'
                        : active
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {hasBadge && (
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                        role === 'admin' ? 'bg-rose-500' : 'bg-emerald-400'
                      }`} />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action / Auth Profile */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                {/* Role badge */}
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    role === 'admin'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {role === 'admin' ? (
                    <><ShieldAlert className="w-3 h-3 text-cyan-400" /> Municipal Admin</>
                  ) : (
                    <><UserCheck className="w-3 h-3 text-emerald-400" /> Resident</>
                  )}
                </span>

                {/* Avatar / Profile Link */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 group"
                  title="My Profile"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.email}</p>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup/resident"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 transition-all shadow-md shadow-emerald-900/30"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/80"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900/95 px-4 pt-2 pb-4 space-y-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-slate-800/80 rounded-xl mb-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm overflow-hidden">
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-100">{user?.name}</p>
                    <p className="text-[10px] text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      role === 'admin' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {role?.toUpperCase()}
                  </span>
                  <UserCircle className="w-4 h-4 text-slate-400" />
                </div>
              </Link>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive(item.path)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-400" />
                    {item.label}
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-slate-800 mt-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/signup/resident"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950"
              >
                Resident Registration
              </Link>
              <Link
                to="/signup/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 text-xs font-bold rounded-xl bg-cyan-500 text-slate-950"
              >
                Municipal Admin Registration
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl"
              >
                Log In
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
