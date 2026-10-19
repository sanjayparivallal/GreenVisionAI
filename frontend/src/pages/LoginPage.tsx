import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Camera, Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const userRole = await login(email, password);
    setIsSubmitting(false);

    if (userRole) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-bold flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40">
            <Camera className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-white">GreenVision AI Sign In</h1>
          <p className="text-xs text-slate-400">Enter credentials to access residential or municipal dashboard</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-900/40 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Verifying Account...' : 'Sign In to GreenVision AI'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Registration Redirection Links */}
        <div className="pt-4 border-t border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-400">Don't have an account?</p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link to="/signup/resident" className="text-emerald-400 font-bold hover:underline">
              Resident Registration
            </Link>
            <span className="text-slate-600">&bull;</span>
            <Link to="/signup/admin" className="text-cyan-400 font-bold hover:underline">
              Municipal Admin Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
