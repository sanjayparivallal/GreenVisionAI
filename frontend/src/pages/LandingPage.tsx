import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  ShieldCheck,
  Award,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
  Sprout,
  Leaf,
  Zap,
} from 'lucide-react';
import { statsApi, PlatformTotals } from '../api/stats';

// ---------------------------------------------------------------------------
// Animated count-up hook
// ---------------------------------------------------------------------------
function useCountUp(target: number | undefined, duration = 1400) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (target === undefined || started.current) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

// ---------------------------------------------------------------------------
// KPI card with animated counter
// ---------------------------------------------------------------------------
const KpiCard: React.FC<{
  icon: React.ReactNode;
  rawValue: number | undefined;
  label: string;
  color: string;
  suffix?: string;
  prefix?: string;
}> = ({ icon, rawValue, label, color, suffix = '', prefix = '' }) => {
  const animated = useCountUp(rawValue);

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center space-y-1 hover:border-emerald-500/30 transition-colors group">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      {rawValue === undefined ? (
        <div className="h-8 bg-slate-700/60 rounded-xl animate-pulse mx-auto w-24" />
      ) : (
        <div className="text-3xl font-heading font-black text-white animate-count-up">
          {prefix}{animated.toLocaleString()}{suffix}
        </div>
      )}
      <div className="text-xs font-semibold text-slate-400">{label}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------
export const LandingPage: React.FC = () => {
  const { data: totals } = useQuery<PlatformTotals>({
    queryKey: ['platform-totals'],
    queryFn: statsApi.getPlatformTotals,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Convert kg to tons if >= 1000
  const kgToDisplay = (kg: number | undefined): { value: number | undefined; suffix: string } => {
    if (kg === undefined) return { value: undefined, suffix: '' };
    if (kg >= 1000) return { value: parseFloat((kg / 1000).toFixed(1)), suffix: ' Tons' };
    return { value: Math.round(kg), suffix: ' kg' };
  };

  const organicDisplay = kgToDisplay(totals?.organic_kg_total);

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/60 border border-emerald-500/30 p-8 md:p-16 shadow-2xl">
        {/* Ambient glow blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Smart Eco-Tech Municipal AI Platform
          </div>

          {/* Main headline */}
          <h1 className="text-3xl md:text-5xl font-heading font-extrabold text-white tracking-tight leading-tight">
            AI-Powered Residential Waste Monitoring &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Smart Municipal Dispatch
            </span>
          </h1>

          {/* Slogan 1 */}
          <p className="text-lg md:text-xl font-heading font-semibold text-emerald-300">
            Empowering Communities to Fight Waste.
          </p>

          {/* Slogan 2 */}
          <p className="text-sm md:text-base text-slate-400 font-medium italic">
            Where Civic Duty Meets Smart Technology.
          </p>

          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
            GreenVision AI turns residential waste cameras into real-time municipal intelligence.
            Capture overflowing bins, diagnose severity with GreenVision AI, route trucks dynamically,
            and earn approval-gated eco-rewards.
          </p>

          {/* CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup/resident"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-900/40 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Report as Resident</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 text-cyan-300 border border-cyan-500/40 font-extrabold text-sm hover:bg-slate-700/80 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>Municipal Login</span>
            </Link>
          </div>

          <p className="text-xs text-slate-400 font-medium pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 font-bold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* Real-time KPI Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          rawValue={totals?.overflows_addressed}
          label="Overflows Addressed"
          color="bg-emerald-500/20 text-emerald-400"
        />
        <KpiCard
          icon={<Sprout className="w-6 h-6" />}
          rawValue={organicDisplay.value}
          label="Organic Compost Diverted"
          color="bg-teal-500/20 text-teal-400"
          suffix={organicDisplay.suffix}
        />
        <KpiCard
          icon={<Award className="w-6 h-6" />}
          rawValue={totals?.total_points_issued}
          label="Eco-Reward Points Issued"
          color="bg-amber-500/20 text-amber-400"
        />
        <KpiCard
          icon={<Users className="w-6 h-6" />}
          rawValue={totals?.sla_compliance_pct !== null && totals?.sla_compliance_pct !== undefined ? totals.sla_compliance_pct : undefined}
          label="Municipal SLA Compliance"
          color="bg-cyan-500/20 text-cyan-400"
          suffix="%"
        />
      </section>

      {/* How it works */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-heading font-extrabold text-white">How GreenVision AI Operates</h2>
          <p className="text-xs text-slate-400">End-to-end intelligence connecting residential cameras to municipal dispatch</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-3 group hover:border-emerald-500/40 transition-all hover:bg-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">01</div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" /> Capture &amp; AI Diagnosis
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Residents snap photos of overflowing bins via live camera. GreenVision AI classifies waste type, fill level, severity, and environmental impact score instantly.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-3 group hover:border-cyan-500/40 transition-all hover:bg-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-sm">02</div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> Priority Dispatch &amp; Review
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Municipal operators receive reports pre-sorted by priority level (Critical → Low). Vehicles dispatch dynamically based on AI recommendations.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-3 group hover:border-amber-500/40 transition-all hover:bg-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm">03</div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Approval-Gated Rewards
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Reward points are credited ONLY when a municipal admin verifies and approves the report. Redeemable for bus passes, grocery vouchers, and tree planting certificates!
            </p>
          </div>
        </div>
      </section>

      {/* Why GreenVision */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border border-emerald-500/20 rounded-3xl p-8 space-y-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-xl font-heading font-bold text-white">For Residents</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Report waste in 60 seconds with live camera</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Earn eco-reward points redeemable for real benefits</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Track your environmental impact in real-time</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Access organic compost marketplace listings</li>
          </ul>
          <Link
            to="/signup/resident"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all"
          >
            Join as Resident <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/30 to-slate-900/20 border border-cyan-500/20 rounded-3xl p-8 space-y-4">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-heading font-bold text-white">For Municipal Operators</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />Priority-sorted dispatch feed with AI severity scores</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />Manage collection schedules across all zones</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />Approve reports to auto-distribute eco-rewards</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />Organic compost marketplace management</li>
          </ul>
          <Link
            to="/signup/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all"
          >
            Register as Admin <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
