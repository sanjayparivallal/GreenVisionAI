import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { RewardSummary, WasteReport } from '../types';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, MapPin, Camera, Save, Edit3, ShieldAlert,
  UserCheck, Award, FileText, Calendar, CheckCircle2, X, Leaf, Lock, Eye, EyeOff,
} from 'lucide-react';

const AVATAR_COLORS = [
  'from-emerald-500 to-teal-400',
  'from-cyan-500 to-blue-400',
  'from-violet-500 to-purple-400',
  'from-amber-500 to-orange-400',
];

export const ProfilePage: React.FC = () => {
  const { user, role, updateProfile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    profile_image: user?.profile_image || '',
  });

  // Sync form when user changes (e.g., after getMe)
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        profile_image: user.profile_image || '',
      });
    }
  }, [user]);

  // Stats queries
  const { data: rewardSummary } = useQuery<RewardSummary>({
    queryKey: ['reward-summary'],
    queryFn: async () => (await apiClient.get('/rewards/summary')).data,
    enabled: role === 'resident',
  });

  const { data: myReports = [] } = useQuery<WasteReport[]>({
    queryKey: ['my-reports'],
    queryFn: async () => (await apiClient.get('/reports')).data,
  });

  const approvedCount = myReports.filter((r) => r.status === 'approved').length;
  const pendingCount = myReports.filter((r) => r.status === 'pending').length;

  // Avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Avatar must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, profile_image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    setIsSaving(true);
    const ok = await updateProfile({
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      profile_image: form.profile_image,
    });
    setIsSaving(false);
    if (ok) setIsEditing(false);
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      profile_image: user?.profile_image || '',
    });
    setIsEditing(false);
  };

  const avatarGradient = AVATAR_COLORS[(user?.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

  // ── Password Change State ──────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [isSavingPw, setIsSavingPw] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setIsSavingPw(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: pwForm.current,
        new_password: pwForm.newPw,
      });
      toast.success('Password changed successfully. Please log in again.');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch {
      // Handled by interceptor
    } finally {
      setIsSavingPw(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl overflow-hidden`}
            >
              {form.profile_image ? (
                <img src={form.profile_image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {isEditing && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg hover:brightness-110 transition-all"
                title="Upload profile photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-heading font-extrabold text-white">{user?.name}</h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                  role === 'admin'
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {role === 'admin' ? (
                  <><ShieldAlert className="w-3 h-3" /> Municipal Admin</>
                ) : (
                  <><UserCheck className="w-3 h-3" /> Resident</>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Member since {memberSince}
            </p>
          </div>

          {/* Edit Toggle */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold hover:bg-slate-700 flex items-center gap-2 transition-colors shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCancel}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold hover:brightness-110 flex items-center gap-1.5 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center space-y-1">
          <div className="text-2xl font-black text-emerald-400">{myReports.length}</div>
          <p className="text-[11px] text-slate-400 font-semibold">Total Reports</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center space-y-1">
          <div className="text-2xl font-black text-cyan-300">{approvedCount}</div>
          <p className="text-[11px] text-slate-400 font-semibold">Approved</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center space-y-1">
          <div className="text-2xl font-black text-amber-400">{pendingCount}</div>
          <p className="text-[11px] text-slate-400 font-semibold">Pending</p>
        </div>
        {role === 'resident' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center space-y-1">
            <div className="text-2xl font-black text-emerald-400">{rewardSummary?.total_points || 0}</div>
            <p className="text-[11px] text-slate-400 font-semibold">Eco Points</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center space-y-1">
            <div className="text-2xl font-black text-teal-300">
              {myReports.filter((r) => r.status === 'collected').length}
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">Collected</p>
          </div>
        )}
      </div>

      {/* ── Profile Fields ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <h2 className="text-lg font-heading font-bold text-white border-b border-slate-800 pb-4">
          Personal Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                minLength={2}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            ) : (
              <p className="text-sm font-semibold text-slate-200 py-2.5 px-3 bg-slate-800/40 rounded-xl">
                {user?.name || '—'}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
              <span className="text-[10px] text-slate-500 font-normal">(cannot change)</span>
            </label>
            <p className="text-sm font-semibold text-slate-400 py-2.5 px-3 bg-slate-800/20 rounded-xl cursor-not-allowed">
              {user?.email}
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 019-2831"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            ) : (
              <p className="text-sm font-semibold text-slate-200 py-2.5 px-3 bg-slate-800/40 rounded-xl">
                {user?.phone || <span className="text-slate-500 italic">Not set</span>}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {role === 'admin' ? 'Department / Office' : 'Residential Address / Sector'}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder={role === 'admin' ? 'Municipal Green Ops Center, District 1' : '742 Evergreen Terrace, Sector 4'}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            ) : (
              <p className="text-sm font-semibold text-slate-200 py-2.5 px-3 bg-slate-800/40 rounded-xl">
                {user?.address || <span className="text-slate-500 italic">Not set</span>}
              </p>
            )}
          </div>
        </div>

        {/* Avatar preview in edit mode */}
        {isEditing && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-slate-950 font-black text-lg shadow-xl overflow-hidden cursor-pointer`}
                onClick={() => avatarInputRef.current?.click()}
              >
                {form.profile_image ? (
                  <img src={form.profile_image} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Upload Photo
                </button>
                {form.profile_image && (
                  <button
                    onClick={() => setForm((f) => ({ ...f, profile_image: '' }))}
                    className="ml-2 text-[11px] text-rose-400 hover:text-rose-300"
                  >
                    Remove
                  </button>
                )}
                <p className="text-[11px] text-slate-500">JPG, PNG, WebP — max 2MB</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Change Password ── */}
      <form
        onSubmit={handlePasswordChange}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <h2 className="text-lg font-heading font-bold text-white border-b border-slate-800 pb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-400" /> Change Password
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Current Password', key: 'current' as const },
            { label: 'New Password (min 6 chars)', key: 'newPw' as const },
            { label: 'Confirm New Password', key: 'confirm' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs font-bold text-slate-300">{label}</label>
              <div className="relative mt-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={pwForm[key]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  className="w-full p-3 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  placeholder="••••••••"
                />
                {key === 'current' && (
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={isSavingPw || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-xs shadow-md hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
        >
          <Lock className="w-3.5 h-3.5" />
          {isSavingPw ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {/* ── Account Information ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h2 className="text-lg font-heading font-bold text-white border-b border-slate-800 pb-4">
          Account Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1">
            <p className="text-slate-400 font-semibold">Account ID</p>
            <code className="text-slate-300 text-[11px] bg-slate-800/60 px-2 py-1 rounded-lg block">{user?.id}</code>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-semibold">Role</p>
            <p className="text-slate-200 font-bold capitalize">{role === 'admin' ? 'Municipal Admin' : 'Resident'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-semibold">Member Since</p>
            <p className="text-slate-200 font-bold">{memberSince}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-semibold">Account Status</p>
            <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
