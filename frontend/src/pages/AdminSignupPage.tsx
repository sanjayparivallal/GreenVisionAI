import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, Mail, Lock, User, ArrowRight, Info } from 'lucide-react';

export const AdminSignupPage: React.FC = () => {
  const { signupAdmin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', adminCode: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await signupAdmin({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      admin_code: formData.adminCode,
    });
    setIsSubmitting(false);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center mx-auto border border-cyan-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-white">Municipal Admin Registration</h1>
          <p className="text-xs text-slate-400">Clearance for municipal dispatch operators &amp; eco inspectors</p>
        </div>

        {/* Quick signup notice */}
        <div className="flex items-start gap-2 p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-cyan-300">
            Quick registration — add your department, phone, and profile photo later in your{' '}
            <Link to="/profile" className="font-bold underline">Profile</Link>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Operator Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Director Sarah Chen"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Official Municipal Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@greenvision.gov"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-900/40 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Registering Admin...' : 'Create Municipal Admin Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Already registered?{' '}
          <Link to="/login" className="text-cyan-400 font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
